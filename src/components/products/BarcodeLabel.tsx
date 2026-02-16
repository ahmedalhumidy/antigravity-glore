import { useRef, useCallback } from 'react';
import JsBarcode from 'jsbarcode';
import jsPDF from 'jspdf';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { Product } from '@/types/stock';
import { toast } from 'sonner';

interface BarcodeLabelProps {
  product: Product;
  showButton?: boolean;
  size?: 'sm' | 'md';
}

export function BarcodeLabel({ product, showButton = true, size = 'md' }: BarcodeLabelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const barcode = product.barkod || product.urunKodu;

  const renderBarcode = useCallback((canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    try {
      JsBarcode(canvas, barcode, {
        format: 'CODE128',
        width: size === 'sm' ? 1.5 : 2,
        height: size === 'sm' ? 40 : 60,
        displayValue: true,
        fontSize: size === 'sm' ? 10 : 14,
        margin: 5,
        background: '#ffffff',
        lineColor: '#000000',
      });
    } catch {
      // Invalid barcode format fallback
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = 200;
        canvas.height = 40;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, 200, 40);
        ctx.fillStyle = '#666';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(barcode, 100, 25);
      }
    }
  }, [barcode, size]);

  const handlePrint = useCallback(() => {
    printBarcodeLabels([product]);
  }, [product]);

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas
        ref={(el) => {
          canvasRef.current = el;
          renderBarcode(el);
        }}
        className="border border-border rounded"
      />
      {showButton && (
        <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
          <Printer className="w-3.5 h-3.5" />
          Etiket Yazdır
        </Button>
      )}
    </div>
  );
}

// Batch print function - generates a PDF with multiple barcode labels
export function printBarcodeLabels(products: Product[]) {
  if (products.length === 0) {
    toast.error('Yazdırılacak ürün seçilmedi');
    return;
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const labelWidth = 62;
  const labelHeight = 30;
  const marginX = 7;
  const marginY = 10;
  const cols = 3;
  const rows = 9;
  const gapX = 2;
  const gapY = 2;

  let currentPage = 0;
  
  products.forEach((product, index) => {
    const pageIndex = Math.floor(index / (cols * rows));
    const posOnPage = index % (cols * rows);
    const col = posOnPage % cols;
    const row = Math.floor(posOnPage / cols);

    if (pageIndex > currentPage) {
      doc.addPage();
      currentPage = pageIndex;
    }

    const x = marginX + col * (labelWidth + gapX);
    const y = marginY + row * (labelHeight + gapY);

    // Draw label border
    doc.setDrawColor(200);
    doc.setLineWidth(0.2);
    doc.rect(x, y, labelWidth, labelHeight);

    // Product name
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    const name = product.urunAdi.length > 28 ? product.urunAdi.substring(0, 28) + '...' : product.urunAdi;
    doc.text(name, x + labelWidth / 2, y + 5, { align: 'center' });

    // Barcode using canvas
    const barcodeValue = product.barkod || product.urunKodu;
    const canvas = document.createElement('canvas');
    try {
      JsBarcode(canvas, barcodeValue, {
        format: 'CODE128',
        width: 1.5,
        height: 35,
        displayValue: false,
        margin: 0,
      });
      const imgData = canvas.toDataURL('image/png');
      doc.addImage(imgData, 'PNG', x + 5, y + 7, labelWidth - 10, 14);
    } catch {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(barcodeValue, x + labelWidth / 2, y + 16, { align: 'center' });
    }

    // Barcode text
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(barcodeValue, x + labelWidth / 2, y + 24, { align: 'center' });

    // Location
    doc.setFontSize(6);
    doc.text(product.rafKonum, x + labelWidth / 2, y + 28, { align: 'center' });
  });

  doc.save(`barkod-etiketleri-${new Date().toISOString().split('T')[0]}.pdf`);
  toast.success(`${products.length} ürün için etiketler oluşturuldu`);
}
