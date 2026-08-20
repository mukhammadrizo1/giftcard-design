import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  botToken: process.env.BOT_TOKEN || '',
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  pingUrl: process.env.PING_URL || process.env.RENDER_EXTERNAL_URL || '',
  assetsDir: path.join(__dirname, 'assets'),
  fontsDir: path.join(__dirname, 'assets', 'fonts'),
  
  // Card layout configuration
  paper: {
    widthMm: 320,
    heightMm: 450,
    marginLeftMm: 17.5,
    marginRightMm: 14.5,
    marginTopMm: 18.0,
    marginBottomMm: 14.0,
    columns: 3,
    rows: 7,
    outerCardWidthMm: 95,
    outerCardHeightMm: 59,
    cardWidthMm: 86,
    cardHeightMm: 54,
    horizontalGapMm: 0.5,
    verticalGapMm: 0.5,
    borderRadiusMm: 4
  }
};
