const express = require('express');
const router = express.Router();
const axios = require('axios');
const Repository = require('./repository');
const User = require('./models/user');
const { processRepository } = require('./processRepository');
const { interactWithRepository } = require('./chatService');
const { isAuthenticated } = require('./middleware/auth');
const OpenAI = require("openai");

console.log('Router middleware is set up.');

// Protect routes that require authentication
router.get('/', isAuthenticated, async (req, res) => {
  const user = await User.findById(req.session.userId);
  console.log('User data fetched:', { userId: user._id, hasApiKey: !!user.openaiApiKey });
  res.render('index', {
    userId: req.session.userId,
    userApiKey: user.openaiApiKey ? '**********' : null,
    apiKeyMessage: user.openaiApiKey ? 'Your API key is already set. Enter a new key to update.' : null
  });
});

// Registration route
router.get('/register', (req, res) => {
  res.render('register', { userId: req.session ? req.session.userId : null });
});

router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = new User({ email, password });
    await user.save();
    req.session.userId = user._id;
    res.redirect('/');
  } catch (error) {
    console.error('Error handling POST /register:', error.message, error.stack);
    res.render('register', { error: 'Registration failed. Please try again.', userId: req.session ? req.session.userId : null });
  }
});

// Login route
router.get('/login', (req, res) => {
  res.render('login', { userId: req.session ? req.session.userId : null });
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user && await user.comparePassword(password)) {
      req.session.userId = user._id;
      res.redirect('/');
    } else {
      res.render('login', { error: 'Invalid email or password', userId: req.session ? req.session.userId : null });
    }
  } catch (error) {
    console.error('Error handling POST /login:', error.message, error.stack);
    res.render('login', { error: 'Login failed. Please try again.', userId: req.session ? req.session.userId : null });
  }
});

// Logout route
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/login');
  });
});

router.post('/submit', isAuthenticated, async (req, res) => {
  console.log('POST request made to /submit');
  const { githubUrl } = req.body;
  if (!githubUrl) {
    return res.status(400).render('submit', { message: 'Repository URL is required.', userId: req.session.userId });
  }
  try {
    const user = await User.findById(req.session.userId);
    if (!user.openaiApiKey) {
      return res.status(400).render('submit', { message: 'Please set your OpenAI API key before submitting a repository.', userId: req.session.userId });
    }

    const repoResponse = await axios.get(githubUrl.replace('https://github.com', 'https://api.github.com/repos'));
    if (repoResponse.data.private) {
      console.error('Repository is private:', githubUrl);
      return res.status(400).render('submit', { message: 'Repository is private or does not exist.', userId: req.session.userId });
    } else if (repoResponse.data.size === 0) {
      console.log(`Repository ${githubUrl} is empty and cannot be processed.`);
      return res.status(400).render('submit', { message: 'The repository is empty and cannot be processed.', userId: req.session.userId });
    } else if (repoResponse.data.size > 500) {
      console.error('Repository has more than 500 files:', githubUrl);
      return res.status(400).render('submit', { message: 'Repository has more than 500 files and cannot be processed.', userId: req.session.userId });
    }
    const existingRepo = await Repository.findOne({ githubUrl });
    if (existingRepo) {
      if (existingRepo.isProcessed) {
        console.log(`Redirecting to existing processed repository: ${existingRepo.uuid}`);
        return res.redirect(`/explain/${existingRepo.uuid}`);
      } else {
        console.log(`Repository is currently being processed: ${githubUrl}`);
        return res.status(200).render('submit', { message: 'Repository is currently being processed.', userId: req.session.userId });
      }
    }
    const newRepo = new Repository({ githubUrl, email: user.email });
    await newRepo.save();
    console.log(`New repository saved with URL: ${githubUrl}`);
    await processRepository(newRepo.githubUrl, user.email, user.openaiApiKey);
    console.log(`Processing started for repository: ${newRepo.githubUrl}`);
    res.status(201).render('submit', { message: 'Repository processing started. You will receive an email when it is complete.', userId: req.session.userId });
  } catch (error) {
    console.error('Error handling POST /submit:', error.message, error.stack);
    res.status(400).render('submit', { message: 'Error checking repository. Make sure the URL is correct and the repository is public.', userId: req.session.userId });
  }
});

router.get('/explain/:uuid', async (req, res) => {
  const uuid = req.params.uuid;
  console.log(`GET request made to /explain/${uuid}`);
  try {
    const repository = await Repository.findOne({ uuid: uuid });
    console.log(`Repository search result for UUID: ${uuid}:`, repository);

    if (!repository) {
      console.error(`No repository found with UUID: ${uuid}`);
      return res.status(404).send('Repository not found');
    }

    if (repository.isProcessed) {
      console.log(`Found and serving processed repository with UUID: ${uuid}`);
      res.render('explain', { summary: repository.summary, uuid: uuid, githubUrl: repository.githubUrl, userId: req.session ? req.session.userId : null });
    } else {
      console.log(`Repository with UUID: ${uuid} is not processed yet`);
      res.status(200).send('Processing is not yet complete. Please wait for an email notification.');
    }
  } catch (error) {
    console.error(`Error retrieving repository with UUID: ${uuid}: ${error.message}`, error.stack);
    res.status(500).send('Error fetching repository');
  }
});

router.post('/interact/:uuid', async (req, res) => {
  const uuid = req.params.uuid;
  const userMessage = req.body.question;
  console.log(`POST request made to /interact/${uuid} with question: ${userMessage}`);

  try {
    // Fetch the user from the database
    const user = await User.findById(req.session.userId);
    if (!user || !user.openaiApiKey) {
      throw new Error('User not found or API key not set');
    }

    // Pass the API key to interactWithRepository
    const answer = await interactWithRepository(uuid, userMessage, user.openaiApiKey);
    console.log(`Answer retrieved from interactWithRepository for UUID: ${uuid}`);
    res.json({ answer });
  } catch (error) {
    console.error('Error in POST /interact/:uuid:', error.message, error.stack);
    res.status(500).json({ error: 'Error processing your question.' });
  }
});

router.post('/set-api-key', isAuthenticated, async (req, res) => {
  const { openaiApiKey } = req.body;
  const userId = req.session.userId;
  console.log('Received API key update request:', { userId, keyLength: openaiApiKey ? openaiApiKey.length : 0 });

  try {
    const user = await User.findById(userId);

    if (openaiApiKey === '**********') {
      // API key unchanged
      return res.render('index', {
        apiKeyMessage: 'API key unchanged.',
        userApiKey: '**********',
        userId: req.session.userId
      });
    }

    // Verify the API key
    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    await openai.models.list();

    // If verification succeeds, update the user's API key
    user.openaiApiKey = openaiApiKey;
    await user.save();

    res.render('index', {
      apiKeyMessage: 'API key verified and saved successfully.',
      apiKeySuccess: true,
      userApiKey: '**********',
      userId: req.session.userId
    });
  } catch (error) {
    console.error('Error verifying OpenAI API key:', error.message, error.stack);
    res.render('index', {
      apiKeyMessage: 'Failed to verify API key. Please check and try again.',
      apiKeySuccess: false,
      userApiKey: null,
      userId: req.session.userId
    });
  }
});

module.exports = router;