const OpenAI = require('openai');
const Repository = require('./repository');
require('dotenv').config();

const openai = new OpenAI(process.env.OPENAI_API_KEY);

async function interactWithRepository(uuid, userMessage) {
  try {
    const repository = await Repository.findOne({ uuid: uuid }).exec();
    if (!repository || !repository.isProcessed) {
      throw new Error('Repository not found or not processed yet.');
    }

    // gpt_pilot_debugging_log
    console.log('Repository file summaries:', repository.fileSummaries);

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
    // gpt_pilot_debugging_log
    console.error('Error in interactWithRepository:', error.message, error.stack);
    throw error;
  }
}

module.exports = {
  interactWithRepository
};