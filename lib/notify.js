import { TwitterApi } from 'twitter-api-v2';

export async function tweetTask(taskSpec, taskId) {
  if (!process.env.TWITTER_API_KEY) return null;
  try {
    const client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    });
    const text =
      `🤖 New task posted by McAsk AI agent!\n\n` +
      `📋 ${taskSpec.title}\n` +
      `⏱ Est. ${taskSpec.timeEstimate}\n` +
      `💰 Earn MCLAW on @mcclawio\n\n` +
      `Apply here 👇\nhttps://mcclaw.io/tasks/${taskId}\n\n` +
      `#McClaw #AIAgents #Web3Work #Base`;
    const { data } = await client.v2.tweet(text);
    console.log('Tweet posted:', data.id);
    return data;
  } catch (e) {
    console.error('Twitter post failed:', e.message);
    return null;
  }
}

export async function notifySlack(message, fields = []) {
  if (!process.env.SLACK_WEBHOOK_URL) return;
  try {
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: message,
        attachments: fields.length ? [{
          color: '#ffd700',
          fields: fields.map(([title, value]) => ({ title, value, short: true })),
        }] : undefined,
      }),
    });
  } catch (e) {
    console.error('Slack notify failed:', e.message);
  }
}

export async function notifyDiscord(message, fields = []) {
  if (!process.env.DISCORD_WEBHOOK_URL) return;
  try {
    await fetch(process.env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          description: message,
          color: 0xffd700,
          fields: fields.map(([name, value]) => ({ name, value, inline: true })),
          footer: { text: 'McAsk · Powered by McClaw' },
          timestamp: new Date().toISOString(),
        }],
      }),
    });
  } catch (e) {
    console.error('Discord notify failed:', e.message);
  }
}

export async function notifyAll(message, fields = []) {
  await Promise.all([notifySlack(message, fields), notifyDiscord(message, fields)]);
}
