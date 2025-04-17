# Slack TLDR Extension

A Slack extension that provides TLDR summaries of channel messages from a specified date.

## Features

- `/tldr` slash command to get summaries of channel messages
- Date-based message filtering
- AI-powered summarization using OpenAI
- Easy to use and set up

## Setup

1. Create a new Slack app at [api.slack.com/apps](https://api.slack.com/apps)
2. Add the following bot token scopes:
   - `chat:write`
   - `channels:history`
   - `commands`
3. Create a slash command:
   - Command: `/tldr`
   - Request URL: `https://your-domain.com/slack/events`
   - Short Description: "Get a TLDR summary of channel messages"
4. Install the app to your workspace
5. Copy the Bot User OAuth Token and Signing Secret
6. Get an OpenAI API key
7. Create a `.env` file with the following:
   ```
   SLACK_BOT_TOKEN=xoxb-your-bot-token
   SLACK_SIGNING_SECRET=your-signing-secret
   OPENAI_API_KEY=your-openai-api-key
   ```
8. Install dependencies:
   ```bash
   npm install
   ```
9. Start the server:
   ```bash
   node index.js
   ```

## Usage

1. In any Slack channel, type `/tldr` followed by a date in DD.MM.YYYY format
2. Example: `/tldr 26.04.2024`
3. The bot will respond with a TLDR summary of all messages from that date onwards

## Requirements

- Node.js 14 or higher
- Slack workspace with admin permissions
- OpenAI API key 