# CodeWhisperer

CodeWhisperer is a Node.js application leveraging Express and MongoDB, with a Bootstrap-based UI. It facilitates conversation with code repositories by summarizing files and projects using OpenAI's gpt-3.5-turbo-16k and gpt-4-turbo-preview models.

## Overview

The app utilizes Express.js for server-side operations and MongoDB as a data storage solution. It uses the Bootstrap framework to create a responsive UI. The application operates by accepting GitHub repository URLs and email addresses, cloning repositories, extracting and summarizing textual content, and storing summaries in MongoDB. Email notifications are sent through Sendgrid upon task completion.

## Features

- Accept GitHub repository URLs and emails on the main page
- Clone, summarize, and delete repositories upon processing
- Interact with OpenAI's API to generate code and project summaries
- Email users with links to interact with their repository summaries
- Display project summary and offer a chat-like interface for Q&A powered by OpenAI

## Getting started

### Requirements

- Node.js
- MongoDB
- An OpenAI API key

### Quickstart

1. Clone the repository to your local machine.
2. Install dependencies with `npm install`.
3. Set up your `.env` file with the necessary environment variables (PORT, MONGODB_URI, and OPENAI_API_KEY).
4. Run the server using `npm start` or `node server.js`.

### License

Copyright (c) 2024.