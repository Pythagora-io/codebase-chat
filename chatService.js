const OpenAI = require('openai');
const Repository = require('./repository');

async function interactWithRepository(uuid, userMessage, apiKey) {
  try {
    const repository = await Repository.findOne({ uuid: uuid }).exec();
    if (!repository || !repository.isProcessed) {
      throw new Error('Repository not found or not processed yet.');
    }

    console.log('Repository file summaries:', repository.fileSummaries);

    const openai = new OpenAI({ apiKey });

    const systemMessage = {
      role: 'system',
      content: `This is a summary of the project: ${repository.summary}`
    };
    const userMessageObj = {
      role: 'user',
      content: userMessage
    };

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [systemMessage, ...(repository.fileSummaries || []).map(summary => ({ role: 'system', content: summary })), userMessageObj],
      max_tokens: 1024,
      temperature: 0.5
    });

    if (!response.choices || response.choices.length === 0 || !response.choices[0].message) {
      throw new Error('Invalid response from OpenAI');
    }

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error in interactWithRepository:', error.message, error.stack);
    throw error;
  }
}

module.exports = {
  interactWithRepository
};