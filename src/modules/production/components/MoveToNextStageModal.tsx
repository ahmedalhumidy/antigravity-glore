import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProductionMove } from '../hooks/useProductionMove';
import { useProductionUnits, ProductionUnit } from '../hooks/useProductionUnits';
import { ProductionStage } from '../hooks/useProductionStage';
import { Loader2, ScanBarcode } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStage: ProductionStage;
  nextStage: ProductionStage | null;
  units: ProductionUnit[];
}

export default function MoveToNextStageModal({ open, onOpenChange, currentStage, nextStage, units }: Props) {
  const [barcode, setBarcode] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [operator, setOperator] = useState('');
  const [note, setNote] = useState('');
  const [step, setStep] = useState<'scan' | 'confirm'>('scan');

  const moveMutation = useProductionMove();

  const selectedUnit = units.find(u => u.id === selectedUnitId);

  const handleBarcodeSearch = () => {
    const found = units.find(u => u.barcode === barcode.trim());
    if (found) {
      setSelectedUnitId(found.id);
      setStep('confirm');
    }
  };

  const handleSelectUnit = (unitId: string) => {
    setSelectedUnitId(unitId);
    const unit = units.find(u => u.id === unitId);
    if (unit) setBarcode(unit.barcode);
    setStep('confirm');
  };

  const handleMove = () => {
    if (!selectedUnitId || !nextStage || !operator.trim()) return;
    moveMutation.mutate(
      {
        unitId: selectedUnitId,
        fromStageId: currentStage.id,
        toStageId: nextStage.id,
        quantity: parseInt(quantity) || 1,
        operator: operator.trim(),
        note: note.trim() || undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          resetForm();
        },
      }
    );
  };

  const resetForm = () => {
    setBarcode('');
    setSelectedUnitId('');
    setQuantity('1');
    setOperator('');
    setNote('');
    setStep('scan');
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) resetForm();
    onOpenChange(v);
  };

  if (!nextStage) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {currentStage.name} → {nextStage.name}
          </DialogTitle>
        </DialogHeader>

        {step === 'scan' ? (
          <div className="space-y-4">
            {/* Barcode input */}
            <div className="space-y-2">
              <Label>Barkod Tara / Gir</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Barkod..."
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleBarcodeSearch()}
                  autoFocus
                />
                <Button variant="outline" size="icon" onClick={handleBarcodeSearch}>
                  <ScanBarcode className="w-4 h-4" />
                </Button>
              </div>
              {barcode.trim() && !units.find(u => u.barcode === barcode.trim()) && (
                <p className="text-xs text-destructive">Bu barkod bu aşamada bulunamadı</p>
              )}
            </div>

            {/* Or pick from list */}
            {units.length > 0 && (
              <div className="space-y-2">
                <Label>veya listeden seç</Label>
                <Select onValueChange={handleSelectUnit}>
                  <SelectTrigger>
                    <SelectValue placeholder="Birim seç..." />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.barcode} {u.product ? `— ${u.product.urun_kodu}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Selected unit info */}
            {selectedUnit && (
              <div className="p-3 rounded-lg bg-muted text-sm space-y-1">
                <p><span className="font-medium">Barkod:</span> {selectedUnit.barcode}</p>
                {selectedUnit.product && (
                  <p><span className="font-medium">Ürün:</span> {selectedUnit.product.urun_kodu} — {selectedUnit.product.urun_adi}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Miktar</Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Operatör *</Label>
              <Input
                placeholder="İsim..."
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Not (opsiyonel)</Label>
              <Textarea
                placeholder="Açıklama..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === 'confirm' && (
            <Button variant="outline" onClick={() => setStep('scan')}>
              Geri
            </Button>
          )}
          {step === 'confirm' && (
            <Button
              onClick={handleMove}
              disabled={!operator.trim() || moveMutation.isPending}
            >
              {moveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Gönder
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
