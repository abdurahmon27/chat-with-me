# Telegram Bot

A compact and scalable Node.js-based Telegram bot designed for real-time communication, anonymous messaging, and efficient user management. Built with `node-telegram-bot-api` and a cluster-based architecture for handling multiple CPU cores.

## Features

- **Anonymous Messaging**: Users can send anonymous messages to the admin, with notifications sent to a specified Telegram channel.
- **Command-Based Interaction**: Commands such as `/start`, `/help`, and `/reply` simplify user and admin interaction.
- **Scalable Architecture**: Utilizes Node.js clusters to efficiently manage multiple CPU cores.
- **Keep-Alive Mechanism**: Sends periodic requests to ensure uninterrupted operation on hosting platforms.
- **Robust Error Handling**: Incorporates retry mechanisms and error recovery for seamless bot operation.

## Requirements

- Node.js (v16+)
- Telegram bot token from [@BotFather](https://core.telegram.org/bots#botfather)

## Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/yourusername/telegram-bot.git
   cd telegram-bot
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file and add the following variables:
   ```env
   PORT=3000
   TELEGRAM_TOKEN=your_bot_token
   ADMIN_ID=your_admin_chat_id
   CHANNEL_USERNAME=@your_channel_username
   KEEP_ALIVE_URL=https://your-app-url
   ```

4. **Start the Bot**:
   ```bash
   npm start
   ```

## Usage

### Commands

- **/start**: Initialize interaction with the bot.
- **/help**: Display available commands.
- **/reply [chat_id] [message]**: Admin-only command to respond to user messages anonymously.

### User Interaction Workflow

1. A user sends a message to the bot.
2. The bot forwards the message to the admin and a specified channel.
3. The admin replies using the `/reply` command, sending the response directly to the user.

## Code Highlights

### Cluster-Based Scalability

Efficiently utilize CPU cores for scalability:
```javascript
if (cluster.isMaster) {
  for (let i = 0; i < numCPUs - 1; i++) {
    cluster.fork();
  }
  cluster.on("exit", (worker) => {
    console.log(`Worker ${worker.process.pid} died. Spawning a new one...`);
    cluster.fork();
  });
}
```

### Error Handling and Recovery

Ensure bot stability with retry logic:
```javascript
bot.on("polling_error", (error) => {
  if (error.code === "ETELEGRAM" && error.response.body.error_code === 409) {
    bot.stopPolling().then(() => {
      setTimeout(() => bot.startPolling(), 5000);
    });
  }
});
```

### Keep-Alive Mechanism

Prevent termination due to inactivity:
```javascript
setInterval(() => {
  https.get(KEEP_ALIVE_URL, (res) => res.on("data", () => {}));
}, KEEP_ALIVE_INTERVAL_MS);
```

## How It Works

1. **Master Process**:
   - Manages Telegram bot polling and worker processes.
   - Sends periodic keep-alive requests.

2. **Worker Processes**:
   - Handle HTTP requests and other tasks.

3. **Bot Handlers**:
   - `setupBotHandlers`: Defines message, error, and command handling.
   - `handleCommands`: Processes user commands.
   - `handleReply`: Enables admin to respond to users.

4. **Message Flow**:
   - User messages are forwarded to the admin and channel.
   - Admin replies are routed back to the user.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
