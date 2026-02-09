import { useState } from 'react';
import { PlusCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/stock';
import { toast } from 'sonner';
import { ShelfSelector } from '@/components/shelves/ShelfSelector';
import { useShelves, Shelf } from '@/hooks/useShelves';

interface ScanSessionQuickAddProps {
  isOpen: boolean;
  onClose: () => void;
  barcode: string;
  activeShelfId?: string | null;
  activeShelfName?: string | null;
  onProductCreated: (product: Product) => void;
}

export function ScanSessionQuickAdd({ isOpen, onClose, barcode, activeShelfId, activeShelfName, onProductCreated }: ScanSessionQuickAddProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState(barcode);
  const [category, setCategory] = useState('');
  const [selectedShelf, setSelectedShelf] = useState<Shelf | null>(() => {
    if (activeShelfId && activeShelfName) {
      return { id: activeShelfId, name: activeShelfName, created_at: '' };
    }
    return null;
  });
  const [initialUnits, setInitialUnits] = useState(0);
  const [initialSets, setInitialSets] = useState(0);
  const [saving, setSaving] = useState(false);
  const { shelves, addShelf } = useShelves();

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Ürün adı zorunludur');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .insert({
          urun_kodu: code || barcode,
          urun_adi: name.trim(),
          barkod: barcode,
          raf_konum: selectedShelf?.name || 'Genel',
          category: category || null,
          acilis_stok: initialUnits,
          mevcut_stok: initialUnits,
          set_stok: initialSets,
          min_stok: 5,
        })
        .select()
        .single();

      if (error) throw error;

      const product: Product = {
        id: data.id,
        urunKodu: data.urun_kodu,
        urunAdi: data.urun_adi,
        barkod: data.barkod || undefined,
        rafKonum: data.raf_konum,
        acilisStok: data.acilis_stok,
        toplamGiris: data.toplam_giris,
        toplamCikis: data.toplam_cikis,
        mevcutStok: data.mevcut_stok,
        setStok: data.set_stok,
        minStok: data.min_stok,
        uyari: data.uyari,
        sonIslemTarihi: data.son_islem_tarihi || undefined,
      };

      toast.success(`"${name}" ürünü eklendi`);
      onProductCreated(product);
    } catch (err: any) {
      console.error('Quick add error:', err);
      toast.error('Ürün eklenirken hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-primary" />
            Hızlı Ürün Ekle
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs">Barkod</Label>
            <Input value={barcode} disabled className="mt-1 bg-muted/50" />
          </div>

          <div>
            <Label className="text-xs">Ürün Kodu</Label>
            <Input value={code} onChange={e => setCode(e.target.value)} className="mt-1" placeholder="Ürün kodu" />
          </div>

          <div>
            <Label className="text-xs">
              Ürün Adı <span className="text-destructive">*</span>
            </Label>
            <Input value={name} onChange={e => setName(e.target.value)} className="mt-1" placeholder="Ürün adı" autoFocus />
          </div>

          <div>
            <Label className="text-xs">Kategori</Label>
            <Input value={category} onChange={e => setCategory(e.target.value)} className="mt-1" placeholder="İsteğe bağlı" />
          </div>

          <ShelfSelector
            shelves={shelves}
            selectedShelfId={selectedShelf?.id}
            selectedShelfName={selectedShelf?.name}
            onSelect={setSelectedShelf}
            onAddNew={addShelf}
            label="Raf / Konum"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Başlangıç Adet</Label>
              <Input
                type="number"
                value={initialUnits}
                onChange={e => setInitialUnits(Math.max(0, parseInt(e.target.value) || 0))}
                className="mt-1"
                min={0}
              />
            </div>
            <div>
              <Label className="text-xs">Başlangıç Set</Label>
              <Input
                type="number"
                value={initialSets}
                onChange={e => setInitialSets(Math.max(0, parseInt(e.target.value) || 0))}
                className="mt-1"
                min={0}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
              İptal
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Kaydet
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
