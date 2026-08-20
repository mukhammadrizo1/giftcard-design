import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import bwipjs from 'bwip-js';
import { config } from '../config.js';

const MM_TO_PT = 2.834645669291339;
const mm = (val: number) => val * MM_TO_PT;

async function testPdfVisual() {
  const doc = new PDFDocument({
    size: [mm(config.paper.widthMm), mm(config.paper.heightMm)],
    margin: 0,
    compress: true
  });

  const regularFontPath = path.join(config.fontsDir, 'Korzinka-Regular.otf');
  const boldFontPath = path.join(config.fontsDir, 'Korzinka-Bold.otf');

  doc.registerFont('Korzinka-Regular', regularFontPath);
  doc.registerFont('Korzinka-Bold', boldFontPath);

  // Background
  doc.rect(0, 0, mm(320), mm(450)).fill('#FFFFFF');

  // Let's generate 3 cards on the top row to compare
  const startX = mm(17.5);
  const startY = mm(18.0);
  const outerW = mm(95);
  const outerH = mm(59);
  const gapX = mm(0.5);
  const cardW = mm(86);
  const cardH = mm(54);
  const radius = mm(4);
  const offsetX = (outerW - cardW) / 2;
  const offsetY = (outerH - cardH) / 2;

  const testCodes = ['KZ000001', 'KZ000002', 'KZ000003'];

  for (let col = 0; col < 3; col++) {
    const cardX = startX + col * (outerW + gapX) + offsetX;
    const cardY = startY + offsetY;
    const barcodeValue = testCodes[col];

    // Card background (Clean white)
    doc.save()
      .roundedRect(cardX, cardY, cardW, cardH, radius)
      .fillColor('#FFFFFF')
      .fill()
      .restore();

    // Content area (4.0mm padding)
    const padLeft = mm(4.0);
    const padTop = mm(2.8);
    const contentW = cardW - mm(8.0); // 78mm
    const leftX = cardX + padLeft;

    // 1. Barcode - Natural compact width (28mm x 8.0mm)
    const barcodePng = await new Promise<Buffer>((resolve, reject) => {
      bwipjs.toBuffer(
        {
          bcid: 'code128',
          text: barcodeValue,
          scale: 4,
          height: 8.5,
          includetext: false
        },
        (err, png) => {
          if (err) reject(err);
          else resolve(png);
        }
      );
    });

    const barW = mm(28.0);
    const barH = mm(8.0);
    const barX = leftX + (contentW - barW) / 2;
    const barY = cardY + padTop;

    doc.image(barcodePng, barX, barY, { width: barW, height: barH });

    // Barcode text below bars (Clean, elegant, tightly matched to barcode width)
    const textY = barY + barH + mm(0.6);
    doc.font('Helvetica')
      .fontSize(6.8)
      .fillColor('#000000')
      .text(barcodeValue, barX - mm(2), textY, {
        width: barW + mm(4),
        align: 'center',
        characterSpacing: 0.3,
        lineBreak: false
      });

    // 2. Uzbek section
    const uzTitleY = textY + mm(3.4);
    doc.font('Korzinka-Bold')
      .fontSize(7.2)
      .fillColor('#000000')
      .text('Karta qiymati — 50 000 so‘m', leftX, uzTitleY, {
        width: contentW,
        lineGap: 0.2
      });

    const uzDesc = `Karta Korzinka supermarketlar tarmog‘ida amal qiladi. Xaridlarga to‘lov
sovg‘a kartasidan amalga oshirilganda, Korzinka kartasiga bonuslar
o‘tkazilmaydi. Karta 2027-yilning 31-dekabrigacha amal qiladi.
Karta “Anglesey Food” MChJ XK xususiy mulki sanaladi.
Ushbu kartani avaylab saqlang.
Yo‘qotilgan taqdirda, uni qayta tiklab bera olmaymiz.`;

    const uzBodyY = uzTitleY + mm(3.0);
    doc.font('Korzinka-Regular')
      .fontSize(5.1)
      .fillColor('#000000')
      .text(uzDesc, leftX, uzBodyY, {
        width: contentW,
        lineGap: 0.5
      });

    const uzHeight = doc.heightOfString(uzDesc, { width: contentW, lineGap: 0.5 });

    // 3. Russian section
    const ruTitleY = uzBodyY + uzHeight + mm(1.3);
    doc.font('Korzinka-Bold')
      .fontSize(7.2)
      .fillColor('#000000')
      .text('Номинал карты — 50 000 сум', leftX, ruTitleY, {
        width: contentW,
        lineGap: 0.2
      });

    const ruDesc = `Карта принимается в сети супермаркетов «Корзинка». При оплате покупок
подарочной картой, бонусы на накопительную карту не начисляются.
Карта действительна до 31 декабря 2027 г.
Карта является собственностью ИП ООО «Anglesey Food».
Храните эту карту бережно. В случае утери мы не сможем ее восстановить.`;

    const ruBodyY = ruTitleY + mm(3.0);
    doc.font('Korzinka-Regular')
      .fontSize(5.1)
      .fillColor('#000000')
      .text(ruDesc, leftX, ruBodyY, {
        width: contentW,
        lineGap: 0.5
      });

    // 4. Footer section (Bottom aligned)
    const footerY = cardY + cardH - mm(3.6);
    const iconSize = mm(2.0);

    // Social Icons
    const fbScale = iconSize / 512;
    doc.save()
      .translate(leftX, footerY - 0.4)
      .scale(fbScale)
      .path('M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z')
      .fill('#000000')
      .restore();

    const igScale = iconSize / 512;
    doc.save()
      .translate(leftX + iconSize * 0.95, footerY - 0.4)
      .scale(igScale)
      .path('M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z')
      .fill('#000000')
      .restore();

    const tgScale = iconSize / 512;
    doc.save()
      .translate(leftX + iconSize * 2.0, footerY - 0.4)
      .scale(tgScale)
      .path('M248 8C111 8 0 119 0 256s111 248 248 248 248-111 248-248S385 8 248 8zm115 169l-38 178c-3 14-11 17-23 11l-59-44-28 27c-3 3-6 6-12 6l4-59 108-98c5-4-1-6-7-2l-133 84-57-18c-12-4-12-12 3-18l224-86c10-4 19 3 15 15z')
      .fill('#000000')
      .restore();

    // Social handle
    const handleX = leftX + iconSize * 3.3;
    doc.font('Korzinka-Regular')
      .fontSize(5.2)
      .fillColor('#000000')
      .text('@korzinkauz', handleX, footerY, { lineBreak: false });

    // Website (Center)
    doc.font('Korzinka-Regular')
      .fontSize(5.2)
      .fillColor('#000000')
      .text('www.korzinka.uz', leftX, footerY, {
        width: contentW,
        align: 'center',
        lineBreak: false
      });

    // Phone (Right)
    doc.font('Korzinka-Regular')
      .fontSize(5.2)
      .fillColor('#000000')
      .text('+998 78 140 14 14', leftX, footerY, {
        width: contentW,
        align: 'right',
        lineBreak: false
      });
  }

  const chunks: Buffer[] = [];
  doc.on('data', (c) => chunks.push(c));
  doc.end();

  await new Promise((resolve) => doc.on('end', resolve));
  const buf = Buffer.concat(chunks);
  fs.writeFileSync(path.join(process.cwd(), 'temp', 'visual_test.pdf'), buf);
  console.log('Visual test PDF generated at temp/visual_test.pdf');
}

testPdfVisual().catch(console.error);
