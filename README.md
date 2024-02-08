# CodeWhisperer

CodeWhisperer is an innovative Node.js application that allows users to have conversations with their code repositories. By leveraging the power of OpenAI's AI models, it can summarize text files and entire code repositories to facilitate a chat-like interaction.

## Overview

The application is built using Express for server management, MongoDB for data persistence, and Bootstrap for the front-end interface. It primarily interacts with OpenAI's API to create summaries of repositories and engage users in conversations about their code. The app processes GitHub repositories by cloning them, generating summaries through the gpt-3.5-turbo-16k and gpt-4-turbo-preview AI models, and then communicates the results via email using Sendgrid.

## Features

- Accepts GitHub repository URLs and user email addresses for processing
- Clones repositories and summarizes text files and overall project contents
- Communicates with OpenAI's API to generate summaries and answer user queries
- Sends email notifications with links to interact with the repository summary
- Provides a chat interface for dynamic interaction with the project summary

## Getting started

### Requirements

- Node.js environment
- MongoDB instance
- OpenAI API key
- Sendgrid credentials for email notifications

### Quickstart

1. Clone the repository to your machine.
2. Install necessary Node.js packages with `npm install`.
3. Configure the required environment variables within an `.env` file.
4. Run the application using `npm start` or `node server.js`.

### License

Copyright (c) 2024.