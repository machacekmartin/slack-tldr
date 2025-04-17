import pkg from '@slack/web-api';
const { WebClient } = pkg;

export class Slack {
  constructor(token) {
    this.client = new WebClient(token);
  }

  async getUserInfo(userId) {
    try {
      const result = await this.client.users.info({ user: userId });
      return result.user;
    } catch (error) {
      console.error('Error fetching user info:', error);
      return null;
    }
  }

  async fetchMessages(channelId, oldest) {
    try {
      const result = await this.client.conversations.history({
        channel: channelId,
        oldest: oldest,
        limit: 1000,
      });
      return result.messages;
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  async processMessages(messages) {
    const processedMessages = await Promise.all(
      messages.map(async (msg) => {
        if (!msg.user) return null;
        
        const userInfo = await this.getUserInfo(msg.user);
        if (!userInfo) return null;

        return {
          text: msg.text,
          user: userInfo.real_name || userInfo.name,
          userId: userInfo.id,
          timestamp: msg.ts
        };
      })
    );

    return processedMessages.filter(Boolean);
  }
} 