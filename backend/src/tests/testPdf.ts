import fs from 'fs';
import path from 'path';
import { PdfGenerator } from '../services/pdfGenerator.js';

async function runTest() {
  console.log('Testing PDF Generation...');
  const startTime = Date.now();

  // 42 cards = 2 full pages of 21 cards
  const barcodes = Array.from({ length: 42 }, (_, i) => `KZ${String(i + 1).padStart(6, '0')}`);

  const pdfBuffer = await PdfGenerator.generatePdf({
    amount: '50000',
    expiryDate: '2027-12-31',
    barcodes,
    onProgress: (processed, total, percent) => {
      console.log(`Progress: ${processed}/${total} (${percent}%)`);
    }
  });

  const outputDir = path.join(process.cwd(), 'temp');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'test_output.pdf');
  fs.writeFileSync(outputPath, pdfBuffer);

  const duration = Date.now() - startTime;
  console.log(`✅ Success! Generated ${barcodes.length} cards in ${duration}ms.`);
  console.log(`📁 PDF saved to ${outputPath} (Size: ${(pdfBuffer.length / 1024).toFixed(2)} KB)`);
}

runTest().catch((err) => {
  console.error('❌ PDF Test failed:', err);
  process.exit(1);
});
