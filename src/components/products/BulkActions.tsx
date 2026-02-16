import { Printer, Trash2, MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Product } from '@/types/stock';
import { printBarcodeLabels } from './BarcodeLabel';

interface BulkActionsProps {
  selectedProducts: Product[];
  onClearSelection: () => void;
  onBulkDelete?: (ids: string[]) => void;
}

export function BulkActions({ selectedProducts, onClearSelection, onBulkDelete }: BulkActionsProps) {
  if (selectedProducts.length === 0) return null;

  return (
    <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg animate-fade-in">
      <span className="text-sm font-medium text-foreground mr-2">
        {selectedProducts.length} ürün seçildi
      </span>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => printBarcodeLabels(selectedProducts)}
        className="gap-1.5"
      >
        <Printer className="w-3.5 h-3.5" />
        Etiket Yazdır
      </Button>

      {onBulkDelete && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onBulkDelete(selectedProducts.map(p => p.id))}
          className="gap-1.5 text-destructive hover:text-destructive"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Sil
        </Button>
      )}
      
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearSelection}
        className="ml-auto gap-1"
      >
        <X className="w-3.5 h-3.5" />
        Temizle
      </Button>
    </div>
  );
}
