import * as XLSX from 'xlsx';

export class BarcodeParser {
  /**
   * Parse barcodes from a raw string input (line-by-line or comma-separated).
   */
  static fromText(text: string): string[] {
    if (!text || typeof text !== 'string') return [];
    
    return text
      .split(/[\r\n,]+/)
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }

  /**
   * Parse barcodes from an uploaded file buffer (supports .txt, .csv, .xlsx, .xls).
   */
  static fromBuffer(buffer: Buffer, originalFilename: string): string[] {
    const ext = originalFilename.toLowerCase().split('.').pop();

    if (ext === 'txt') {
      return this.fromText(buffer.toString('utf-8'));
    }

    if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
      try {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) return [];

        const sheet = workbook.Sheets[firstSheetName];
        const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        const barcodes: string[] = [];
        
        for (const row of data) {
          if (!Array.isArray(row)) continue;
          for (const cell of row) {
            if (cell !== undefined && cell !== null) {
              const val = String(cell).trim();
              if (val.length > 0) {
                barcodes.push(val);
              }
            }
          }
        }
        
        return barcodes;
      } catch (err) {
        console.error('Failed to parse Excel/CSV file:', err);
        return this.fromText(buffer.toString('utf-8'));
      }
    }

    return this.fromText(buffer.toString('utf-8'));
  }
}
