const fs = require('fs-extra');
const { isText } = require('../gitHandler'); // Adjust the import statement to destructure isText directly

describe('isText function', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should consider a file with text contents as a text file', async () => {
    jest.spyOn(fs, 'readFile').mockResolvedValue('This is a text file');
    const filename = 'test.txt';
    // try-catch is unnecessary here because jest will catch rejections for us
    const result = await isText(filename);
    expect(result).toBe(true);
  });

  it('should not consider a binary file as a text file', async () => {
    jest.spyOn(fs, 'readFile').mockRejectedValue(new Error('Binary file'));
    const filename = 'binaryfile.bin';
    // try-catch is unnecessary here because jest will catch rejections for us
    const result = await isText(filename);
    expect(result).toBe(false);
  });

  it('should properly read files regardless of extension', async () => {
    jest.spyOn(fs, 'readFile')
      .mockResolvedValueOnce('Normal text')
      .mockRejectedValueOnce(new Error('Binary content'));
    const textFilename = 'file.with.unknownext';
    const binaryFilename = 'image.jpg';
    // try-catch is unnecessary here because jest will catch rejections for us
    const textResult = await isText(textFilename);
    const binaryResult = await isText(binaryFilename);
    expect(textResult).toBe(true);
    expect(binaryResult).toBe(false);
  });

  it('should handle encoding-related read errors gracefully', async () => {
    const error = new Error('EncodingError');
    error.code = 'ENOENT';
    jest.spyOn(fs, 'readFile').mockRejectedValue(error);
    const filename = 'fileWithEncodingIssues.txt';
    // try-catch is unnecessary here because jest will catch rejections for us
    const result = await isText(filename);
    expect(result).toBe(false);
  });
});