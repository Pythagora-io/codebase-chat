const Repository = require('./repository');
const { cloneAndProcessRepo } = require('./gitHandler');
const { generateSummary } = require('./openaiService');
const { sendEmailNotification } = require('./emailService');
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
    let fileSummariesObject = {};

    for (const file of processedFiles) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const summary = await generateSummary(content);
        fileSummariesObject[file] = summary; // Store summary associated with file name
      } catch (fileReadError) {
        console.error('Error reading file:', fileReadError.message, fileReadError.stack); // gpt_pilot_debugging_log
      }
    }

    const fileSummariesArray = Object.values(fileSummariesObject); // Convert summaries object to array
    console.log('File summaries:', fileSummariesArray); // gpt_pilot_debugging_log
    
    const combinedSummaries = fileSummariesArray.join(' ');
    const projectSummaryResponse = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: "system", content: "Summarize this project based on the individual file summaries." }, { role: "user", content: combinedSummaries }],
      max_tokens: 1024,
      temperature: 0.5
    });

    const projectSummary = projectSummaryResponse.choices[0].message.content.trim();
    const updatedRepository = await Repository.findOneAndUpdate(
      { githubUrl, email }, 
      { 
        summary: projectSummary, 
        isProcessed: true, 
        fileSummaries: fileSummariesArray // Save the summaries array to the database 
      }, 
      { new: true }
    );
    console.log(`Repository has been processed and file summaries stored: ${githubUrl}`, fileSummariesArray); // gpt_pilot_debugging_log
    console.log(`Ready to send email notification to: ${email} for repository: ${githubUrl}`); // gpt_pilot_debugging_log

    try {
      await sendEmailNotification(email, updatedRepository.uuid, githubUrl);
      console.log(`Email notification sent to: ${email} for repository: ${githubUrl}`); // gpt_pilot_debugging_log
    } catch (notificationError) {
      console.error(`Error sending email notification to ${email}:`, notificationError.message, notificationError.stack); // gpt_pilot_debugging_log
    }

  } catch (error) {
    console.error('Error during repository background processing:', error.message, error.stack); // gpt_pilot_debugging_log
    throw error;
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