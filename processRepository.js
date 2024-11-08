const Repository = require('./repository');
const { cloneAndProcessRepo } = require('./gitHandler');
const { generateSummary } = require('./openaiService');
const { sendEmailNotification } = require('./emailService');
const fs = require('fs-extra');
const path = require('path');

async function processRepository(githubUrl, email, openaiApiKey) {
  // Start processing asynchronously
  processRepoInBackground(githubUrl, email, openaiApiKey).catch(error => {
    console.error('Asynchronous processing error:', error.message, error.stack);
    // Save the error state to the database
    Repository.findOneAndUpdate({ githubUrl, email }, { isProcessed: true, processingError: error.message }, { new: true }).catch(err => {
      console.error('Failed to update repository with error state:', err.message, err.stack);
    });
  });

  // Return immediately for the server to send the response
  console.log(`Processing started for repository: ${githubUrl}`);
}

async function processRepoInBackground(githubUrl, email, openaiApiKey) {
  let tempDirPath;
  try {
    const { processedFiles, allFiles, tempDirPath: dirPath } = await cloneAndProcessRepo(githubUrl);
    tempDirPath = dirPath;

    // Exclude files within ".git" directory and check if there are 0 text files
    let relevantFiles;
    try {
      const gitDirPath = dirPath + path.sep + '.git';
      console.log(`Checking for git directory using path: ${gitDirPath}`);
      relevantFiles = processedFiles.filter(file => !file.includes(gitDirPath));
      console.log('Filtered relevantFiles:', relevantFiles);
    } catch (error) {
      console.error('Error filtering relevant files:', error.message, error.stack);
      throw error;
    }

    if (relevantFiles.length === 0) {
      console.log('No text files found in the repository, excluding the .git directory.');
      await fs.remove(tempDirPath).catch(fsRemoveError => {
        console.error('Error removing temporary directory:', fsRemoveError.message, fsRemoveError.stack);
      });
      await Repository.deleteOne({ githubUrl, email }).catch(deleteError => {
        console.error('Error deleting repository entry from database:', deleteError.message, deleteError.stack);
      });
      await sendEmailNotification(email, 'no-text-files', githubUrl);
      console.log(`No text files found notification sent to: ${email}`);
      return;
    }

    let fileSummariesObject = {};

    for (const file of relevantFiles) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const summary = await generateSummary(content, openaiApiKey);
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
    console.log(`All files as string: ${allFilesString}`);

    // Now, combine the individual file summaries and the allFilesString
    const combinedSummariesWithPaths = `${combinedSummaries}\n\n${allFilesString}`;

    const projectSummary = await generateSummary(combinedSummariesWithPaths, openaiApiKey);
    console.log(`Project summary with all file paths has been generated.`);

    const updatedRepository = await Repository.findOneAndUpdate(
      { githubUrl, email },
      {
        summary: projectSummary,
        isProcessed: true,
        fileSummaries: fileSummariesArray
      },
      { new: true }
    );

    console.log(`Ready to send email notification. UUID: ${updatedRepository.uuid}`);

    try {
      await sendEmailNotification(email, updatedRepository.uuid, githubUrl);
      console.log(`Email notification sent. UUID: ${updatedRepository.uuid}`);
    } catch (notificationError) {
      console.error(`Error sending email notification. UUID: ${updatedRepository.uuid}:`, notificationError.message, notificationError.stack);
    }

  } catch (error) {
    console.error('Error during repository background processing:', error.message, error.stack);
  } finally {
    if (tempDirPath) {
      try {
        await fs.remove(tempDirPath);
        console.log('Temporary directory has been removed.');
      } catch (tempDirError) {
        console.error('Error removing temporary directory:', tempDirError.message, tempDirError.stack);
      }
    }
  }
}

module.exports = {
  processRepository
};