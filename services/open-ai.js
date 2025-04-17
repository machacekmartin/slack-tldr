import { OpenAI as OpenAIClient } from 'openai';

export class OpenAI {
  constructor(apiKey) {
    this.client = new OpenAIClient({ apiKey });
  }

  async generateSummary(messages, commandUser) {
    const messageTexts = messages
      .map(msg => `[${msg.user}]: ${msg.text}`)
      .join('\n');

    const systemPrompt = `
      You are a helpful assistant that creates TLDR summaries of conversations.
      In up to 5 sentences, summarize the conversation, capturing the key points and decisions. If the conversation is short, do not hallucinate or make up information to fill in the sentences.
      Use plain sentences, no bullet points or lists.
      When mentioning users, always use their username format.
      At the end, tell me if the conversation is relevant (some tasks were assigned to me) to me (the user who requested the summary), or not.
    `;

    const userPrompt = `The user ${commandUser.name} has requested a summary of the following Slack thread: <SLACK MESSAGES>\n\n${messageTexts}\n\n</SLACK MESSAGES>`;

    try {
      const completion = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 1000,
      });

      return this.formatSummary(completion.choices[0].message.content, messages, commandUser);
    } catch (error) {
      console.error('Error generating summary:', error);
      throw error;
    }
  }

  formatSummary(summary, messages, commandUser) {
    let formattedSummary = summary;
    
    // Replace user names with proper Slack mentions
    for (const msg of messages) {
      if (msg.userId) {
        const userRegex = new RegExp(`\\b${msg.user}\\b`, 'gi');
        const mention = `<@${msg.userId}>`;
        formattedSummary = formattedSummary.replace(userRegex, mention);
      }
    }

    return formattedSummary;
  }
} 