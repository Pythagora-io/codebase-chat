const Repository = require('./repository');
const { cloneAndProcessRepo } = require('./gitHandler');
const { generateSummary } = require('./openaiService');
const { sendEmailNotification } = require('./emailService');
const fs = require('fs-extra');
const OpenAI = require('openai');
const path = require('path');
require('dotenv').config();

const openai = new OpenAI(process.env.OPENAI_API_KEY);

async function processRepository(githubUrl, email) {
  // Start processing asynchronously
  processRepoInBackground(githubUrl, email).catch(error => {
    console.error('Asynchronous processing error:', error.message, error.stack);
    // Save the error state to the database
    Repository.findOneAndUpdate({ githubUrl, email }, { isProcessed: true, processingError: error.message }, { new: true }).catch(err => {
      console.error('Failed to update repository with error state:', err.message, err.stack);
    });
  });

  // Return immediately for the server to send the response
  console.log(`Processing started for repository: ${githubUrl}`);
}

async function processRepoInBackground(githubUrl, email) {
  let tempDirPath;
  try {
    const { processedFiles, allFiles, tempDirPath: dirPath } = await cloneAndProcessRepo(githubUrl);
    tempDirPath = dirPath;

    // Exclude files within ".git" directory and check if there are 0 text files
    let relevantFiles;
    try {
      const gitDirPath = dirPath + path.sep + '.git';
      console.log(`Checking for git directory using path: ${gitDirPath}`); // gpt_pilot_debugging_log
      relevantFiles = processedFiles.filter(file => !file.includes(gitDirPath));
      console.log('Filtered relevantFiles:', relevantFiles); // gpt_pilot_debugging_log
    } catch (error) {
      console.error('Error filtering relevant files:', error.message, error.stack); // gpt_pilot_error_log
      throw error;
    }

    if (relevantFiles.length === 0) {
      console.log('No text files found in the repository, excluding the .git directory.'); // gpt_pilot_debugging_log
      await fs.remove(tempDirPath).catch(fsRemoveError => {
        console.error('Error removing temporary directory:', fsRemoveError.message, fsRemoveError.stack); // gpt_pilot_debugging_log
      });
      await Repository.deleteOne({ githubUrl, email }).catch(deleteError => {
        console.error('Error deleting repository entry from database:', deleteError.message, deleteError.stack); // gpt_pilot_debugging_log
      });
      await sendEmailNotification(email, 'no-text-files', githubUrl, null);
      console.log(`No text files found notification sent to: ${email}`); // gpt_pilot_debugging_log
      return;
    }

    let fileSummariesObject = {};

    for (const file of processedFiles) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const summary = await generateSummary(content);
        fileSummariesObject[file] = summary; // Store summary associated with file name
      } catch (fileReadError) {
        console.error('Error reading or summarizing file:', file, fileReadError.message, fileReadError.stack);
      }
    }

    const fileSummariesArray = Object.values(fileSummariesObject); // Convert summaries object to array
    console.log('File summaries:', fileSummariesArray);

    const combinedSummaries = fileSummariesArray.join(' ');

    // Convert allFiles array to string, where each file path is separated by a new line
    const allFilesString = allFiles.join('\n');
    console.log(`All files as string: ${allFilesString}`); // gpt_pilot_debugging_log
    
    // Now, combine the individual file summaries and the allFilesString
    const combinedSummariesWithPaths = `${combinedSummaries}\n\n${allFilesString}`;

    // Update the projectSummaryResponse OpenAI call:
    const projectSummaryResponse = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: "system", content: "Summarize this project based on the individual file summaries and the list of all file paths." }, { role: "user", content: combinedSummariesWithPaths }],
      max_tokens: 2048,
      temperature: 0.5
    }).catch(error => {
      console.error('Error during OpenAI project summary call with all file paths:', error.message, error.stack); // gpt_pilot_debugging_log
      throw error;
    });
    console.log(`Project summary with all file paths has been generated.`); // gpt_pilot_debugging_log
    
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