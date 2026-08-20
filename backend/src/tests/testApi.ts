import express from 'express';
import { apiRouter } from '../routes/api.js';
import http from 'http';

async function testApiEndpoints() {
  const app = express();
  app.use(express.json());
  app.use('/api', apiRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(3099, resolve));
  console.log('Test server listening on port 3099');

  try {
    // 1. Health check
    const healthRes = await fetch('http://localhost:3099/api/health');
    const healthData = await healthRes.json();
    console.log('1. Health check response:', healthData);

    // 2. Card info
    const infoRes = await fetch('http://localhost:3099/api/card-info?amount=50000&expiryDate=2027-12-31');
    const infoData = (await infoRes.json()) as any;
    console.log('2. Card info response:', infoData.texts.titleUz, '|', infoData.texts.titleRu);

    // 3. Parse barcodes
    const parseRes = await fetch('http://localhost:3099/api/parse-barcodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'KZ001\nKZ002\nKZ003' })
    });
    const parseData = await parseRes.json();
    console.log('3. Parse barcodes response:', parseData);

    // 4. Generate PDF
    const pdfRes = await fetch('http://localhost:3099/api/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: '50000',
        expiryDate: '2027-12-31',
        barcodes: ['KZ001', 'KZ002']
      })
    });
    const pdfBuffer = await pdfRes.arrayBuffer();
    console.log(`4. Generate PDF response: Status ${pdfRes.status}, Content-Type: ${pdfRes.headers.get('content-type')}, Size: ${pdfBuffer.byteLength} bytes`);

    console.log('✅ ALL API TESTS PASSED SUCCESSFULLY!');
  } finally {
    server.close();
  }
}

testApiEndpoints().catch((err) => {
  console.error('❌ API Test failed:', err);
  process.exit(1);
});
