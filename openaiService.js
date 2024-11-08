const OpenAI = require("openai");

async function generateSummary(content, apiKey) {
  console.log(`Generating summary for content of length: ${content.length}`);
  const openai = new OpenAI({ apiKey });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-16k",
      messages: [
        { role: "system", content: "You are a helpful assistant that summarizes code and text." },
        { role: "user", content: `Please summarize the following content:\n\n${content}` }
      ],
      max_tokens: 1024,
      temperature: 0.5,
    });

    console.log('Summary generation successful.');
    console.log('OpenAI response object:', response);

    if (response.choices && response.choices.length > 0 && response.choices[0].message) {
      console.log('OpenAI response choices:', response.choices);
      return response.choices[0].message.content.trim();
    } else {
      console.error('Received an invalid response from OpenAI:', response);
      throw new Error('Invalid response from OpenAI');
    }
  } catch (error) {
    console.error('Error generating summary with OpenAI:', error.message, error.stack);
    throw error;
  }
}

module.exports = {
  generateSummary
};