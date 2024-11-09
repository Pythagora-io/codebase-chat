const Repository = require('./repository');
const { cloneAndProcessRepo } = require('./gitHandler');
const { generateSummary } = require('./openaiService');
const { sendEmailNotification } = require('./emailService');
const fs = require('fs-extra');
const path = require('path');

async function processRepository(githubUrl, openaiApiKey) {
  processRepoInBackground(githubUrl, openaiApiKey).catch(error => {
    console.error('Asynchronous processing error:', error.message, error.stack);
    Repository.findOneAndUpdate({ githubUrl }, { isProcessed: true, processingError: error.message }, { new: true }).catch(err => {
      console.error('Failed to update repository with error state:', err.message, err.stack);
    });
  });

  console.log(`Processing started for repository: ${githubUrl}`);
}

async function processRepoInBackground(githubUrl, openaiApiKey) {
  let tempDirPath;
  try {
    const { processedFiles, allFiles, tempDirPath: dirPath } = await cloneAndProcessRepo(githubUrl);
    tempDirPath = dirPath;

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
      await Repository.findOneAndUpdate({ githubUrl }, { isProcessed: true, processingError: 'No text files found' }, { new: true }).catch(deleteError => {
        console.error('Error updating repository entry in database:', deleteError.message, deleteError.stack);
      });
      // Update to handle notification for 'no text files found' scenario appropriately
      const repository = await Repository.findOne({ githubUrl });
      if (repository && repository.emails && repository.emails.length > 0) {
        console.log(`No text files found. Notifications would be handled through a different mechanism for ${githubUrl}`);
      }
      return;
    }

    let fileSummariesObject = {};

    for (const file of relevantFiles) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const summary = await generateSummary(content, openaiApiKey);
        fileSummariesObject[file] = summary;
      } catch (fileReadError) {
        console.error('Error reading or summarizing file:', file, fileReadError.message, fileReadError.stack);
      }
    }

    const fileSummariesArray = Object.values(fileSummariesObject);
    console.log('File summaries:', fileSummariesArray);

    const combinedSummaries = fileSummariesArray.join(' ');

    const allFilesString = allFiles.join('\n');
    console.log(`All files as string: ${allFilesString}`);

    const combinedSummariesWithPaths = `${combinedSummaries}\n\n${allFilesString}`;

    const projectSummary = await generateSummary(combinedSummariesWithPaths, openaiApiKey);
    console.log(`Project summary with all file paths has been generated.`);

    const updatedRepository = await Repository.findOneAndUpdate(
      { githubUrl },
      {
        summary: projectSummary,
        isProcessed: true,
        fileSummaries: fileSummariesArray
      },
      { new: true }
    );

    console.log(`Ready to send email notifications. UUID: ${updatedRepository.uuid}`);

    try {
      const repository = await Repository.findOne({ githubUrl });
      if (repository && repository.emails && repository.emails.length > 0) {
        await sendEmailNotification(repository.emails, updatedRepository.uuid, githubUrl);
        console.log(`Email notifications sent for ${githubUrl}`);
      } else {
        console.log(`No emails found for repository: ${githubUrl}`);
      }
    } catch (notificationError) {
      console.error(`Error sending email notifications. UUID: ${updatedRepository.uuid}:`, notificationError.message, notificationError.stack);
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