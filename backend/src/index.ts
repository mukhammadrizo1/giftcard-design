import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { apiRouter } from './routes/api.js';
import { createTelegramBot } from './bot/bot.js';

const app = express();

// Middlewares
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
app.use('/api', apiRouter);

// Root route
app.get('/', (req, res) => {
  res.json({
    service: 'Korzinka Gift Card Designer API & Bot',
    status: 'running',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      cardInfo: '/api/card-info',
      parseBarcodes: '/api/parse-barcodes',
      generatePdf: '/api/generate-pdf'
    }
  });
});

// Start Express server
const server = app.listen(config.port, () => {
  console.log(`🚀 Server is running on http://localhost:${config.port}`);

  // Self-ping keep-alive service (prevents free hosting like Render from sleeping)
  if (config.pingUrl) {
    const pingTarget = config.pingUrl.endsWith('/api/health') 
      ? config.pingUrl 
      : `${config.pingUrl.replace(/\/$/, '')}/api/health`;

    console.log(`⏱️ Keep-alive ping service enabled for: ${pingTarget}`);
    // Ping every 10 minutes (600,000 ms)
    setInterval(async () => {
      try {
        const res = await fetch(pingTarget);
        console.log(`[Ping] Keep-alive ping status: ${res.status} at ${new Date().toLocaleTimeString()}`);
      } catch (err: any) {
        console.warn(`[Ping] Keep-alive ping warning: ${err.message}`);
      }
    }, 10 * 60 * 1000);
  }
});

// Start Telegram Bot if BOT_TOKEN is configured
let botInstance: any = null;
if (config.botToken) {
  botInstance = createTelegramBot(config.botToken);
  if (botInstance) {
    botInstance.start({
      onStart: (botInfo: any) => {
        console.log(`🤖 Telegram Bot started as @${botInfo.username}`);
      }
    });
  }
} else {
  console.log('ℹ️ BOT_TOKEN not set. Running API server only. (Set BOT_TOKEN in .env to enable Telegram bot)');
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  if (botInstance) botInstance.stop();
  server.close(() => {
    console.log('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  if (botInstance) botInstance.stop();
  server.close(() => {
    console.log('HTTP server closed');
  });
});
