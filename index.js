const cluster = require("cluster");
const os = require("os");
const http = require("http");
const https = require("https");
const TelegramBot = require("node-telegram-bot-api");

const numCPUs = os.cpus().length;
const PORT = process.env.PORT || 3000;
const KEEP_ALIVE_URL = "ACTUAL_RENDER_URL_OF_YOUR_PROJECT";
const KEEP_ALIVE_INTERVAL_MS = 49000;

const token = "BOT_TOKEN";
const ADMIN_ID = 'ADMIN_ID'; // in number
const CHANNEL_USERNAME = "CHANNEL_LINK";

if (cluster.isMaster) {
  console.log(`Master process PID: ${process.pid} is running...`);

  const bot = new TelegramBot(token, { polling: true });
  setupBotHandlers(bot);

  setInterval(() => {
    console.log(`[Master] Sending keep-alive request to ${KEEP_ALIVE_URL}`);
    https
      .get(KEEP_ALIVE_URL, (res) => {
        res.on("data", () => {});
        res.on("end", () => {
          console.log(`[Master] Keep-alive request successful`);
        });
      })
      .on("error", (err) => {
        console.error(`[Master] Keep-alive request failed: ${err.message}`);
      });
  }, KEEP_ALIVE_INTERVAL_MS);

  for (let i = 0; i < numCPUs - 1; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died. Spawning a new one...`);
    cluster.fork();
  });
} else {
  console.log(`Worker process PID: ${process.pid} started.`);

  const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(`Server is running on worker PID: ${process.pid}\n`);
  });

  server.listen(PORT, () => {
    console.log(`[Worker ${process.pid}] Server is listening on port ${PORT}`);
  });
}

function setupBotHandlers(bot) {
  process.on("unhandledRejection", (error) => {
    console.error(`[Master] Unhandled promise rejection:`, error);
  });

  bot.on("polling_error", (error) => {
    console.error(`[Master] Polling error:`, error);
    if (error.code === "ETELEGRAM" && error.response.body.error_code === 409) {
      console.log("Restarting bot due to conflict...");
      bot.stopPolling().then(() => {
        setTimeout(() => {
          bot.startPolling();
        }, 5000);
      });
    }
  });

  bot.on("message", async (msg) => {
    try {
      const chatId = msg.chat.id;
      const username = msg.from.username || "Anonymous";
      const messageText = msg.text;
      const timestamp = new Date().toLocaleString();

      const userLastMessage = userMessageTimestamps.get(chatId) || 0;
      const now = Date.now();
      if (now - userLastMessage < 1000) {
        return;
      }
      userMessageTimestamps.set(chatId, now);

      if (messageText?.startsWith("/")) {
        await handleCommands(bot, msg);
        return;
      }

      const userInfo =
        `Yangi Xabar:\n\n` +
        `👤 Foydalanuvchi linki: @${username}\n` +
        `📱 Chat ID: ${chatId}\n` +
        `👤 Ism: ${msg.from.first_name || ""} ${msg.from.last_name || ""}\n` +
        `💬 Xabar: ${messageText}\n` +
        `⏰ Vaqt: ${timestamp}`;

      try {
        await Promise.all([
          bot.sendMessage(CHANNEL_USERNAME, userInfo),
          bot.sendMessage(
            chatId,
            "Xabaringiz anonim tarzda Abdurahmonga yetkazildi! Tez orada javob olasiz.",
            { parse_mode: "HTML" }
          ),
        ]);
      } catch (error) {
        console.error(`[Master] Error handling message:`, error);
        setTimeout(async () => {
          try {
            await bot.sendMessage(
              chatId,
              "Xabaringiz anonim tarzda Abdurahmonga yetkazildi! Tez orada javob olasiz."
            );
          } catch (retryError) {
            console.error(`[Master] Retry failed:`, retryError);
          }
        }, 2000);
      }
    } catch (error) {
      console.error(`[Master] Message handling error:`, error);
    }
  });
}

const userMessageTimestamps = new Map();

async function handleCommands(bot, msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const command = msg.text.trim().split(" ")[0];

  try {
    switch (command) {
      case "/start":
        await sendNewUserNotification(bot, msg);
        await bot.sendMessage(
          chatId,
          "Assalomu alaykum! Siz Abdurahmon bilan aloqaga chiqdingiz. Xabaringizni qoldiring, tez orada javob olasiz.",
          { parse_mode: "HTML" }
        );
        break;

      case "/help":
        await bot.sendMessage(
          chatId,
          `Bot kommandalari:\n
/start - Ishga tushirish
/help - Yordam olish`,
          { parse_mode: "HTML" }
        );
        break;

      case "/reply":
        if (userId === ADMIN_ID) {
          await handleReply(bot, msg);
        } else {
          await bot.sendMessage(chatId, "Bu kommanda faqat admin uchun.");
        }
        break;
    }
  } catch (error) {
    console.error(`[Master] Command handling error:`, error);
  }
}

async function sendNewUserNotification(bot, msg) {
  const chatId = msg.chat.id;
  const username = msg.from.username || "Anonymous";
  const timestamp = new Date().toLocaleString();

  const newUserInfo =
    `🆕 Yangi Foydalanuvchi!\n\n` +
    `👤 Username: @${username}\n` +
    `📱 Chat ID: ${chatId}\n` +
    `👤 Ism: ${msg.from.first_name || ""} ${msg.from.last_name || ""}\n` +
    `📍 Tili: ${msg.from.language_code || "Aniqlanmadi"}\n` +
    `⏰ Qo'shilgan vaqt: ${timestamp}`;

  try {
    await bot.sendMessage(CHANNEL_USERNAME, newUserInfo);
  } catch (error) {
    console.error(`[Master] Error sending new user notification:`, error);
  }
}

async function handleReply(bot, msg) {
  const params = msg.text.split(" ");

  if (params.length < 3) {
    await bot.sendMessage(
      msg.chat.id,
      "Usage: /reply [chat_id] [message]\nExample: /reply 123456789 Hello, how can I help you?"
    );
    return;
  }

  const targetChatId = params[1];
  const replyMessage = params.slice(2).join(" ");

  try {
    await Promise.all([
      bot.sendMessage(targetChatId, replyMessage),
      bot.sendMessage(
        CHANNEL_USERNAME,
        `Admin Javobi:\n\n` +
          `📱Chat ID: ${targetChatId}ga\n` +
          `💬 Reply: ${replyMessage}\n` +
          `⏰ Vaqt: ${new Date().toLocaleString()}`
      ),
    ]);

    await bot.sendMessage(msg.chat.id, "Reply sent successfully!");
  } catch (error) {
    console.error(`[Master] Reply error:`, error);
    await bot.sendMessage(
      msg.chat.id,
      "Error sending reply. Please check the chat ID."
    );
  }
}
