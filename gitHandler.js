const simpleGit = require('simple-git');
const fs = require('fs-extra');
const tmp = require('tmp');
const path = require('path');

const maxFileSize = 32 * 1024; // 32kb in bytes

const cloneAndProcessRepo = async (repoUrl) => {
  const tempDir = tmp.dirSync({ unsafeCleanup: true });
  console.log(`Temporary directory created at: ${tempDir.name}`); // gpt_pilot_debugging_log
  try {
    console.log(`Cloning the repository: ${repoUrl}`);
    const git = simpleGit();
    await git.clone(repoUrl, tempDir.name);
    console.log('Repository cloned.');
    const files = await getAllFiles(tempDir.name);
    const processedFiles = await filterAndCheckFiles(files);
    console.log('Files have been checked.');
    console.log(`Temporary directory will be kept at: ${tempDir.name} for file processing.`); // gpt_pilot_debugging_log
    return { processedFiles: processedFiles, tempDirPath: tempDir.name };
  } catch (error) {
    console.error('Error occurred in cloneAndProcessRepo:', error.message, error.stack); // gpt_pilot_debugging_log
    tempDir.removeCallback(); // Ensure cleanup even in case of error
    throw error;
  }
};

const getAllFiles = async (dirPath, arrayOfFiles = []) => {
  try {
    const files = await fs.readdir(dirPath);
    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      console.log(`Full path of file: ${fullPath}`); // gpt_pilot_debugging_log
      const stat = await fs.stat(fullPath);
      if (stat.isDirectory()) {
        await getAllFiles(fullPath, arrayOfFiles);
      } else {
        arrayOfFiles.push(fullPath);
      }
    }
    return arrayOfFiles;
  } catch (error) {
    console.error('Error occurred while getting all files:', error.message, error.stack); // gpt_pilot_debugging_log
    throw error;
  }
};

const filterAndCheckFiles = async (files) => {
  try {
    const processedFiles = [];
    for (const file of files) {
      const stat = await fs.stat(file);
      if (stat.size <= maxFileSize && isText(file)) {
        processedFiles.push(file);
      }
    }
    console.log(`Text files smaller than 32kb:`, processedFiles); // gpt_pilot_debugging_log
    return processedFiles;
  } catch (error) {
    console.error('Error occurred while filtering and checking files:', error.message, error.stack); // gpt_pilot_debugging_log
    throw error;
  }
};

const isText = (filename) => {
  const textFileExtensions = /\.txt$/i;
  const isText = textFileExtensions.test(path.extname(filename));
  console.log(`Checking if ${filename} is a text file: ${isText}`); // gpt_pilot_debugging_log
  return isText;
};

module.exports = {
  cloneAndProcessRepo
};