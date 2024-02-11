const express = require('express');
const router = express.Router();
const path = require('path'); // Necessary to resolve the directory path
const axios = require('axios');
const Repository = require('./repository');
const { processRepository } = require('./processRepository');
const { interactWithRepository } = require('./chatService');

console.log('Router middleware is set up.');

router.get('/submit', (req, res) => {
  console.log('GET request made to /submit');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

router.post('/submit', async (req, res) => {
  console.log('POST request made to /submit');
  const { githubUrl, email } = req.body;
  if (!githubUrl || !email) {
    return res.status(400).send('Repository URL and email are both required.');
  }
  try {
    const repoResponse = await axios.get(githubUrl.replace('https://github.com', 'https://api.github.com/repos'));
    if (repoResponse.data.private) {
      console.error('Repository is private:', githubUrl);
      return res.status(400).send('Repository is private or does not exist.');
    } else if (repoResponse.data.size === 0) {
      console.log(`Repository ${githubUrl} is empty and cannot be processed.`);
      return res.status(400).send('The repository is empty and cannot be processed.');
    } else if (repoResponse.data.size > 500) {
      console.error('Repository has more than 500 files:', githubUrl);
      return res.status(400).send('Repository has more than 500 files and cannot be processed.');
    }
    const existingRepo = await Repository.findOne({ githubUrl });
    if (existingRepo) {
      if (existingRepo.isProcessed) {
        console.log(`Redirecting to existing processed repository: ${existingRepo.uuid}`);
        return res.redirect(`/explain/${existingRepo.uuid}`);
      } else {
        console.log(`Repository is currently being processed: ${githubUrl}`);
        return res.status(200).send('Repository is currently being processed.');
      }
    }
    const newRepo = new Repository({ githubUrl, email });
    await newRepo.save();
    console.log(`New repository saved with URL: ${githubUrl}`);
    await processRepository(newRepo.githubUrl, newRepo.email);
    console.log(`Processing started for repository: ${newRepo.githubUrl}`);
    res.status(201).send('Repository processing started. You will receive an email when it is complete.');
  } catch (error) {
    console.error('Error handling POST /submit:', error.message, error.stack);
    res.status(400).send('Error checking repository. Make sure the URL is correct and the repository is public.');
  }
});

router.get('/explain/:uuid', async (req, res) => {
  const uuid = req.params.uuid;
  try {
    const repository = await Repository.findOne({ uuid: uuid });
    console.log(`Repository search result for UUID: ${uuid}:`, repository);

    if (!repository) {
      console.error(`No repository found with UUID: ${uuid}`);
      return res.status(404).send('Repository not found');
    }

    if (repository.isProcessed) {
      console.log(`Found and serving processed repository with UUID: ${uuid}`);
      res.render('explain', { summary: repository.summary, uuid: uuid, githubUrl: repository.githubUrl });
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
    const answer = await interactWithRepository(uuid, userMessage);
    console.log(`Answer retrieved from interactWithRepository for UUID: ${uuid}`);
    res.json({ answer });
  } catch (error) {
    console.error('Error in POST /interact/:uuid:', error.message, error.stack);
    res.status(500).json({ error: 'Error processing your question.' });
  }
});

module.exports = router;