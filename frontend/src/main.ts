import JsBarcode from 'jsbarcode';
import * as XLSX from 'xlsx';

// Constants
const CARDS_PER_PAGE = 21; // 3 columns × 7 rows

type Language = 'uz' | 'ru' | 'en';
type Theme = 'light' | 'dark';

// Multi-language Translations
const translations: Record<Language, Record<string, string>> = {
  uz: {
    appTitle: 'Korzinka Sovg‘a Kartalari',
    appSubtitle: 'Professional Chop Etish Generatori',
    quickPrint: 'Chop etish',
    downloadPdf: 'Vektor PDF Yuklash',
    settingsTitle: 'Karta Sozlamalari',
    settingsSubtitle: 'Qiymat, muddat va barkodlarni belgilang',
    cardAmountLabel: 'Karta qiymati (so‘m / сум)',
    numbersOnly: 'faqat raqam',
    expiryDateLabel: 'Amal qilish muddati',
    cardsStat: 'Kartalar',
    pagesStat: 'Varaqlar',
    sheetStat: 'mm (Varaq)',
    barcodesLabel: 'Barkodlar ro‘yxati',
    onePerLine: 'har bir qatorda 1 ta',
    dropzoneText: 'Faylni shu yerga tashlang yoki tanlang',
    dropzoneHint: '.txt, .csv, .xlsx (Excel) formatlari qo‘llab-quvvatlanadi',
    textareaPlaceholder: 'Barkod kodlarini kiriting...\nKZ000001\nKZ000002\nKZ000003',
    pageWord: 'Varaq',
    generatingTitle: 'PDF Generatsiya qilinmoqda...',
    generatingSubtitle: 'Serverda vektor sifatdagi PDF yaratilmoqda, iltimos kuting',
    fileLoadedSuccess: 'ta barkod muvaffaqiyatli yuklandi!',
    noBarcodesFound: 'Fayldan barkod topilmadi',
    excelReadError: 'Excel faylni o‘qishda xatolik',
    pdfDownloadSuccess: 'Vektor PDF muvaffaqiyatli yuklandi!',
    serverError: 'Server xatoligi'
  },
  ru: {
    appTitle: 'Подарочные Карты Korzinka',
    appSubtitle: 'Профессиональный Генератор Печати',
    quickPrint: 'Печать',
    downloadPdf: 'Скачать Векторный PDF',
    settingsTitle: 'Настройки Карт',
    settingsSubtitle: 'Укажите номинал, срок и штрихкоды',
    cardAmountLabel: 'Номинал карты (сум / so‘m)',
    numbersOnly: 'только цифры',
    expiryDateLabel: 'Срок действия',
    cardsStat: 'Карты',
    pagesStat: 'Листы',
    sheetStat: 'мм (Лист)',
    barcodesLabel: 'Список штрихкодов',
    onePerLine: 'по одному на строку',
    dropzoneText: 'Перетащите файл сюда или выберите',
    dropzoneHint: 'Поддерживаются форматы .txt, .csv, .xlsx (Excel)',
    textareaPlaceholder: 'Введите штрихкоды...\nKZ000001\nKZ000002\nKZ000003',
    pageWord: 'Лист',
    generatingTitle: 'Генерация PDF...',
    generatingSubtitle: 'На сервере создается векторный PDF, пожалуйста подождите',
    fileLoadedSuccess: 'штрихкодов успешно загружено!',
    noBarcodesFound: 'Штрихкоды в файле не найдены',
    excelReadError: 'Ошибка при чтении Excel файла',
    pdfDownloadSuccess: 'Векторный PDF успешно скачан!',
    serverError: 'Ошибка сервера'
  },
  en: {
    appTitle: 'Korzinka Gift Cards',
    appSubtitle: 'Professional Print Layout Generator',
    quickPrint: 'Print',
    downloadPdf: 'Download Vector PDF',
    settingsTitle: 'Card Settings',
    settingsSubtitle: 'Configure amount, expiry date, and barcodes',
    cardAmountLabel: 'Card Amount (so‘m / sum)',
    numbersOnly: 'numbers only',
    expiryDateLabel: 'Expiry Date',
    cardsStat: 'Cards',
    pagesStat: 'Sheets',
    sheetStat: 'mm (Sheet)',
    barcodesLabel: 'Barcodes List',
    onePerLine: 'one per line',
    dropzoneText: 'Drop file here or click to upload',
    dropzoneHint: 'Supports .txt, .csv, .xlsx (Excel) formats',
    textareaPlaceholder: 'Enter barcode codes...\nKZ000001\nKZ000002\nKZ000003',
    pageWord: 'Sheet',
    generatingTitle: 'Generating PDF...',
    generatingSubtitle: 'Creating vector PDF on server, please wait',
    fileLoadedSuccess: 'barcodes loaded successfully!',
    noBarcodesFound: 'No barcodes found in file',
    excelReadError: 'Error reading Excel file',
    pdfDownloadSuccess: 'Vector PDF downloaded successfully!',
    serverError: 'Server error'
  }
};

