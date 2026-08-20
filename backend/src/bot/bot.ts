import { Bot, session, Context, SessionFlavor, InputFile, InlineKeyboard } from 'grammy';
import { PdfGenerator } from '../services/pdfGenerator.js';
import { BarcodeParser } from '../services/barcodeParser.js';

type BotLanguage = 'uz' | 'ru' | 'en';

interface SessionData {
  lang?: BotLanguage;
  step: 'idle' | 'waiting_lang' | 'waiting_amount' | 'waiting_expiry' | 'waiting_barcodes' | 'generating';
  amount: string;
  expiryDate: string;
  barcodes: string[];
}

export type MyContext = Context & SessionFlavor<SessionData>;

// Multi-language dictionary for Telegram Bot
const botI18n = {
  uz: {
    welcome:
      `🛒 *Korzinka Sovg‘a Kartalari Generatoriga xush kelibsiz!*\n\n` +
      `Ushbu bot chop etish uchun standart formatdagi (*320×450 mm, 21 ta karta/varaq*) yuqori sifatli PDF fayllarni bir zumda tayyorlab beradi.\n\n` +
      `1️⃣ *1-qadam:* Karta qiymatini (nominalini) tanlang yoki yozib yuboring:`,
    chooseLangTitle: `🌐 *Iltimos, muloqot tilini tanlang / Пожалуйста, выберите язык / Please choose language:*`,
    langChanged: `✅ Muloqot tili *O‘zbekcha*ga o‘zgartirildi!`,
    customAmountPrompt: `✍️ Iltimos, karta qiymatini raqamda kiriting (masalan: \`75000\` yoki \`150000\`):`,
    invalidAmount: `⚠️ Iltimos, to‘g‘ri summa kiriting (faqat raqamlar, masalan: \`100000\`):`,
    step2Title: (amount: string) =>
      `✅ Karta qiymati: *${amount} so‘m*\n\n` +
      `2️⃣ *2-qadam:* Karta amal qilish muddatini tanlang:`,
    customExpiryPrompt: `✍️ Iltimos, amal qilish sanasini kiriting (masalan: \`31.12.2027\` yoki \`2027-12-31\`):`,
    step3Title: (amount: string, date: string) =>
      `📋 *Karta parametrlari:*\n` +
      `• Qiymati: *${amount} so‘m*\n` +
      `• Amal qilish muddati: *${date}*\n\n` +
      `3️⃣ *3-qadam:* Endi barkod kodlarini yuboring:\n\n` +
      `📝 *Xabar ko‘rinishida* (har bir qatorda bittadan kod):\n` +
      `\`KZ000001\`\n\`KZ000002\`\n\`KZ000003\`\n\n` +
      `📁 *Yoki fayl yuklang:* (.txt, .xlsx, .csv formatida)`,
    fileReading: `📥 Fayl qabul qilindi, barkodlar o‘qilmoqda...`,
    generatingStatus: (processed: number, total: number, pages: number, bar: string, percent: number) =>
      `⏳ *PDF generatsiya qilinmoqda...*\n` +
      `• Kartalar: ${processed}/${total} ta\n` +
      `• Varaqlar: ${pages} ta\n` +
      `• Jarayon: [${bar}] ${percent}%`,
    pdfReady: (cards: number, pages: number, amount: string, date: string) =>
      `✅ *PDF tayyor bo‘ldi!*\n\n` +
      `📊 *Statistika:*\n` +
      `• Kartalar soni: *${cards} ta*\n` +
      `• Varaqlar soni: *${pages} ta*\n` +
      `• Qiymati: *${amount} so‘m*\n` +
      `• Amal qilish muddati: *${date}*\n` +
      `• Varaq o‘lchami: *320 × 450 mm* (21 ta karta/varaq)\n\n` +
      `🖨 *Chop etish uchun to‘liq tayyor!*\n` +
      `Yangi karta yaratish uchun /new ni bosing.\n` +
      `Tilni o‘zgartirish uchun: /lang`,
    help:
      `📖 *Qo‘llanma:*\n\n` +
      `1. /new yoki /start bosing.\n` +
      `2. Karta nominalini tanlang (masalan: 50 000 so'm).\n` +
      `3. Amal qilish muddatini tanlang (masalan: 31.12.2027).\n` +
      `4. Barkodlar ro‘yxatini xabar shaklida yoki .txt / .xlsx / .csv fayl qilib yuboring.\n` +
      `5. Bot bir necha soniyada tayyor PDF faylni sizga yuboradi!\n\n` +
      `• Tilni o‘zgartirish: /lang\n` +
      `• Bekor qilish: /cancel`,
    cancelled: `❌ Jarayon bekor qilindi. Yangisini boshlash uchun /new ni bosing.`,
    noBarcodes: `⚠️ Hech qanday barkod topilmadi. Qaytadan boshlash uchun /new ni bosing.`,
    error: (msg: string) => `❌ Xatolik yuz berdi: ${msg}`
  },
  ru: {
    welcome:
      `🛒 *Добро пожаловать в Генератор Подарочных Карт Korzinka!*\n\n` +
      `Бот быстро создаст высококачественный PDF для печати (*320×450 мм, 21 карта/лист*).\n\n` +
      `1️⃣ *Шаг 1:* Выберите номинал карты или введите сумму:`,
    chooseLangTitle: `🌐 *Пожалуйста, выберите язык / Iltimos, tilni tanlang / Please choose language:*`,
    langChanged: `✅ Язык общения изменен на *Русский*!`,
    customAmountPrompt: `✍️ Пожалуйста, введите номинал карты числом (например: \`75000\` или \`150000\`):`,
    invalidAmount: `⚠️ Пожалуйста, введите корректную сумму (только цифры, например: \`100000\`):`,
    step2Title: (amount: string) =>
      `✅ Номинал карты: *${amount} сум*\n\n` +
      `2️⃣ *Шаг 2:* Выберите срок действия карты:`,
    customExpiryPrompt: `✍️ Пожалуйста, введите дату (например: \`31.12.2027\` или \`2027-12-31\`):`,
    step3Title: (amount: string, date: string) =>
      `📋 *Параметры карты:*\n` +
      `• Номинал: *${amount} сум*\n` +
      `• Срок действия: *${date}*\n\n` +
      `3️⃣ *Шаг 3:* Отправьте список штрихкодов:\n\n` +
      `📝 *Текстом* (по одному коду на строку):\n` +
      `\`KZ000001\`\n\`KZ000002\`\n\`KZ000003\`\n\n` +
      `📁 *Или файлом:* (.txt, .xlsx, .csv)`,
    fileReading: `📥 Файл принят, считываем штрихкоды...`,
    generatingStatus: (processed: number, total: number, pages: number, bar: string, percent: number) =>
      `⏳ *Генерация PDF...*\n` +
      `• Карты: ${processed}/${total} шт.\n` +
      `• Листы: ${pages} шт.\n` +
      `• Прогресс: [${bar}] ${percent}%`,
    pdfReady: (cards: number, pages: number, amount: string, date: string) =>
      `✅ *PDF готов к печати!*\n\n` +
      `📊 *Статистика:*\n` +
      `• Количество карт: *${cards} шт.*\n` +
      `• Количество листов: *${pages} шт.*\n` +
      `• Номинал: *${amount} сум*\n` +
      `• Срок действия: *${date}*\n` +
      `• Размер листа: *320 × 450 мм* (21 карта/лист)\n\n` +
      `🖨 *Полностью готов к печати!*\n` +
      `Для создания новых карт нажмите /new.\n` +
      `Сменить язык: /lang`,
    help:
      `📖 *Инструкция:*\n\n` +
      `1. Отправьте /new или /start.\n` +
      `2. Выберите номинал карты (например: 50 000 сум).\n` +
      `3. Укажите срок действия (например: 31.12.2027).\n` +
      `4. Отправьте список кодов текстом или файлом .txt / .xlsx / .csv.\n` +
      `5. Бот за секунды отправит готовый PDF!\n\n` +
      `• Сменить язык: /lang\n` +
      `• Отмена: /cancel`,
    cancelled: `❌ Процесс отменен. Чтобы начать заново, нажмите /new.`,
    noBarcodes: `⚠️ Штрихкоды не найдены. Для начала заново нажмите /new.`,
    error: (msg: string) => `❌ Произошла ошибка: ${msg}`
  },
  en: {
    welcome:
      `🛒 *Welcome to Korzinka Gift Card Generator!*\n\n` +
      `This bot instantly generates print-ready high-quality PDF sheets (*320×450 mm, 21 cards/sheet*).\n\n` +
      `1️⃣ *Step 1:* Choose card amount or type custom value:`,
    chooseLangTitle: `🌐 *Please choose language / Iltimos, tilni tanlang / Пожалуйста, выберите язык:*`,
    langChanged: `✅ Language changed to *English*!`,
    customAmountPrompt: `✍️ Please enter card amount in numbers (e.g. \`75000\` or \`150000\`):`,
    invalidAmount: `⚠️ Please enter a valid number (e.g. \`100000\`):`,
    step2Title: (amount: string) =>
      `✅ Card Amount: *${amount} UZS*\n\n` +
      `2️⃣ *Step 2:* Choose expiry date:`,
    customExpiryPrompt: `✍️ Please enter expiry date (e.g. \`31.12.2027\` or \`2027-12-31\`):`,
    step3Title: (amount: string, date: string) =>
      `📋 *Card Parameters:*\n` +
      `• Amount: *${amount} UZS*\n` +
      `• Expiry date: *${date}*\n\n` +
      `3️⃣ *Step 3:* Send barcodes list:\n\n` +
      `📝 *As text message* (one code per line):\n` +
      `\`KZ000001\`\n\`KZ000002\`\n\`KZ000003\`\n\n` +
      `📁 *Or upload file:* (.txt, .xlsx, .csv)`,
    fileReading: `📥 File received, parsing barcodes...`,
    generatingStatus: (processed: number, total: number, pages: number, bar: string, percent: number) =>
      `⏳ *Generating PDF...*\n` +
      `• Cards: ${processed}/${total}\n` +
      `• Sheets: ${pages}\n` +
      `• Progress: [${bar}] ${percent}%`,
    pdfReady: (cards: number, pages: number, amount: string, date: string) =>
      `✅ *PDF is ready!*\n\n` +
      `📊 *Statistics:*\n` +
      `• Total cards: *${cards}*\n` +
      `• Total sheets: *${pages}*\n` +
      `• Amount: *${amount} UZS*\n` +
      `• Expiry date: *${date}*\n` +
      `• Sheet dimensions: *320 × 450 mm* (21 cards/sheet)\n\n` +
      `🖨 *Ready for print!*\n` +
      `To generate new cards send /new.\n` +
      `Change language: /lang`,
    help:
      `📖 *Help & Instructions:*\n\n` +
      `1. Send /new or /start.\n` +
      `2. Select card amount.\n` +
      `3. Select expiry date.\n` +
      `4. Upload codes via text or .txt / .xlsx / .csv file.\n` +
      `5. Get your print-ready PDF in seconds!\n\n` +
      `• Change language: /lang\n` +
      `• Cancel: /cancel`,
    cancelled: `❌ Action cancelled. Start new with /new.`,
    noBarcodes: `⚠️ No barcodes found. Start new with /new.`,
    error: (msg: string) => `❌ Error occurred: ${msg}`
  }
};

