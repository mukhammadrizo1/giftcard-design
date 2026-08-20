import PDFDocument from 'pdfkit';
import bwipjs from 'bwip-js';
import path from 'path';
import fs from 'fs';
import { config } from '../config.js';

export interface GiftCardOptions {
  amount: number | string;
  expiryDate: string; // YYYY-MM-DD or DD.MM.YYYY
  barcodes: string[];
  onProgress?: (processed: number, total: number, percent: number) => void;
}

export interface FormattedTexts {
  amountUz: string;
  amountRu: string;
  titleUz: string;
  titleRu: string;
  descUz: string;
  descRu: string;
  socialHandle: string;
  website: string;
  phone: string;
}

const MM_TO_PT = 2.834645669291339;
const mm = (val: number) => val * MM_TO_PT;

export class PdfGenerator {
  /**
   * Format number with spaces (e.g. 50000 -> 50 000)
   */
  static formatNumber(val: number | string): string {
    const num = String(val).replace(/\D/g, '');
    if (!num) return '50 000';
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  /**
   * Format date into Uzbek and Russian text snippets
   */
  static formatExpiryDate(dateStr: string): { dateUz: string; dateRu: string } {
    let year = 2027;
    let month = 11; // 0-indexed (11 = December)
    let day = 31;

    if (dateStr) {
      if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          year = parseInt(parts[0], 10) || 2027;
          month = (parseInt(parts[1], 10) || 12) - 1;
          day = parseInt(parts[2], 10) || 31;
        }
      } else if (dateStr.includes('.')) {
        const parts = dateStr.split('.');
        if (parts.length === 3) {
          day = parseInt(parts[0], 10) || 31;
          month = (parseInt(parts[1], 10) || 12) - 1;
          year = parseInt(parts[2], 10) || 2027;
        }
      }
    }

