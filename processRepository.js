const Repository = require('./repository');
const { cloneAndProcessRepo } = require('./gitHandler');
const { generateSummary } = require('./openaiService');
const fs = require('fs-extra');
const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI(process.env.OPENAI_API_KEY);

async function processRepository(githubUrl, email) {
  // Start processing asynchronously
  processRepoInBackground(githubUrl, email).catch(error => {
    console.error('Asynchronous processing error:', error.message, error.stack); // gpt_pilot_debugging_log
    // Save the error state to the database
    Repository.findOneAndUpdate({ githubUrl, email }, { isProcessed: true, processingError: error.message }, { new: true }).catch(err => {
      console.error('Failed to update repository with error state:', err.message, err.stack); // gpt_pilot_debugging_log
    });
  });

  // Return immediately for the server to send the response
  console.log(`Processing started for repository: ${githubUrl}`); // This log confirms the asynchronous start
}

async function processRepoInBackground(githubUrl, email) {
  let tempDirPath;
  try {
    const { processedFiles, tempDirPath: dirPath } = await cloneAndProcessRepo(githubUrl);
    tempDirPath = dirPath;
    let allSummaries = [];

    for (const file of processedFiles) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const summary = await generateSummary(content);
        allSummaries.push(summary);
      } catch (fileReadError) {
        console.error('Error reading file:', fileReadError.message, fileReadError.stack); // gpt_pilot_debugging_log
      }
    }

    const combinedSummaries = allSummaries.join(' ');
    const projectSummaryResponse = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: "system", content: "Summarize this project based on the individual file summaries." }, { role: "user", content: combinedSummaries }],
      max_tokens: 1024,
      temperature: 0.5
    });

    const projectSummary = projectSummaryResponse.choices[0].message.content.trim();
    await Repository.findOneAndUpdate({ githubUrl, email }, { summary: projectSummary, isProcessed: true }, { new: true });

    console.log(`Repository has been processed: ${githubUrl}`); // gpt_pilot_debugging_log
  } catch (error) {
    console.error('Error during repository background processing:', error.message, error.stack); // gpt_pilot_debugging_log
    throw error; // This preserves the original behavior of rethrowing the error after logging.
  } finally {
    if (tempDirPath) {
      try {
        await fs.remove(tempDirPath);
        console.log('Temporary directory has been removed.'); // gpt_pilot_debugging_log
      } catch (tempDirError) {
        console.error('Error removing temporary directory:', tempDirError.message, tempDirError.stack); // gpt_pilot_debugging_log
      }
    } else {
      console.log('Temporary directory path is undefined, so skipping removal.'); // gpt_pilot_debugging_log
    }
  }
}

module.exports = {
  processRepository
};