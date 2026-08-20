import { Router, Request, Response } from 'express';
import multer from 'multer';
import { PdfGenerator } from '../services/pdfGenerator.js';
import { BarcodeParser } from '../services/barcodeParser.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB limit
});

export const apiRouter = Router();

/**
 * Health check endpoint
 */
apiRouter.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * Get formatted card text and metadata for a given amount and expiry date
 */
apiRouter.get('/card-info', (req: Request, res: Response) => {
  const amount = (req.query.amount as string) || '50000';
  const expiryDate = (req.query.expiryDate as string) || '2027-12-31';

  const texts = PdfGenerator.getCardTexts(amount, expiryDate);
  res.json({ success: true, amount, expiryDate, texts });
});

/**
 * Parse barcodes from text or uploaded file
 */
apiRouter.post('/parse-barcodes', upload.single('file'), (req: Request, res: Response) => {
  try {
    let barcodes: string[] = [];

    if (req.file) {
      barcodes = BarcodeParser.fromBuffer(req.file.buffer, req.file.originalname);
    } else if (req.body.text) {
      barcodes = BarcodeParser.fromText(req.body.text);
    }

    if (barcodes.length === 0) {
      barcodes = ['V0'];
    }

    const cardsPerPage = 21;
    const pages = Math.ceil(barcodes.length / cardsPerPage);

    res.json({
      success: true,
      total: barcodes.length,
      pages,
      cardsPerPage,
      barcodes
    });
  } catch (error: any) {
    console.error('Error parsing barcodes:', error);
    res.status(400).json({ success: false, error: error.message || 'Failed to parse barcodes' });
  }
});

/**
 * Generate PDF endpoint
 */
apiRouter.post('/generate-pdf', upload.single('file'), async (req: Request, res: Response) => {
  try {
    let amount = req.body.amount || '50000';
    let expiryDate = req.body.expiryDate || '2027-12-31';
    let barcodes: string[] = [];

    // Check if file was uploaded
    if (req.file) {
      barcodes = BarcodeParser.fromBuffer(req.file.buffer, req.file.originalname);
    } else if (req.body.barcodes) {
      if (Array.isArray(req.body.barcodes)) {
        barcodes = req.body.barcodes;
      } else if (typeof req.body.barcodes === 'string') {
        barcodes = BarcodeParser.fromText(req.body.barcodes);
      }
    } else if (req.body.barcodesList) {
      barcodes = BarcodeParser.fromText(req.body.barcodesList);
    }

    if (!barcodes || barcodes.length === 0) {
      barcodes = ['V0'];
    }

    console.log(`[API] Generating PDF: ${barcodes.length} cards, Amount: ${amount}, Expiry: ${expiryDate}`);
    const startTime = Date.now();

    const pdfBuffer = await PdfGenerator.generatePdf({
      amount,
      expiryDate,
      barcodes
    });

    const duration = Date.now() - startTime;
    console.log(`[API] PDF generated in ${duration}ms, size: ${pdfBuffer.length} bytes`);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="korzinka-gift-cards.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('[API] PDF generation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate PDF'
    });
  }
});