    const monthsUz = [
      'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
      'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'
    ];
    const monthsRu = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];

    const safeMonth = Math.max(0, Math.min(11, month));
    const monthUz = monthsUz[safeMonth];
    const monthRu = monthsRu[safeMonth];

    return {
      dateUz: `${year}-yilning ${day}-${monthUz}gacha`,
      dateRu: `${day} ${monthRu} ${year} г.`
    };
  }

  /**
   * Get formatted texts for card matching exact design layout
   */
  static getCardTexts(amount: number | string, expiryDate: string): FormattedTexts {
    const formattedAmount = this.formatNumber(amount);
    const { dateUz, dateRu } = this.formatExpiryDate(expiryDate);

    return {
      amountUz: `${formattedAmount} so‘m`,
      amountRu: `${formattedAmount} сум`,
      titleUz: `Karta qiymati — ${formattedAmount} so‘m`,
      titleRu: `Номинал карты — ${formattedAmount} сум`,
      descUz: `Karta Korzinka supermarketlar tarmog‘ida amal qiladi. Xaridlarga to‘lov\nsovg‘a kartasidan amalga oshirilganda, Korzinka kartasiga bonuslar\no‘tkazilmaydi. Karta ${dateUz} amal qiladi.\nKarta “Anglesey Food” MChJ XK xususiy mulki sanaladi.\nUshbu kartani avaylab saqlang.\nYo‘qotilgan taqdirda, uni qayta tiklab bera olmaymiz.`,
      descRu: `Карта принимается в сети супермаркетов «Корзинка». При оплате покупок\nподарочной картой, бонусы на накопительную карту не начисляются.\nКарта действительна до ${dateRu}\nКарта является собственностью ИП ООО «Anglesey Food».\nХраните эту карту бережно. В случае утери мы не сможем ее восстановить.`,
      socialHandle: '@korzinkauz',
      website: 'www.korzinka.uz',
      phone: '+998 78 140 14 14'
    };
  }

  /**
   * Generate pure vector barcode PNG buffer without embedded text (text is drawn cleanly in PDFKit)
   */
  static async generateBarcodeImage(barcodeValue: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      bwipjs.toBuffer(
        {
          bcid: 'code128',
          text: barcodeValue,
          scale: 4,
          height: 6.5,
          includetext: false
        },
        (err, png) => {
          if (err) reject(err);
          else resolve(png);
        }
      );
    });
  }

  /**
   * Draw social icons (Facebook, Instagram, Telegram) using vector SVG paths
   */
  static drawSocialIcons(doc: PDFKit.PDFDocument, x: number, y: number, sizePt: number = 5.2) {
    // Facebook
    const fbScale = sizePt / 512;
    doc.save()
      .translate(x, y)
      .scale(fbScale)
      .path('M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z')
      .fill('#000000')
      .restore();

    // Instagram
    const igScale = sizePt / 512;
    doc.save()
      .translate(x + sizePt * 0.95, y)
      .scale(igScale)
      .path('M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z')
      .fill('#000000')
      .restore();

    // Telegram
    const tgScale = sizePt / 512;
    doc.save()
      .translate(x + sizePt * 2.0, y)
      .scale(tgScale)
      .path('M248,8C111.033,8,0,119.033,0,256S111.033,504,248,504,496,392.967,496,256,384.967,8,248,8ZM362.952,176.66c-3.732,39.215-19.881,134.378-28.1,178.3-3.476,18.584-10.322,24.816-16.948,25.425-14.4,1.326-25.338-9.517-39.287-18.661-21.827-14.308-34.158-23.215-55.346-37.177-24.485-16.135-8.612-25,5.342-39.5,3.652-3.793,67.107-61.51,68.335-66.746.153-.655.3-3.1-1.154-4.384s-3.59-.849-5.135-.5q-3.283.746-104.608,69.142-14.845,10.194-26.894,9.934c-8.855-.191-25.888-5.006-38.551-9.123-15.531-5.048-27.875-7.717-26.8-16.291q.84-6.7,18.45-13.7,108.446-47.248,144.628-62.3c68.872-28.647,83.183-33.623,92.511-33.789,2.052-.034,6.639.474,9.61,2.885a10.452,10.452,0,0,1,3.53,6.716A43.765,43.765,0,0,1,362.952,176.66Z')
      .fill('#000000')
      .restore();
  }

  /**
   * Draw a single card at exact (cardX, cardY) in points matching Website UI & Design mockup
   */
  static async drawCard(
    doc: PDFKit.PDFDocument,
    cardX: number,
    cardY: number,
    barcodeValue: string,
    texts: FormattedTexts
  ) {
    const cardWidthPt = mm(config.paper.cardWidthMm); // 86mm
    const cardHeightPt = mm(config.paper.cardHeightMm); // 54mm
    const radiusPt = mm(config.paper.borderRadiusMm); // 4mm

    // Draw card background (Clean white, no printed border stroke)
    doc.save()
      .roundedRect(cardX, cardY, cardWidthPt, cardHeightPt, radiusPt)
      .fillColor('#FFFFFF')
      .fill()
      .restore();

    // Exact margins: 4.0mm left & right (content width = 78mm = 86 - 8mm)
    const padTopPt = mm(2.8);
    const padLeftPt = mm(4.0);
    const contentWidthPt = cardWidthPt - mm(8.0); // 78mm
    const contentLeftX = cardX + padLeftPt;

    // 1. Barcode Section (Compact, natural proportions matching original app)
    const barWidthPt = mm(28.0);
    const barHeightPt = mm(8.0);
    const barX = contentLeftX + (contentWidthPt - barWidthPt) / 2;
    const barY = cardY + padTopPt;

    try {
      const barcodePng = await this.generateBarcodeImage(barcodeValue);
      doc.image(barcodePng, barX, barY, {
        width: barWidthPt,
        height: barHeightPt
      });
    } catch (e) {
      console.error(`Failed to generate barcode for ${barcodeValue}:`, e);
    }

    // Barcode text below bars (Clean, elegant, tightly matched to barcode width)
    const textY = barY + barHeightPt + mm(0.6);
    doc.font('Helvetica')
      .fontSize(6.8)
      .fillColor('#000000')
      .text(barcodeValue, barX - mm(2), textY, {
        width: barWidthPt + mm(4),
        align: 'center',
        characterSpacing: 0.3,
        lineBreak: false
      });

    // 2. Uzbek Section
    const uzTitleY = textY + mm(3.4);

    // Title Uzbek
    doc.font('Korzinka-Bold')
      .fontSize(7.2)
      .fillColor('#000000')
      .text(texts.titleUz, contentLeftX, uzTitleY, {
        width: contentWidthPt,
        lineGap: 0.2
      });

    // Body Uzbek
    const uzBodyY = uzTitleY + mm(3.0);
    doc.font('Korzinka-Regular')
      .fontSize(5.1)
      .fillColor('#000000')
      .text(texts.descUz, contentLeftX, uzBodyY, {
        width: contentWidthPt,
        lineGap: 0.5
      });

    const uzHeight = doc.heightOfString(texts.descUz, { width: contentWidthPt, lineGap: 0.5 });

    // 3. Russian Section
    const ruTitleY = uzBodyY + uzHeight + mm(1.3);

    // Title Russian
    doc.font('Korzinka-Bold')
      .fontSize(7.2)
      .fillColor('#000000')
      .text(texts.titleRu, contentLeftX, ruTitleY, {
        width: contentWidthPt,
        lineGap: 0.2
      });

    // Body Russian
    const ruBodyY = ruTitleY + mm(3.0);
    doc.font('Korzinka-Regular')
      .fontSize(5.1)
      .fillColor('#000000')
      .text(texts.descRu, contentLeftX, ruBodyY, {
        width: contentWidthPt,
        lineGap: 0.5
      });

    // 4. Footer Section (Bottom aligned)
    const footerY = cardY + cardHeightPt - mm(3.6);
    const iconSizePt = mm(2.0);

    // Social icons
    this.drawSocialIcons(doc, contentLeftX, footerY - 0.4, iconSizePt);

    // Social Handle
    const handleX = contentLeftX + iconSizePt * 3.3;
    doc.font('Korzinka-Regular')
      .fontSize(5.2)
      .fillColor('#000000')
      .text(texts.socialHandle, handleX, footerY, {
        lineBreak: false
      });

    // Website (Centered)
    doc.font('Korzinka-Regular')
      .fontSize(5.2)
      .fillColor('#000000')
      .text(texts.website, contentLeftX, footerY, {
        width: contentWidthPt,
        align: 'center',
        lineBreak: false
      });

    // Phone (Right aligned)
    doc.font('Korzinka-Regular')
      .fontSize(5.2)
      .fillColor('#000000')
      .text(texts.phone, contentLeftX, footerY, {
        width: contentWidthPt,
        align: 'right',
        lineBreak: false
      });
  }

  /**
   * Generate Full PDF Document Buffer
   */
  static async generatePdf(options: GiftCardOptions): Promise<Buffer> {
    const barcodes = options.barcodes && options.barcodes.length > 0
      ? options.barcodes
      : ['V0'];

    const texts = this.getCardTexts(options.amount, options.expiryDate);

    const paperWidthPt = mm(config.paper.widthMm);
    const paperHeightPt = mm(config.paper.heightMm);
    const cardsPerPage = config.paper.columns * config.paper.rows; // 21
    const totalPages = Math.ceil(barcodes.length / cardsPerPage);

    const doc = new PDFDocument({
      size: [paperWidthPt, paperHeightPt],
      margin: 0,
      compress: true,
      autoFirstPage: false,
      info: {
        Title: 'Korzinka Gift Cards',
        Author: 'Korzinka Designer Service',
        Subject: 'Print-ready gift card sheets'
      }
    });

    // Register Korzinka fonts
    const regularFontPath = path.join(config.fontsDir, 'Korzinka-Regular.otf');
    const boldFontPath = path.join(config.fontsDir, 'Korzinka-Bold.otf');
    const lightFontPath = path.join(config.fontsDir, 'Korzinka-Light.otf');

    if (fs.existsSync(regularFontPath)) {
      doc.registerFont('Korzinka-Regular', regularFontPath);
    } else {
      doc.registerFont('Korzinka-Regular', 'Helvetica');
    }

    if (fs.existsSync(boldFontPath)) {
      doc.registerFont('Korzinka-Bold', boldFontPath);
    } else {
      doc.registerFont('Korzinka-Bold', 'Helvetica-Bold');
    }

    if (fs.existsSync(lightFontPath)) {
      doc.registerFont('Korzinka-Light', lightFontPath);
    } else {
      doc.registerFont('Korzinka-Light', 'Helvetica');
    }

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    const outerWidthPt = mm(config.paper.outerCardWidthMm);
    const outerHeightPt = mm(config.paper.outerCardHeightMm);
    const cardWidthPt = mm(config.paper.cardWidthMm);
    const cardHeightPt = mm(config.paper.cardHeightMm);
    const gapXPt = mm(config.paper.horizontalGapMm);
    const gapYPt = mm(config.paper.verticalGapMm);
    const marginLeftPt = mm(config.paper.marginLeftMm);
    const marginTopPt = mm(config.paper.marginTopMm);

    // Offset of card inside outer container to center it
    const innerOffsetX = (outerWidthPt - cardWidthPt) / 2;
    const innerOffsetY = (outerHeightPt - cardHeightPt) / 2;

    let processedCount = 0;

    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
      doc.addPage({
        size: [paperWidthPt, paperHeightPt],
        margin: 0
      });

      // Background of paper (White)
      doc.rect(0, 0, paperWidthPt, paperHeightPt).fill('#FFFFFF');

      const startIdx = pageIdx * cardsPerPage;
      const pageBarcodes = barcodes.slice(startIdx, startIdx + cardsPerPage);

      for (let i = 0; i < pageBarcodes.length; i++) {
        const barcode = pageBarcodes[i];
        const col = i % config.paper.columns;
        const row = Math.floor(i / config.paper.columns);

        const outerX = marginLeftPt + col * (outerWidthPt + gapXPt);
        const outerY = marginTopPt + row * (outerHeightPt + gapYPt);

        const cardX = outerX + innerOffsetX;
        const cardY = outerY + innerOffsetY;

        await this.drawCard(doc, cardX, cardY, barcode, texts);

        processedCount++;
        if (options.onProgress) {
          const percent = Math.round((processedCount / barcodes.length) * 100);
          options.onProgress(processedCount, barcodes.length, percent);
        }
      }
    }

    doc.end();

    return new Promise((resolve, reject) => {
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      doc.on('error', reject);
    });
  }
}