// App State
interface State {
  amount: string;
  expiryDate: string;
  barcodes: string[];
  currentPage: number;
  zoom: number | 'fit';
  lang: Language;
  theme: Theme;
  sidebarCollapsed: boolean;
}

const savedTheme = (localStorage.getItem('theme') as Theme) || 'dark';
const savedLang = (localStorage.getItem('lang') as Language) || 'uz';

const state: State = {
  amount: '50000',
  expiryDate: '2027-12-31',
  barcodes: Array.from({ length: 21 }, (_, i) => `KZ${String(i + 1).padStart(6, '0')}`),
  currentPage: 0,
  zoom: 'fit',
  lang: savedLang,
  theme: savedTheme,
  sidebarCollapsed: false
};

// DOM Elements
const cardAmountInput = document.getElementById('cardAmountInput') as HTMLInputElement;
const expiryDateInput = document.getElementById('expiryDateInput') as HTMLInputElement;
const barcodesTextarea = document.getElementById('barcodesTextarea') as HTMLTextAreaElement;
const fileInput = document.getElementById('fileInput') as HTMLInputElement;
const fileDropzone = document.getElementById('fileDropzone') as HTMLDivElement;
const cardsGrid = document.getElementById('cardsGrid') as HTMLDivElement;
const pageDisplay = document.getElementById('pageDisplay') as HTMLSpanElement;
const btnPrevPage = document.getElementById('btnPrevPage') as HTMLButtonElement;
const btnNextPage = document.getElementById('btnNextPage') as HTMLButtonElement;
const statCardsCount = document.getElementById('statCardsCount') as HTMLDivElement;
const statPagesCount = document.getElementById('statPagesCount') as HTMLDivElement;
const btnDownloadPdf = document.getElementById('btnDownloadPdf') as HTMLButtonElement;
const btnQuickPrint = document.getElementById('btnQuickPrint') as HTMLButtonElement;
const progressModal = document.getElementById('progressModal') as HTMLDivElement;
const progressBarFill = document.getElementById('progressBarFill') as HTMLDivElement;
const previewViewport = document.getElementById('previewViewport') as HTMLDivElement;
const previewScaler = document.getElementById('previewScaler') as HTMLDivElement;
const sidebar = document.getElementById('sidebar') as HTMLElement;
const sidebarBackdrop = document.getElementById('sidebarBackdrop') as HTMLDivElement;
const btnToggleSidebar = document.getElementById('btnToggleSidebar') as HTMLButtonElement;
const btnSidebarClose = document.getElementById('btnSidebarClose') as HTMLButtonElement;
const btnSidebarExpand = document.getElementById('btnSidebarExpand') as HTMLButtonElement;
const btnThemeToggle = document.getElementById('btnThemeToggle') as HTMLButtonElement;

// Helper: Format Number with Spaces
function formatNumber(val: string | number): string {
  const num = String(val).replace(/\D/g, '');
  if (!num) return '50 000';
  return num.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

// Helper: Format Expiry Date
function formatExpiryDate(dateStr: string): { uz: string; ru: string } {
  let year = 2027;
  let month = 11;
  let day = 31;

  if (dateStr) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      year = parseInt(parts[0], 10) || 2027;
      month = (parseInt(parts[1], 10) || 12) - 1;
      day = parseInt(parts[2], 10) || 31;
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
    uz: `${year}-yilning ${day}-${monthUz}gacha`,
    ru: `${day} ${monthRu} ${year} г.`
  };
}

// Translation Handler
function setLanguage(lang: Language) {
  state.lang = lang;
  localStorage.setItem('lang', lang);

  // Update language buttons
  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
  });

  // Apply translations to all data-i18n elements
  const dict = translations[lang];
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key && dict[key]) {
      el.textContent = dict[key];
    }
  });

  // Update textarea placeholder
  if (barcodesTextarea && dict.textareaPlaceholder) {
    barcodesTextarea.placeholder = dict.textareaPlaceholder;
  }

  renderCurrentPage();
}

