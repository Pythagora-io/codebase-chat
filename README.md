```markdown
# Codebase Chat

Codebase Chat is a web-based tool designed to enhance user interactions with their code repositories through AI-driven summaries and explanations. The application provides a modern, user-friendly interface, allowing non-technical users to easily engage with their code projects.

## Overview

Codebase Chat is built using the following technologies:
- **Node.js**: JavaScript runtime for building server-side applications.
- **Express**: Web server framework for Node.js.
- **MongoDB**: NoSQL database for data persistence.
- **Bootstrap**: Front-end framework for responsive and visually appealing design.
- **SendGrid**: Email service for notifications.
- **OpenAI API**: For generating AI-driven summaries and interactions.

The application is structured into the following key components:
- **Server**: Handles routing, authentication, and serves static files.
- **Database**: Manages user and repository data using MongoDB.
- **Services**: Includes email, OpenAI interaction, and GitHub repository processing services.
- **Middleware**: Authentication and session management.
- **Public**: Contains static files like CSS and JavaScript for the frontend.
- **Views**: EJS templates for rendering HTML pages.

## Features

- **User Authentication**: Registration and login via email (without email verification).
- **API Key Management**: Users can store and verify their OpenAI API key.
- **Repository Submission**: Users can submit GitHub repository URLs for processing.
- **AI-Driven Summaries**: The application generates summaries of repository files and the entire project using OpenAI's models.
- **Email Notifications**: Users receive an email notification once their repository has been processed.
- **Interactive Q&A**: Users can ask questions about their repository and get AI-generated responses based on the project summary.

## Getting started

### Requirements

To run Codebase Chat, you will need:
- **Node.js**: Ensure Node.js is installed on your system.
- **MongoDB**: Either a local MongoDB instance or a cloud version like MongoDB Atlas.
- **SendGrid Account**: For sending email notifications.
- **OpenAI API Key**: For interacting with OpenAI's models.

### Quickstart

1. **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd codebase-chat
    ```

2. **Install dependencies**:
    ```bash
    npm install
    ```

3. **Set up environment variables**:
    - Create a `.env` file in the project root and populate it with the necessary environment variables. Refer to the `.env.example` file for guidance.

4. **Start the application**:
    ```bash
    npm start
    ```

5. **Access the application**:
    - Open your web browser and navigate to `http://localhost:3001`.

### License

The project is proprietary. Copyright © 2024.
```