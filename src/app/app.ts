import { Component, ElementRef, ViewChildren, QueryList, AfterViewInit, AfterViewChecked, PLATFORM_ID, Inject, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface CardData {
  barcodeValue: string;
  cardValueUz: string;
  cardValueRu: string;
  descriptionUz: string;
  descriptionRu: string;
  socialHandle: string;
  website: string;
  phone: string;
  expiryDateUz: string;
  expiryDateRu: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements AfterViewInit, AfterViewChecked {
  @ViewChildren('paperContainer') paperContainers!: QueryList<ElementRef>;
  
  isBrowser: boolean;
  showEditModal = false;
  isGeneratingPdf = false;
  
  // Card grid configuration
  columns = 3;
  rows = 7;
  
  // Dimensions in mm
  cardWidth = 86;  // Current card dimensions (unchanged)
  cardHeight = 54; // Current card dimensions (unchanged)
  outerCardWidth = 95;  // New outer card container width
  outerCardHeight = 59; // New outer card container height
  horizontalGap = 0.5;
  verticalGap = 0.5;
  paperWidth = 320;
  paperHeight = 450;
  
  // Modal form data
  cardValueInput = '400000';
  expiryDate = '2026-12-31';
  barcodesList = '';
  
  // Calculate margins - fixed margins as specified
  get totalCardsWidth(): number {
    return this.columns * this.outerCardWidth + (this.columns - 1) * this.horizontalGap;
  }
  
  get totalCardsHeight(): number {
    return this.rows * this.outerCardHeight + (this.rows - 1) * this.verticalGap;
  }
  
  get marginLeft(): number {
    return 17.5; // Fixed 16mm from left edge
  }
  
  get marginRight(): number {
    return 14.5; // Fixed 16mm from right edge
  }
  
  get marginTop(): number {
    return 18; // Fixed 18mm from top
  }
  
  get marginBottom(): number {
    return 14; // Fixed 14mm from bottom
  }
  
  // Card data
  cardData: CardData = {
    barcodeValue: 'V0',
    cardValueUz: '400 000 so\'m',
    cardValueRu: '400 000 сум',
    descriptionUz: `Karta "Korzinka" supermarketlar tarmog'ida amal qiladi. Xaridlar to'lovi sovg'a kartasidan amalga oshirilganida Korzinka kartasiga bonuslar o'tkazilmaydi.\nKarta 2026-yilning 31-dekabrgacha amal qiladi. Karta "Anglesey Food" MChJ XK xususiy mulki sanaladi.`,
    descriptionRu: `Карта принимается в сети супермаркетов «Корзинка». При оплате покупок подарочной картой, бонусы на накопительную карту не начисляются.\nКарта действительна до 31 декабря 2026 г. Карта является собственностью ИП ООО «Anglesey Food».`,
    expiryDateUz: '31-dekabrgacha',
    expiryDateRu: '31 декабря 2026 г',
    socialHandle: '@korzinkauz',
    website: 'www.korzinka.uz',
    phone: '+998 78 140 14 14'
  };
  
  // Pages array - each page contains barcode values for cards
  pages: string[][] = [];
  
  // Current page index for preview navigation
  currentPreviewPage = 0;
  
  // Cards per page
  get cardsPerPage(): number {
    return this.columns * this.rows;
  }
  
  // Total number of pages
  get totalPages(): number {
    return this.pages.length;
  }
  
  // Get current page cards for preview
  get currentPageCards(): string[] {
    return this.pages[this.currentPreviewPage] || [];
  }
  
  // Total number of cards across all pages
  get totalCards(): number {
    return this.pages.reduce((sum, page) => sum + page.length, 0);
  }
  
  // Navigation methods
  goToPreviousPage() {
    if (this.currentPreviewPage > 0) {
      this.currentPreviewPage--;
      this.barcodesGenerated = false;
    }
  }
  
  goToNextPage() {
    if (this.currentPreviewPage < this.totalPages - 1) {
      this.currentPreviewPage++;
      this.barcodesGenerated = false;
    }
  }
  
  goToPage(pageNum: number | string) {
    // Parse and clamp to valid range
    let page = (typeof pageNum === 'string' ? parseInt(pageNum, 10) : pageNum) - 1;
    
    // Clamp to valid range
    if (isNaN(page) || page < 0) {
      page = 0;
    } else if (page >= this.totalPages) {
      page = this.totalPages - 1;
    }
    
    if (page !== this.currentPreviewPage) {
      this.currentPreviewPage = page;
      this.barcodesGenerated = false;
    }
  }
  
  private JsBarcode: any;
  private jsPDF: any;
  private html2canvas: any;
  private barcodesGenerated = false;
  private lastBarcodeValues: string[] = [];
  private librariesLoaded = false;

  constructor(
    @Inject(PLATFORM_ID) platformId: Object,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    // Initialize with one page of default barcode values
    this.pages = [Array(this.cardsPerPage).fill('V0')];
  }

  async ngAfterViewInit() {
    if (this.isBrowser) {
      // Dynamically import libraries
      const [JsBarcodeModule, jsPDFModule, html2canvasModule] = await Promise.all([
        import('jsbarcode'),
        import('jspdf'),
        import('html2canvas')
      ]);
      
      this.JsBarcode = JsBarcodeModule.default;
      this.jsPDF = jsPDFModule.jsPDF;
      this.html2canvas = html2canvasModule.default;
      this.librariesLoaded = true;
      
      // Generate barcodes
      this.ngZone.runOutsideAngular(() => {
        setTimeout(() => this.generateBarcodes(), 200);
      });
    }
  }

  ngAfterViewChecked() {
    // Check if barcodes need to be regenerated for current page
    if (this.isBrowser && this.librariesLoaded) {
      const currentCards = this.currentPageCards;
      const needsRegeneration = !this.barcodesGenerated || 
                                !this.arraysEqual(this.lastBarcodeValues, currentCards) ||
                                this.checkBarcodesEmpty();
      
      if (needsRegeneration) {
        this.ngZone.runOutsideAngular(() => {
          setTimeout(() => this.generateBarcodes(), 50);
        });
      }
    }
  }

  private arraysEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((val, i) => val === b[i]);
  }

  private checkBarcodesEmpty(): boolean {
    const firstBarcode = document.querySelector('.barcode-svg');
    if (firstBarcode) {
      // Check if the SVG has any rect or path children (barcode lines)
      return firstBarcode.children.length === 0;
    }
    return true;
  }

  generateBarcodes() {
    if (!this.isBrowser || !this.JsBarcode) return;
    
    const barcodeElements = document.querySelectorAll('.paper-container .barcode-svg');
    if (barcodeElements.length === 0) return;
    
    const currentCards = this.currentPageCards;
    
    barcodeElements.forEach((element, index) => {
      try {
        // Clear existing content
        element.innerHTML = '';
        
        const barcodeValue = currentCards[index] || 'V0';
        
        // Settings for barcode generation
        this.JsBarcode(element, barcodeValue, {
          format: 'CODE128',
          width: 0.9,           // Tighter barcode lines
          height: 35,           // Bar height
          displayValue: true,   // Show text below barcode
          font: 'Arial',
          fontSize: 10,         // Text size
          fontOptions: '',      // NOT italic - regular text
          textAlign: 'center',
          textPosition: 'bottom',
          textMargin: 2,
          margin: 0
        });
      } catch (e) {
        console.error('Barcode generation failed:', e);
      }
    });
    
    this.barcodesGenerated = true;
    this.lastBarcodeValues = [...currentCards];
  }

  openEditModal() {
    this.showEditModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
  }

  applyChanges() {
    // Update card value labels - format the number with thousand separators
    const numericValue = this.cardValueInput.replace(/\D/g, ''); // Remove non-digits
    if (numericValue) {
      const formattedValue = this.formatNumber(parseInt(numericValue, 10));
      this.cardData.cardValueUz = `${formattedValue} so'm`;
      this.cardData.cardValueRu = `${formattedValue} сум`;
    }
    
    // Format expiry date
    const date = new Date(this.expiryDate);
    const day = date.getDate();
    const year = date.getFullYear();
    
    // Uzbek month names
    const monthsUz = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
    // Russian month names
    const monthsRu = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    
    const monthUz = monthsUz[date.getMonth()];
    const monthRu = monthsRu[date.getMonth()];
    
    // Update descriptions with new date
    this.cardData.descriptionUz = `Karta "Korzinka" supermarketlar tarmog'ida amal qiladi. Xaridlar to'lovi sovg'a kartasidan amalga oshirilganida Korzinka kartasiga bonuslar o'tkazilmaydi.\nKarta ${year}-yilning ${day}-${monthUz}gacha amal qiladi. Karta "Anglesey Food" MChJ XK xususiy mulki sanaladi.`;
    
    this.cardData.descriptionRu = `Карта принимается в сети супермаркетов «Корзинка». При оплате покупок подарочной картой, бонусы на накопительную карту не начисляются.\nКарта действительна до  ${day} ${monthRu} ${year} г. Карта является собственностью ИП ООО «Anglesey Food».`;
    
    // Parse barcode list and distribute across pages
    const barcodes = this.barcodesList.trim()
      ? this.barcodesList
          .split('\n')
          .map(line => line.replace(/\s/g, '').trim())
          .filter(line => line.length > 0)
      : ['V0']; // Default single barcode if empty
    
    // Calculate number of pages needed
    const numPages = Math.max(1, Math.ceil(barcodes.length / this.cardsPerPage));
    
    // Create pages
    this.pages = [];
    for (let page = 0; page < numPages; page++) {
      const pageCards: string[] = [];
      const startIndex = page * this.cardsPerPage;
      
      // Grid flows column by column, so we can use barcodes in natural order
      // Only add actual barcodes, don't fill with placeholders
      for (let i = 0; i < this.cardsPerPage; i++) {
        const barcodeIndex = startIndex + i;
        if (barcodeIndex < barcodes.length) {
          pageCards.push(barcodes[barcodeIndex]);
        }
      }
      
      // Only add page if it has cards
      if (pageCards.length > 0) {
        this.pages.push(pageCards);
      }
    }
    
    // Ensure at least one page exists
    if (this.pages.length === 0) {
      this.pages = [Array(this.cardsPerPage).fill('V0')];
    }
    
    // Reset to first page
    this.currentPreviewPage = 0;
    this.barcodesGenerated = false;
    this.closeEditModal();
  }

  onCardDataChange() {
    this.barcodesGenerated = false;
  }

  // Format number with space as thousand separator
  formatNumber(num: number): string {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  // Handle card value input - only allow numbers
  onCardValueInput(event: Event) {
    const input = event.target as HTMLInputElement;
    // Remove all non-digit characters
    const numericValue = input.value.replace(/\D/g, '');
    this.cardValueInput = numericValue;
    input.value = numericValue;
  }

  // Progress tracking for PDF generation
  pdfProgress = '';
  pdfProgressPercent = 0;
  
  // Helper to update progress with change detection
  private updateProgress(message: string, percent: number) {
    this.ngZone.run(() => {
      this.pdfProgress = message;
      this.pdfProgressPercent = percent;
    });
  }
  
  async downloadPdf() {
    if (!this.isBrowser || this.isGeneratingPdf) return;
    
    const originalPage = this.currentPreviewPage;
    const totalPages = this.pages.length;
    
    // Get page wrapper to remove responsive transforms during PDF generation
    const pageWrapper = document.querySelector('.page-wrapper');
    
    // Show modal first and wait for it to render
    this.ngZone.run(() => {
      this.isGeneratingPdf = true;
      this.pdfProgress = 'Preparing...';
      this.pdfProgressPercent = 5;
    });
    
    // CRITICAL: Wait for Angular to render the modal before heavy processing
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Add class to disable responsive transforms during PDF generation
    pageWrapper?.classList.add('generating-pdf');
    
    try {
      // Create PDF with exact paper dimensions - optimized for print quality
      const pdf = new this.jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [this.paperWidth, this.paperHeight],
        compress: true, // Enable compression to reduce file size while maintaining quality
        precision: 16 // High precision for accurate dimensions
      });
      
      // Process each page by switching preview and capturing DOM
      for (let i = 0; i < totalPages; i++) {
        // Update progress - use requestAnimationFrame for smoother updates
        await new Promise<void>(resolve => {
          requestAnimationFrame(() => {
            this.ngZone.run(() => {
              this.pdfProgress = `Processing page ${i + 1} of ${totalPages}...`;
              this.pdfProgressPercent = 10 + Math.round((i / totalPages) * 80);
            });
            resolve();
          });
        });
        
        // Additional wait to ensure UI updates
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Switch to this page
        this.ngZone.run(() => {
          this.currentPreviewPage = i;
          this.barcodesGenerated = false;
        });
        
        // Force change detection to ensure DOM updates
        this.cdr.detectChanges();
        
        // Wait for Angular to update the DOM - use multiple animation frames to ensure stability
        await new Promise<void>(resolve => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setTimeout(() => resolve(), 100);
            });
          });
        });
        
        // Generate barcodes for this page
        this.generateBarcodes();
        
        // Wait for barcodes to render - verify they're actually rendered
        await new Promise<void>(resolve => {
          const expectedCards = this.currentPageCards.length;
          let attempts = 0;
          const maxAttempts = 40; // Maximum 2 seconds (40 * 50ms)
          
          const checkBarcodes = () => {
            attempts++;
            const barcodeElements = document.querySelectorAll('.paper-container .barcode-svg');
            const cardElements = document.querySelectorAll('.paper-container .outer-card');
            
            // Check if we have the expected number of cards
            if (cardElements.length !== expectedCards) {
              if (attempts >= maxAttempts) {
                console.warn(`Expected ${expectedCards} cards but found ${cardElements.length} for page ${i + 1}`);
                resolve();
                return;
              }
              setTimeout(checkBarcodes, 50);
              return;
            }
            
            // Check if barcodes have content
            const barcodesWithContent = Array.from(barcodeElements).filter(el => {
              const svg = el as SVGElement;
              return svg.children.length > 0 && svg.getBoundingClientRect().width > 0;
            });
            
            if (barcodesWithContent.length === expectedCards || attempts >= maxAttempts) {
              setTimeout(() => resolve(), 100);
            } else {
              setTimeout(checkBarcodes, 50);
            }
          };
          setTimeout(checkBarcodes, 100);
        });
        
        // Get the paper container from DOM
        const paperElement = this.paperContainers.first?.nativeElement;
        if (!paperElement) {
          console.error('Paper container not found for page', i);
          continue;
        }
        
        // CRITICAL: Hide the progress modal overlay during capture
        // The overlay has a solid background that interferes with html2canvas
        const progressOverlay = document.querySelector('.progress-modal-overlay') as HTMLElement;
        if (progressOverlay) {
          progressOverlay.style.visibility = 'hidden';
        }
        
        // Wait a frame for visibility change to take effect
        await new Promise(resolve => requestAnimationFrame(resolve));
        
        // Create canvas with optimized settings for print quality
        // Scale 3 = ~288 DPI equivalent - good balance between quality and file size
        const canvas = await this.html2canvas(paperElement, {
          scale: 3, // Balanced quality (288 DPI) - good for printing without excessive file size
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          allowTaint: false,
          removeContainer: true,
          windowWidth: paperElement.scrollWidth,
          windowHeight: paperElement.scrollHeight,
          width: paperElement.scrollWidth,
          height: paperElement.scrollHeight
        });
        
        // Restore progress modal visibility
        if (progressOverlay) {
          progressOverlay.style.visibility = 'visible';
        }
        
        // Use PNG for crisp barcodes and text
        const imgData = canvas.toDataURL('image/png');
        
        // Add new page for pages after the first
        if (i > 0) {
          pdf.addPage([this.paperWidth, this.paperHeight]);
        }
        
        // Add image to PDF
        pdf.addImage(imgData, 'PNG', 0, 0, this.paperWidth, this.paperHeight);
        
        // Update progress after page completion
        await new Promise<void>(resolve => {
          requestAnimationFrame(() => {
            this.ngZone.run(() => {
              this.pdfProgressPercent = 10 + Math.round(((i + 1) / totalPages) * 80);
            });
            resolve();
          });
        });
        
        // Free canvas memory
        canvas.width = 0;
        canvas.height = 0;
        
        // Allow garbage collection and UI update
        await new Promise(resolve => setTimeout(resolve, 60));
      }
      
      this.updateProgress('Saving PDF...', 95);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      pdf.save('korzinka-gift-cards.pdf');
      this.updateProgress('Complete!', 100);
      
      // Brief delay to show completion
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('PDF generation failed. Please try again.');
    } finally {
      // Remove the generating-pdf class
      pageWrapper?.classList.remove('generating-pdf');
      
      // Restore original page
      this.ngZone.run(() => {
        this.currentPreviewPage = originalPage;
        this.barcodesGenerated = false;
        this.pdfProgress = '';
        this.pdfProgressPercent = 0;
        this.isGeneratingPdf = false;
      });
    }
  }

  // Alias for downloadPdf (for backward compatibility)
  downloadSummerCardsPdf() {
    return this.downloadPdf();
  }

  // Convert mm to pixels for screen display (using 96 DPI approximation with scale)
  mmToPx(mm: number): number {
    return mm * 3.7795275591; // 1mm = 3.7795275591 px at 96 DPI
  }
}