// Theme Handler
function applyTheme(theme: Theme) {
  state.theme = theme;
  localStorage.setItem('theme', theme);
  document.documentElement.setAttribute('data-theme', theme);

  // Update Theme Icon
  if (btnThemeToggle) {
    if (theme === 'dark') {
      btnThemeToggle.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
      `;
    } else {
      btnThemeToggle.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="5"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
      `;
    }
  }
}

// Sidebar Collapse / Expand Handler
function toggleSidebar(collapsed?: boolean) {
  const isCollapsed = collapsed !== undefined ? collapsed : !state.sidebarCollapsed;
  state.sidebarCollapsed = isCollapsed;

  if (isCollapsed) {
    sidebar.classList.add('collapsed');
    sidebarBackdrop.classList.remove('active');
    if (btnSidebarExpand) btnSidebarExpand.style.display = 'flex';
  } else {
    sidebar.classList.remove('collapsed');
    if (window.innerWidth <= 992) {
      sidebarBackdrop.classList.add('active');
    }
    if (btnSidebarExpand) btnSidebarExpand.style.display = 'none';
  }

  // Recalculate zoom fit smoothly
  setTimeout(() => applyZoom(), 320);
}

// Show Toast Notification
function showToast(message: string, isError = false) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.borderLeft = isError ? '4px solid #ef4444' : '4px solid #10b981';
  toast.textContent = message;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Social SVG Icons
const socialSvgIcons = `
  <div class="social-icons-group">
    <svg class="social-svg" viewBox="0 0 320 512">
      <path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z"/>
    </svg>
    <svg class="social-svg" viewBox="0 0 448 512">
      <path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z"/>
    </svg>
    <svg class="social-svg" viewBox="0 0 496 512">
      <path d="M248,8C111.033,8,0,119.033,0,256S111.033,504,248,504,496,392.967,496,256,384.967,8,248,8ZM362.952,176.66c-3.732,39.215-19.881,134.378-28.1,178.3-3.476,18.584-10.322,24.816-16.948,25.425-14.4,1.326-25.338-9.517-39.287-18.661-21.827-14.308-34.158-23.215-55.346-37.177-24.485-16.135-8.612-25,5.342-39.5,3.652-3.793,67.107-61.51,68.335-66.746.153-.655.3-3.1-1.154-4.384s-3.59-.849-5.135-.5q-3.283.746-104.608,69.142-14.845,10.194-26.894,9.934c-8.855-.191-25.888-5.006-38.551-9.123-15.531-5.048-27.875-7.717-26.8-16.291q.84-6.7,18.45-13.7,108.446-47.248,144.628-62.3c68.872-28.647,83.183-33.623,92.511-33.789,2.052-.034,6.639.474,9.61,2.885a10.452,10.452,0,0,1,3.53,6.716A43.765,43.765,0,0,1,362.952,176.66Z"/>
    </svg>
  </div>
`;

