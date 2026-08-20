# Korzinka Gift Card Designer & Vector PDF Generator

High-performance, decoupled gift card print layout generator and Telegram Bot for Korzinka supermarket gift cards.

---

## 🚀 Key Features

* **⚡ Ultra-Fast Server-Side Vector PDF Engine**:
  * Pure vector PDF generation via `PDFKit` + `bwip-js`.
  * Embedded official `Korzinka` OpenType fonts (`Korzinka-Bold.otf`, `Korzinka-Regular.otf`, `Korzinka-Light.otf`).
  * Generates 100+ cards in less than **150 milliseconds** (100x faster and 50x smaller file size than client-side `html2canvas` rasterization).
  * Exact print dimensions: `320mm × 450mm` sheets, `3×7` grid (21 cards/sheet), `86mm × 54mm` card die-cuts.
* **🤖 Integrated Telegram Bot (`grammY`)**:
  * Step-by-step interactive wizard (Amount -> Expiry Date -> Barcodes).
  * Direct file upload support (`.txt`, `.xlsx`, `.csv`).
  * Live percentage progress updates in chat message (`[██████░░░░] 60%`).
  * Direct delivery of print-ready `.pdf` documents.
* **🎨 Modern Web Application (`frontend/`)**:
  * Vite + TypeScript for instant live browser preview.
  * Real-time typography and barcode preview with page switcher and responsive zoom.
  * Drag & drop barcode importer with Excel spreadsheet parsing.
* **🌐 100% Free Cloud Deployment**:
  * Ready to deploy on Render.com, Railway, Vercel, or Docker.
  * Complete Uzbek deployment guide in [`DEPLOYMENT_UZ.md`](./DEPLOYMENT_UZ.md).

---

## 📁 Project Structure

```
giftcard-design/
├── backend/                  # Node.js + TypeScript Express API & Telegram Bot
│   ├── src/
│   │   ├── bot/              # GrammY Telegram bot wizard & file receiver
│   │   ├── services/
│   │   │   ├── pdfGenerator.ts   # High-precision vector PDF rendering engine
│   │   │   └── barcodeParser.ts  # Multi-format barcode parser (.txt, .csv, .xlsx)
│   │   ├── routes/           # REST API endpoints (/api/generate-pdf, /api/health)
│   │   ├── assets/fonts/     # Embedded Korzinka OTF fonts
│   │   └── index.ts          # Server entry point
│   └── package.json
├── frontend/                 # Vite + TypeScript Web Application
│   ├── src/
│   │   ├── styles/main.css   # Korzinka design system, glassmorphism & print CSS
│   │   ├── main.ts           # Interactive live preview, pagination & PDF download
│   │   └── assets/fonts/
│   ├── index.html
│   └── vite.config.ts
├── DEPLOYMENT_UZ.md          # Bepul serverlarga joylashtirish bo'yicha to'liq qo'llanma (O'zbek tilida)
├── Dockerfile                # Multi-stage production container
├── docker-compose.yml        # Docker compose orchestration
└── package.json              # Monorepo scripts
```

---

## 🛠 Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm install
npm run build
```

### 2. Configure Environment
Copy `.env.example` to `backend/.env`:
```bash
cp backend/.env.example backend/.env
```
Add your `BOT_TOKEN` from [@BotFather](https://t.me/BotFather) if you want to test the Telegram bot.

### 3. Run Both Services
```bash
npm run dev
```

* **Frontend:** [http://localhost:5173](http://localhost:5173)
* **Backend API:** [http://localhost:3000](http://localhost:3000)

---

## 📡 REST API Documentation

### `POST /api/generate-pdf`
Generates and streams a vector PDF file.

* **Headers:** `Content-Type: application/json` or `multipart/form-data`
* **JSON Body:**
  ```json
  {
    "amount": "50000",
    "expiryDate": "2027-12-31",
    "barcodes": ["KZ000001", "KZ000002", "KZ000003"]
  }
  ```
* **Multipart Form:** `file` (Excel/CSV/Text) + `amount` + `expiryDate`.
* **Response:** Binary stream with `Content-Type: application/pdf`.

### `POST /api/parse-barcodes`
Parses barcodes from uploaded file or text and returns metadata (total count, pages needed).

### `GET /api/health`
Healthcheck endpoint for uptime monitoring.

---

## 📖 Deployment Guide in Uzbek

To'liq o'zbek tilidagi bepul serverlarga joylashtirish qo'llanmasi uchun [`DEPLOYMENT_UZ.md`](./DEPLOYMENT_UZ.md) faylini o'qing.
