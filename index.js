import 'dotenv/config';
import pkg from '@slack/bolt';
const { App } = pkg;
import { Slack } from './services/slack.js';
import { OpenAI } from './services/open-ai.js';
import { parse, format, isValid, subDays, subHours, subMinutes } from 'date-fns';

// Initialize services
const slack = new Slack(process.env.SLACK_BOT_TOKEN);
const openai = new OpenAI(process.env.OPENAI_API_KEY);

// Initialize Slack app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

/**
 * Validates and parses the date/time from the command text
 * Supports various formats:
 * - Relative time: "2 hours ago", "30 minutes ago", "1 day ago"
 * - Absolute date: "2024-03-20", "20.03.2024"
 * - Absolute date and time: "2024-03-20 14:30", "20.03.2024 14:30"
 * @param {string} input - Date/time string
 * @returns {Object} - Object containing parsed date and error message if any
 */
function parseDate(input) {
  input = input.trim().toLowerCase();
  
  // Handle relative time
  const relativeTimeMatch = input.match(/^(\d+)\s+(hour|minute|day)s?\s+ago$/);
  if (relativeTimeMatch) {
    const [_, amount, unit] = relativeTimeMatch;
    const now = new Date();
    let date;
    
    switch (unit) {
      case 'hour':
        date = subHours(now, parseInt(amount));
        break;
      case 'minute':
        date = subMinutes(now, parseInt(amount));
        break;
      case 'day':
        date = subDays(now, parseInt(amount));
        break;
    }
    
    return { 
      date, 
      timestamp: Math.floor(date.getTime() / 1000),
      formatted: format(date, 'dd.MM.yyyy HH:mm')
    };
  }

  // Try parsing absolute date/time
  const formats = [
    'dd.MM.yyyy HH:mm',
    'dd.MM.yyyy',
    'yyyy-MM-dd HH:mm',
    'yyyy-MM-dd'
  ];

  for (const formatStr of formats) {
    const parsedDate = parse(input, formatStr, new Date());
    if (isValid(parsedDate)) {
      return { 
        date: parsedDate, 
        timestamp: Math.floor(parsedDate.getTime() / 1000),
        formatted: format(parsedDate, 'dd.MM.yyyy HH:mm')
      };
    }
  }

  return { 
    error: 'Invalid date/time format. Please use one of these formats:\n' +
           '- Relative time: "2 hours ago", "30 minutes ago", "1 day ago"\n' +
           '- Absolute date: "2024-03-20" or "20.03.2024"\n' +
           '- Absolute date and time: "2024-03-20 14:30" or "20.03.2024 14:30"'
  };
}

/**
 * Generates a TLDR summary for messages from a given timestamp
 * @param {string} channelId - The channel ID
 * @param {number} timestamp - The starting timestamp
 * @param {Object} user - The user who requested the summary
 * @param {string} formattedDate - Formatted date string for the response
 * @returns {Promise<Object>} - Response object with the summary or error
 */
async function generateSummary(channelId, timestamp, user, formattedDate) {
  try {
    // Fetch and process messages
    const rawMessages = await slack.fetchMessages(channelId, timestamp);
    if (rawMessages.length === 0) {
      return {
        error: `No messages found since ${formattedDate}.`
      };
    }

    const processedMessages = await slack.processMessages(rawMessages);
    
    // Generate summary
    const summary = await openai.generateSummary(processedMessages, {
      id: user.id,
      name: user.real_name || user.name
    });

    return {
      text: `TLDR Summary since ${formattedDate}`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: summary
          }
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `This summary was generated from ${processedMessages.length} messages since ${formattedDate}`
            }
          ]
        }
      ]
    };
  } catch (error) {
    return {
      error: 'Error processing the request. Please try again later.'
    };
  }
}

/**
 * Handles the /tldr command
 */
app.command('/tldr', async ({ command, ack, respond }) => {
  await ack();

  try {
    // Parse date
    const { date, timestamp, formatted, error } = parseDate(command.text.trim());
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

    const result = await generateSummary(
      command.channel_id,
      timestamp,
      commandUser,
      formatted
    );

    if (result.error) {
      await respond(result.error);
      return;
    }

    await respond(result);
  } catch (error) {
    await respond('Error processing the request. Please try again later.');
  }
});

/**
 * Handles the "TLDR from here" message action
 */
app.shortcut('tldr_from_here', async ({ ack, body, respond }) => {
  // Acknowledge the action immediately
  await ack();

  try {
    const messageTs = body.message.ts;
    const channelId = body.channel.id;
    const userId = body.user.id;

    // Get user info
    const user = await slack.getUserInfo(userId);
    if (!user) {
      await respond('Error fetching user info. Please try again later.');
      return;
    }

    const formattedDate = format(new Date(parseFloat(messageTs) * 1000), 'dd.MM.yyyy HH:mm');

    const result = await generateSummary(
      channelId,
      parseFloat(messageTs),
      user,
      formattedDate
    );

    if (result.error) {
      await respond(result.error);
      return;
    }

    await respond(result);
  } catch (error) {
    await respond('Error processing the request. Please try again later.');
  }
});

// Start the app
(async () => {
  await app.start(3000);
  console.log('⚡️ Bolt app is running!');
})(); 