// Render Current Page
function renderCurrentPage() {
  const totalCards = state.barcodes.length;
  const totalPages = Math.max(1, Math.ceil(totalCards / CARDS_PER_PAGE));

  // Clamp current page
  if (state.currentPage >= totalPages) {
    state.currentPage = totalPages - 1;
  }
  if (state.currentPage < 0) {
    state.currentPage = 0;
  }

  // Update Stats & Pagination UI
  statCardsCount.textContent = String(totalCards);
  statPagesCount.textContent = String(totalPages);

  const pageWord = translations[state.lang].pageWord || 'Varaq';
  pageDisplay.textContent = `${pageWord}: ${state.currentPage + 1} / ${totalPages}`;

  btnPrevPage.disabled = state.currentPage === 0;
  btnNextPage.disabled = state.currentPage === totalPages - 1;

  const formattedAmt = formatNumber(state.amount);
  const dateFormatted = formatExpiryDate(state.expiryDate);

  const startIdx = state.currentPage * CARDS_PER_PAGE;
  const pageBarcodes = state.barcodes.slice(startIdx, startIdx + CARDS_PER_PAGE);

  // Clear Grid
  cardsGrid.innerHTML = '';

  // Render 21 cards
  for (let i = 0; i < CARDS_PER_PAGE; i++) {
    const outerCard = document.createElement('div');
    outerCard.className = 'outer-card';

    if (i < pageBarcodes.length) {
      const barcodeVal = pageBarcodes[i];
      const cardEl = document.createElement('div');
      cardEl.className = 'gift-card';

      cardEl.innerHTML = `
        <div class="card-barcode-box">
          <svg class="card-barcode-svg" id="barcode-svg-${i}"></svg>
        </div>
        <div class="card-section">
          <div class="card-title">Karta qiymati — ${formattedAmt} so‘m</div>
          <div class="card-desc">Karta Korzinka supermarketlar tarmog‘ida amal qiladi. Xaridlarga to‘lov
sovg‘a kartasidan amalga oshirilganda, Korzinka kartasiga bonuslar
o‘tkazilmaydi. Karta ${dateFormatted.uz} amal qiladi.
Karta “Anglesey Food” MChJ XK xususiy mulki sanaladi.
Ushbu kartani avaylab saqlang.
Yo‘qotilgan taqdirda, uni qayta tiklab bera olmaymiz.</div>
        </div>
        <div class="card-section">
          <div class="card-title">Номинал карты — ${formattedAmt} сум</div>
          <div class="card-desc">Карта принимается в сети супермаркетов «Корзинка». При оплате покупок
подарочной картой, бонусы на накопительную карту не начисляются.
Карта действительна до ${dateFormatted.ru}
Карта является собственностью ИП ООО «Anglesey Food».
Храните эту карту бережно. В случае утери мы не сможем ее восстановить.</div>
        </div>
        <div class="card-footer">
          <div class="footer-social">
            ${socialSvgIcons}
            <span class="footer-handle">@korzinkauz</span>
          </div>
          <div class="footer-web">www.korzinka.uz</div>
          <div class="footer-phone">+998 78 140 14 14</div>
        </div>
      `;

      outerCard.appendChild(cardEl);
      cardsGrid.appendChild(outerCard);

      // Render barcode with JsBarcode
      try {
        JsBarcode(`#barcode-svg-${i}`, barcodeVal, {
          format: 'CODE128',
          width: 0.9,
          height: 30,
          displayValue: true,
          font: 'Arial',
          fontSize: 9.5,
          textAlign: 'center',
          textPosition: 'bottom',
          textMargin: 2,
          margin: 0
        });
      } catch (e) {
        console.error('JsBarcode render error:', e);
      }
    } else {
      // Empty placeholder cell for grid symmetry
      cardsGrid.appendChild(outerCard);
    }
  }

  applyZoom();
}

// Zoom Scaling
function applyZoom() {
  if (!previewScaler || !previewViewport) return;

  if (state.zoom === 'fit') {
    const vpWidth = previewViewport.clientWidth - 80;
    const vpHeight = previewViewport.clientHeight - 80;
    const sheetPxWidth = 320 * 3.7795;
    const sheetPxHeight = 450 * 3.7795;

    const scaleX = vpWidth / sheetPxWidth;
    const scaleY = vpHeight / sheetPxHeight;
    const scale = Math.min(scaleX, scaleY, 0.95);

    previewScaler.style.transform = `scale(${Math.max(0.25, scale)})`;
  } else {
    previewScaler.style.transform = `scale(${state.zoom})`;
  }
}

// Event Listeners
cardAmountInput.addEventListener('input', (e) => {
  const input = e.target as HTMLInputElement;
  const rawNum = input.value.replace(/\D/g, '');
  state.amount = rawNum || '50000';
  input.value = formatNumber(rawNum);

  // Update chip active states
  document.querySelectorAll('.chip-btn').forEach((chip) => {
    chip.classList.toggle('active', chip.getAttribute('data-amount') === rawNum);
  });

  renderCurrentPage();
});

// Chips Selection
document.querySelectorAll('.chip-btn').forEach((chip) => {
  chip.addEventListener('click', () => {
    const amt = chip.getAttribute('data-amount') || '50000';
    state.amount = amt;
    cardAmountInput.value = formatNumber(amt);

    document.querySelectorAll('.chip-btn').forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');

    renderCurrentPage();
  });
});

expiryDateInput.addEventListener('change', (e) => {
  state.expiryDate = (e.target as HTMLInputElement).value || '2027-12-31';
  renderCurrentPage();
});

barcodesTextarea.addEventListener('input', (e) => {
  const text = (e.target as HTMLTextAreaElement).value.trim();
  if (text) {
    state.barcodes = text
      .split(/[\r\n,]+/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  } else {
    state.barcodes = ['V0'];
  }
  renderCurrentPage();
});

// Pagination
btnPrevPage.addEventListener('click', () => {
  if (state.currentPage > 0) {
    state.currentPage--;
    renderCurrentPage();
  }
});

btnNextPage.addEventListener('click', () => {
  const totalPages = Math.ceil(state.barcodes.length / CARDS_PER_PAGE);
  if (state.currentPage < totalPages - 1) {
    state.currentPage++;
    renderCurrentPage();
  }
});

// Zoom Controls
document.querySelectorAll('.zoom-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const zoomVal = btn.getAttribute('data-zoom');
    if (zoomVal === 'fit') {
      state.zoom = 'fit';
    } else {
      state.zoom = parseFloat(zoomVal || '0.65');
    }
    applyZoom();
  });
});

