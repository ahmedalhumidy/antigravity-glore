import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Product } from '@/types/stock';
import { Download, Printer, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface QRCodeGeneratorProps {
    product: Product;
    size?: number;
    className?: string;
}

export function QRCodeGenerator({ product, size = 200, className }: QRCodeGeneratorProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [copied, setCopied] = useState(false);

    const qrData = JSON.stringify({
        id: product.id,
        code: product.urunKodu,
        barcode: product.barkod,
        name: product.urunAdi,
        shelf: product.rafKonum,
    });

    useEffect(() => {
        if (!canvasRef.current) return;
        QRCode.toCanvas(canvasRef.current, qrData, {
            width: size,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#ffffff',
            },
            errorCorrectionLevel: 'M',
        });
    }, [qrData, size]);

    const handleDownload = async () => {
        if (!canvasRef.current) return;

        // Create a bigger canvas with product info
        const labelCanvas = document.createElement('canvas');
        const ctx = labelCanvas.getContext('2d');
        if (!ctx) return;

        const padding = 20;
        const textHeight = 60;
        labelCanvas.width = size + padding * 2;
        labelCanvas.height = size + padding * 2 + textHeight;

        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, labelCanvas.width, labelCanvas.height);

        // Draw QR code
        ctx.drawImage(canvasRef.current, padding, padding);

        // Draw product info
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.textAlign = 'center';
        const centerX = labelCanvas.width / 2;
        ctx.fillText(product.urunAdi.substring(0, 30), centerX, size + padding + 20);
        ctx.font = '12px monospace';
        ctx.fillText(product.urunKodu, centerX, size + padding + 40);
        if (product.barkod) {
            ctx.font = '10px monospace';
            ctx.fillStyle = '#666666';
            ctx.fillText(product.barkod, centerX, size + padding + 55);
        }

        // Download
        const link = document.createElement('a');
        link.download = `qr-${product.urunKodu}.png`;
        link.href = labelCanvas.toDataURL('image/png');
        link.click();
        toast.success('QR kod indirildi');
    };

    const handlePrint = () => {
        if (!canvasRef.current) return;
        const dataUrl = canvasRef.current.toDataURL('image/png');
        const win = window.open('', '_blank');
        if (!win) return;
        win.document.write(`
      <html>
        <head><title>QR - ${product.urunKodu}</title></head>
        <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;font-family:sans-serif;">
          <img src="${dataUrl}" style="width:${size}px;height:${size}px;" />
          <p style="font-weight:bold;margin-top:12px;">${product.urunAdi}</p>
          <p style="font-family:monospace;color:#666;">${product.urunKodu}</p>
          ${product.barkod ? `<p style="font-family:monospace;font-size:12px;color:#999;">${product.barkod}</p>` : ''}
        </body>
      </html>
    `);
        win.document.close();
        win.print();
    };

    const handleCopy = async () => {
        try {
            if (!canvasRef.current) return;
            const blob = await new Promise<Blob>((resolve) => {
                canvasRef.current!.toBlob((b) => resolve(b!), 'image/png');
            });
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob }),
            ]);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast.success('QR kod panoya kopyalandı');
        } catch {
            toast.error('Kopyalama başarısız');
        }
    };

    return (
        <div className={cn('flex flex-col items-center gap-3', className)}>
            <div className="bg-white p-3 rounded-xl shadow-sm border border-border">
                <canvas ref={canvasRef} />
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5">
                    <Download className="w-3.5 h-3.5" />
                    İndir
                </Button>
                <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
                    <Printer className="w-3.5 h-3.5" />
                    Yazdır
                </Button>
                <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
                    {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Kopyalandı' : 'Kopyala'}
                </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
                {product.urunKodu} • {product.rafKonum}
            </p>
        </div>
    );
}
