const express = require('express');
const router = express.Router();
const path = require('path'); // Necessary to resolve the directory path
const axios = require('axios');
const Repository = require('./repository');
const { processRepository } = require('./processRepository');
const { cloneAndProcessRepo } = require('./gitHandler'); // Added to access the function that retrieves temp directory

console.log('Router middleware is set up.'); // gpt_pilot_debugging_log

router.get('/submit', (req, res) => {
  console.log('GET request made to /submit'); // gpt_pilot_debugging_log
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

router.post('/submit', async (req, res) => {
  console.log('POST request made to /submit'); // gpt_pilot_debugging_log
  const { githubUrl, email } = req.body;
  if (!githubUrl || !email) {
    return res.status(400).send('Repository URL and email are both required.');
  }
  try {
    const repoResponse = await axios.get(githubUrl.replace('https://github.com', 'https://api.github.com/repos'));
    if (!repoResponse.data.private && repoResponse.data.size <= 500) {
      const existingRepo = await Repository.findOne({ githubUrl });
      if (existingRepo) {
        if (existingRepo.isProcessed) {
          return res.redirect(`/explain/${existingRepo.uuid}`);
        } else {
          return res.status(200).send('Repository is currently being processed.');
        }
      }
      const newRepo = new Repository({ githubUrl, email });
      await newRepo.save();
      console.log(`New repository saved with URL: ${githubUrl}`);
      
      // Start processing the repository after saving
      try {
        await processRepository(newRepo.githubUrl, newRepo.email);
        console.log(`Processing started for repository: ${newRepo.githubUrl}`);
      } catch (error) {
        console.error(`Error during the processing of the repository: ${error.message}`, error.stack);
        return res.status(500).send(`Error during the processing of the repository: ${error.message}`);
      }

      res.status(201).send('Repository processing started. You will receive an email when it is complete.');
    } else if (repoResponse.data.size > 500) {
      res.status(400).send('Repository has more than 500 files and cannot be processed.');
    } else {
      res.status(400).send('Repository is private or does not exist.');
    }
  } catch (error) {
    console.error('Error handling POST /submit:', error.message, error.stack); // gpt_pilot_debugging_log
    res.status(400).send('Error checking repository. Make sure the URL is correct and the repository is public.');
  }
});

module.exports = router;