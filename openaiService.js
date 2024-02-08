const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI(process.env.OPENAI_API_KEY);

console.log('OpenAI API Key provided:', process.env.OPENAI_API_KEY ? 'Yes' : 'No');

async function generateSummary(textContent) {
  console.log('Generating summary for content length:', textContent.length);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo-16k',
      messages: [{ role: "system", content: "Summarize the following content." }, { role: "user", content: textContent }],
      max_tokens: 1024,
      temperature: 0.5
    });
    console.log('Summary generation successful.');

    // gpt_pilot_debugging_log
    console.log('OpenAI response object:', response);
    if (!response.choices || response.choices.length === 0 || !response.choices[0].message) {
      console.error('Received an invalid response from OpenAI:', response); // gpt_pilot_debugging_log
      throw new Error('Invalid response from OpenAI');
    }

    // gpt_pilot_debugging_log
    console.log('OpenAI response choices:', response.choices);
    return response.choices[0].message.content.trim();
  } catch (error) {
    // Ensuring that the full error stack is logged
    console.error('Error generating summary with OpenAI:', error.message, error.stack);
    throw error;
  }
}

module.exports = {
  generateSummary
};