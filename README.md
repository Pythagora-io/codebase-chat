# Codebase Chat

Codebase Chat is a web-based tool designed to enhance user interactions with their code repositories through AI-driven summaries and explanations.

## Overview

The app integrates the Express framework within a Node.js environment, utilizing MongoDB for data persistence. For UI elegance and interactivity, Bootstrap is employed. The core functionality is built around OpenAI's powerful language models, enabling the app to generate concise text summaries and interactive Q&A sessions about a user's code repository.

## Features

- Submits GitHub repository URLs and email addresses for processing
- Clones GitHub repositories and communicates with OpenAI API to generate summaries
- Provides interactive explanations of code via a unique link, offering insights into repositories
- Utilizes Sendgrid for email notifications upon the completion of repository analysis
- Proffers a unique and engaging way to understand and engage with one's programming projects

## Getting started

### Requirements

- Node.js
- MongoDB
- A Sendgrid account for email services
- An OpenAI API key for natural language processing

### Quickstart

1. Ensure that MongoDB is running on your system.
2. Clone the repository to your local machine.
3. Install node modules by running `npm install`.
4. Set up the necessary environment variables in an `.env` file.
5. Start the application with `npm start`, and navigate to `localhost:3001` on your web browser.

### License

The project is open source, licensed under the MIT License. See the [LICENSE](LICENSE).

Copyright © 2024 Pythagora-io.