export function createTelegramBot(token: string) {
  if (!token) {
    console.warn('⚠️ BOT_TOKEN is not provided. Telegram bot will not start.');
    return null;
  }

  const bot = new Bot<MyContext>(token);

  // Initialize session
  bot.use(
    session({
      initial: (): SessionData => ({
        step: 'idle',
        amount: '50000',
        expiryDate: '2027-12-31',
        barcodes: []
      })
    })
  );

  // Helper to get active language texts
  const t = (ctx: MyContext) => botI18n[ctx.session.lang || 'uz'];

  // Language Selection Keyboard
  function getLanguageKeyboard() {
    return new InlineKeyboard()
      .text('🇺🇿 O‘zbekcha', 'setlang_uz')
      .row()
      .text('🇷🇺 Русский', 'setlang_ru')
      .row()
      .text('🇬🇧 English', 'setlang_en');
  }

  // Amount Selection Keyboard
  function getAmountKeyboard(lang: BotLanguage) {
    const currency = lang === 'ru' ? 'сум' : lang === 'en' ? 'UZS' : 'so‘m';
    const customTxt = lang === 'ru' ? '✍️ Другая сумма' : lang === 'en' ? '✍️ Custom amount' : '✍️ Boshqa summa';

    return new InlineKeyboard()
      .text(`50 000 ${currency}`, 'amount_50000')
      .text(`100 000 ${currency}`, 'amount_100000')
      .row()
      .text(`200 000 ${currency}`, 'amount_200000')
      .text(`400 000 ${currency}`, 'amount_400000')
      .row()
      .text(`50 000 ${currency}`, 'amount_500000')
      .text(customTxt, 'amount_custom');
  }

  // Expiry Date Selection Keyboard
  function getExpiryKeyboard(lang: BotLanguage) {
    const defaultTxt = lang === 'ru' ? '📅 31.12.2027 (Стандарт)' : lang === 'en' ? '📅 31.12.2027 (Default)' : '📅 31.12.2027 (Standart)';
    const customTxt = lang === 'ru' ? '✍️ Другая дата' : lang === 'en' ? '✍️ Custom date' : '✍️ Boshqa sana';

    return new InlineKeyboard()
      .text(defaultTxt, 'expiry_2027')
      .row()
      .text('📅 31.12.2026', 'expiry_2026')
      .row()
      .text(customTxt, 'expiry_custom');
  }

  // Start Command
  bot.command('start', async (ctx) => {
    // If language is not selected yet, prompt for language
    if (!ctx.session.lang) {
      ctx.session.step = 'waiting_lang';
      await ctx.reply(botI18n.uz.chooseLangTitle, {
        parse_mode: 'Markdown',
        reply_markup: getLanguageKeyboard()
      });
      return;
    }

    await startNewGeneration(ctx);
  });

  // Language Command
  bot.command(['lang', 'language'], async (ctx) => {
    ctx.session.step = 'waiting_lang';
    await ctx.reply(botI18n[ctx.session.lang || 'uz'].chooseLangTitle, {
      parse_mode: 'Markdown',
      reply_markup: getLanguageKeyboard()
    });
  });

  // Language Selection Callback
  bot.callbackQuery(/^setlang_(\w+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const chosenLang = ctx.match[1] as BotLanguage;
    ctx.session.lang = chosenLang;

    await ctx.reply(t(ctx).langChanged, { parse_mode: 'Markdown' });
    await startNewGeneration(ctx);
  });

  // New Generation Wizard Trigger
  async function startNewGeneration(ctx: MyContext) {
    const lang = ctx.session.lang || 'uz';
    ctx.session.step = 'waiting_amount';
    ctx.session.amount = '50000';
    ctx.session.expiryDate = '2027-12-31';
    ctx.session.barcodes = [];

    await ctx.reply(t(ctx).welcome, {
      parse_mode: 'Markdown',
      reply_markup: getAmountKeyboard(lang)
    });
  }

  bot.command('new', async (ctx) => {
    if (!ctx.session.lang) ctx.session.lang = 'uz';
    await startNewGeneration(ctx);
  });

  // Help Command
  bot.command('help', async (ctx) => {
    await ctx.reply(t(ctx).help, { parse_mode: 'Markdown' });
  });

  // Cancel Command
  bot.command('cancel', async (ctx) => {
    ctx.session.step = 'idle';
    await ctx.reply(t(ctx).cancelled);
  });

  // Amount Inline Button Callbacks
  bot.callbackQuery(/^amount_(\w+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const val = ctx.match[1];

    if (val === 'custom') {
      ctx.session.step = 'waiting_amount';
      await ctx.reply(t(ctx).customAmountPrompt, { parse_mode: 'Markdown' });
      return;
    }

    ctx.session.amount = val;
    await promptExpiryDate(ctx);
  });

  // Expiry Date Inline Button Callbacks
  bot.callbackQuery(/^expiry_(\w+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const val = ctx.match[1];

    if (val === '2027') {
      ctx.session.expiryDate = '2027-12-31';
    } else if (val === '2026') {
      ctx.session.expiryDate = '2026-12-31';
    } else if (val === 'custom') {
      ctx.session.step = 'waiting_expiry';
      await ctx.reply(t(ctx).customExpiryPrompt, { parse_mode: 'Markdown' });
      return;
    }

    await promptBarcodes(ctx);
  });

  // Helper: Prompt for expiry date
  async function promptExpiryDate(ctx: MyContext) {
    ctx.session.step = 'waiting_expiry';
    const lang = ctx.session.lang || 'uz';
    const formattedAmount = PdfGenerator.formatNumber(ctx.session.amount);

    await ctx.reply(t(ctx).step2Title(formattedAmount), {
      parse_mode: 'Markdown',
      reply_markup: getExpiryKeyboard(lang)
    });
  }

  // Helper: Prompt for barcodes
  async function promptBarcodes(ctx: MyContext) {
    ctx.session.step = 'waiting_barcodes';
    const formattedAmount = PdfGenerator.formatNumber(ctx.session.amount);

    await ctx.reply(t(ctx).step3Title(formattedAmount, ctx.session.expiryDate), {
      parse_mode: 'Markdown'
    });
  }

  // Helper: Process and send PDF
  async function generateAndSendPdf(ctx: MyContext, barcodes: string[]) {
    if (barcodes.length === 0) {
      await ctx.reply(t(ctx).noBarcodes);
      return;
    }

    ctx.session.step = 'generating';
    const cardsCount = barcodes.length;
    const cardsPerPage = 21;
    const pagesCount = Math.ceil(cardsCount / cardsPerPage);
    const formattedAmount = PdfGenerator.formatNumber(ctx.session.amount);

    const initialBar = '░'.repeat(10);
    const statusMsg = await ctx.reply(
      t(ctx).generatingStatus(0, cardsCount, pagesCount, initialBar, 0),
      { parse_mode: 'Markdown' }
    );

    let lastPercent = 0;
    let lastUpdate = Date.now();

    try {
      const pdfBuffer = await PdfGenerator.generatePdf({
        amount: ctx.session.amount,
        expiryDate: ctx.session.expiryDate,
        barcodes,
        onProgress: async (processed, total, percent) => {
          const now = Date.now();
          if (now - lastUpdate > 800 || percent === 100 || percent - lastPercent >= 20) {
            lastUpdate = now;
            lastPercent = percent;
            const filledBlocks = Math.round(percent / 10);
            const emptyBlocks = 10 - filledBlocks;
            const bar = '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);

            try {
              await ctx.api.editMessageText(
                ctx.chat!.id,
                statusMsg.message_id,
                t(ctx).generatingStatus(processed, total, pagesCount, bar, percent),
                { parse_mode: 'Markdown' }
              );
            } catch (_) {
              // Ignore telegram rate limit edit warnings
            }
          }
        }
      });

      // Delete status message
      try {
        await ctx.api.deleteMessage(ctx.chat!.id, statusMsg.message_id);
      } catch (_) {}

      // Send PDF Document
      await ctx.replyWithDocument(
        new InputFile(pdfBuffer, `korzinka-gift-cards-${cardsCount}cards.pdf`),
        {
          caption: t(ctx).pdfReady(cardsCount, pagesCount, formattedAmount, ctx.session.expiryDate),
          parse_mode: 'Markdown'
        }
      );

      ctx.session.step = 'idle';
    } catch (error: any) {
      console.error('Bot PDF generation error:', error);
      await ctx.reply(t(ctx).error(error.message || 'PDF generation error'));
      ctx.session.step = 'idle';
    }
  }

  // Handle uploaded document/file
  bot.on('message:document', async (ctx) => {
    const doc = ctx.message.document;
    if (!doc) return;

    try {
      await ctx.reply(t(ctx).fileReading);
      const file = await ctx.api.getFile(doc.file_id);
      const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

      const response = await fetch(fileUrl);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const barcodes = BarcodeParser.fromBuffer(buffer, doc.file_name || 'barcodes.txt');
      await generateAndSendPdf(ctx, barcodes);
    } catch (e: any) {
      console.error('File download error:', e);
      await ctx.reply(t(ctx).error(e.message));
    }
  });

  // Handle text messages
  bot.on('message:text', async (ctx) => {
    const text = ctx.message.text.trim();
    if (text.startsWith('/')) return;

    if (ctx.session.step === 'waiting_amount') {
      const numeric = text.replace(/\D/g, '');
      if (!numeric) {
        await ctx.reply(t(ctx).invalidAmount, { parse_mode: 'Markdown' });
        return;
      }
      ctx.session.amount = numeric;
      await promptExpiryDate(ctx);
      return;
    }

    if (ctx.session.step === 'waiting_expiry') {
      ctx.session.expiryDate = text;
      await promptBarcodes(ctx);
      return;
    }

    if (ctx.session.step === 'waiting_barcodes' || ctx.session.step === 'idle') {
      const barcodes = BarcodeParser.fromText(text);
      if (barcodes.length > 0) {
        await generateAndSendPdf(ctx, barcodes);
      } else {
        await ctx.reply(t(ctx).noBarcodes);
      }
    }
  });

  return bot;
}
