const simpleGit = require('simple-git');
const fs = require('fs-extra');
const tmp = require('tmp');
const path = require('path');

const maxFileSize = 32 * 1024; // 32kb in bytes

const cloneAndProcessRepo = async (repoUrl) => {
  const tempDir = tmp.dirSync({ unsafeCleanup: true });
  console.log(`Temporary directory created at: ${tempDir.name}`);
  try {
    console.log(`Cloning the repository: ${repoUrl}`);
    const git = simpleGit();
    await git.clone(repoUrl, tempDir.name);
    console.log('Repository cloned.');
    const { allFiles, textFiles } = await getAllFiles(tempDir.name);
    const processedFiles = await filterAndCheckFiles(textFiles);
    console.log('Files have been checked and filtered.');
    return { processedFiles: processedFiles, allFiles: allFiles, tempDirPath: tempDir.name };
  } catch (error) {
    console.error('Error occurred in cloneAndProcessRepo:', error.message, error.stack);
    tempDir.removeCallback();
    throw error;
  }
};

const getAllFiles = async (dirPath, allFiles = [], textFiles = []) => {
  try {
    const files = await fs.readdir(dirPath);
    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      const stat = await fs.stat(fullPath);
      allFiles.push(fullPath);
      if (stat.isDirectory()) {
        await getAllFiles(fullPath, allFiles, textFiles);
      } else {
        if (isText(fullPath)) {
          textFiles.push(fullPath);
        }
      }
    }
    return { allFiles, textFiles };
  } catch (error) {
    console.error('Error occurred while getting all files:', error.message, error.stack);
    throw error;
  }
};

const filterAndCheckFiles = async (files) => {
  try {
    const processedFiles = [];
    for (const file of files) {
      const stat = await fs.stat(file);
      if (stat.size <= maxFileSize) {
        const isTextFile = await isText(file);
        console.log(`Checked if file is text: ${file}, Result: ${isTextFile}`);
        if (isTextFile) {
          processedFiles.push(file);
        }
      }
    }
    console.log(`Text files smaller than 32kb:`, processedFiles);
    return processedFiles;
  } catch (error) {
    console.error('Error occurred while filtering and checking files:', error.message, error.stack);
    throw error;
  }
};

const isText = async (filename) => {
  try {
    await fs.readFile(filename, 'utf8');
    console.log(`The file ${filename} is a text file.`);
    return true;
  } catch (error) {
    console.error('Error when checking if file is a text file:', error.message, error.stack);
    return false;
  }
};

module.exports = {
  cloneAndProcessRepo,
  isText
};