window.addEventListener('resize', () => {
  if (state.zoom === 'fit') applyZoom();
});

// Language Switcher Events
document.querySelectorAll('.lang-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const lang = btn.getAttribute('data-lang') as Language;
    if (lang) setLanguage(lang);
  });
});

// Theme Switcher Event
btnThemeToggle.addEventListener('click', () => {
  const nextTheme: Theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme(nextTheme);
});

// Sidebar Collapse / Expand Events
btnToggleSidebar.addEventListener('click', () => toggleSidebar());
btnSidebarClose.addEventListener('click', () => toggleSidebar(true));
btnSidebarExpand.addEventListener('click', () => toggleSidebar(false));
sidebarBackdrop.addEventListener('click', () => toggleSidebar(true));

// File Upload Handler
function handleUploadedFile(file: File) {
  const reader = new FileReader();
  const ext = file.name.split('.').pop()?.toLowerCase();
  const dict = translations[state.lang];

  if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        const parsed: string[] = [];
        for (const row of rows) {
          if (!Array.isArray(row)) continue;
          for (const cell of row) {
            if (cell !== undefined && cell !== null) {
              const str = String(cell).trim();
              if (str.length > 0) parsed.push(str);
            }
          }
        }

        if (parsed.length > 0) {
          state.barcodes = parsed;
          barcodesTextarea.value = parsed.join('\n');
          showToast(`✅ ${parsed.length} ${dict.fileLoadedSuccess}`);
          renderCurrentPage();
        } else {
          showToast(`⚠️ ${dict.noBarcodesFound}`, true);
        }
      } catch (err) {
        showToast(`❌ ${dict.excelReadError}`, true);
      }
    };
    reader.readAsArrayBuffer(file);
  } else {
    // Text file
    reader.onload = (e) => {
      const text = String(e.target?.result || '').trim();
      const parsed = text
        .split(/[\r\n,]+/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (parsed.length > 0) {
        state.barcodes = parsed;
        barcodesTextarea.value = parsed.join('\n');
        showToast(`✅ ${parsed.length} ${dict.fileLoadedSuccess}`);
        renderCurrentPage();
      }
    };
    reader.readAsText(file);
  }
}

fileInput.addEventListener('change', (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) handleUploadedFile(file);
});

fileDropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  fileDropzone.classList.add('dragover');
});

fileDropzone.addEventListener('dragleave', () => {
  fileDropzone.classList.remove('dragover');
});

fileDropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  fileDropzone.classList.remove('dragover');
  const file = e.dataTransfer?.files?.[0];
  if (file) handleUploadedFile(file);
});

// Quick Print
btnQuickPrint.addEventListener('click', () => {
  window.print();
});

// Download Vector PDF from Backend
btnDownloadPdf.addEventListener('click', async () => {
  const dict = translations[state.lang];
  progressModal.classList.add('active');
  progressBarFill.style.width = '30%';

  const apiBase = (import.meta as any).env?.VITE_API_URL ||
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? ''
      : 'https://giftcard-design.onrender.com');

  try {
    const response = await fetch(`${apiBase}/api/generate-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: state.amount,
        expiryDate: state.expiryDate,
        barcodes: state.barcodes
      })
    });

    progressBarFill.style.width = '80%';

    if (!response.ok) {
      throw new Error(`${dict.serverError}: ${response.statusText}`);
    }

    const blob = await response.blob();
    progressBarFill.style.width = '100%';

    // Download blob as file
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `korzinka-gift-cards-${state.barcodes.length}cards.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();

    showToast(`✅ ${dict.pdfDownloadSuccess}`);
  } catch (error: any) {
    console.error('PDF download error:', error);
    showToast(`❌ ${error.message || dict.serverError}`, true);
  } finally {
    setTimeout(() => {
      progressModal.classList.remove('active');
      progressBarFill.style.width = '0%';
    }, 400);
  }
});

// Initial Setup
applyTheme(state.theme);
setLanguage(state.lang);
barcodesTextarea.value = state.barcodes.join('\n');
if (btnSidebarExpand) btnSidebarExpand.style.display = 'none';
renderCurrentPage();
