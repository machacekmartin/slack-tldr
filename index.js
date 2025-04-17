import 'dotenv/config';
import pkg from '@slack/bolt';
const { App } = pkg;
import { Slack } from './services/slack.js';
import { OpenAI } from './services/open-ai.js';

// Initialize services
const slack = new Slack(process.env.SLACK_BOT_TOKEN);
const openai = new OpenAI(process.env.OPENAI_API_KEY);

// Initialize Slack app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

/**
 * Validates and parses the date from the command text
 * @param {string} dateStr - Date string in DD.MM.YYYY format
 * @returns {Object} - Object containing parsed date and error message if any
 */
function parseDate(dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return { error: 'Invalid date format. Please use DD.MM.YYYY.' };
  }
  return { date, timestamp: Math.floor(date.getTime() / 1000) };
}

/**
 * Handles the /tldr command
 */
app.command('/tldr', async ({ command, ack, respond }) => {
  await ack();

  try {
    // Parse date
    const { date, timestamp, error } = parseDate(command.text.trim());
    if (error) {
      await respond(error);
      return;
    }

    // Get command user info
    const commandUser = await slack.getUserInfo(command.user_id);
    if (!commandUser) {
      await respond('Error fetching user info. Please try again later.');
      return;
    }

    // Fetch and process messages
    const rawMessages = await slack.fetchMessages(command.channel_id, timestamp);
    if (rawMessages.length === 0) {
      await respond('No messages found for the given date.');
      return;
    }

    const processedMessages = await slack.processMessages(rawMessages);
    
    // Generate and send summary
    const summary = await openai.generateSummary(processedMessages, {
      id: commandUser.id,
      name: commandUser.real_name || commandUser.name
    });

    await respond({
      text: `TLDR Summary since ${command.text.trim()}`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: summary
          }
        }
      ]
    });

  } catch (error) {
    await respond('Error processing the request. Please try again later.');
  }
});

// Start the app
(async () => {
  await app.start(3000);
  console.log('⚡️ Bolt app is running!');
})(); 