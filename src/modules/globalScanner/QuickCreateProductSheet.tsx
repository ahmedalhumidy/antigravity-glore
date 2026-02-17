import { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShelfSelector } from '@/components/shelves/ShelfSelector';
import { useShelves } from '@/hooks/useShelves';
import { useGlobalScanner } from './GlobalScannerProvider';
import { useProducts } from '@/hooks/useProducts';
import { Barcode, Package } from 'lucide-react';
import { toast } from 'sonner';

export function QuickCreateProductSheet() {
  const { quickCreateOpen, quickCreateBarcode, closeQuickCreate, openCopilot } = useGlobalScanner();
  const { shelves, addShelf } = useShelves();
  const { addProduct } = useProducts();

  const [name, setName] = useState('');
  const [code, setCode] = useState(() => `URN-${Date.now().toString(36).toUpperCase()}`);
  const [shelfId, setShelfId] = useState('');
  const [shelfName, setShelfName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Ürün adı gerekli'); return; }
    if (!shelfName) { toast.error('Raf seçimi gerekli'); return; }

    setSaving(true);
    const newProduct = await addProduct({
      urunKodu: code,
      urunAdi: name.trim(),
      rafKonum: shelfName,
      barkod: quickCreateBarcode,
      acilisStok: 0,
      toplamGiris: 0,
      toplamCikis: 0,
      mevcutStok: 0,
      setStok: 0,
      minStok: 5,
      uyari: false,
    });
    setSaving(false);

    if (newProduct) {
      closeQuickCreate();
      setName('');
      setCode(`URN-${Date.now().toString(36).toUpperCase()}`);
      setShelfId('');
      setShelfName('');
      openCopilot(newProduct);
    }
  };

  return (
    <Drawer open={quickCreateOpen} onOpenChange={(open) => { if (!open) closeQuickCreate(); }}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Hızlı Ürün Ekle
          </DrawerTitle>
        </DrawerHeader>

        <div className="px-4 space-y-4">
          {/* Barcode (read-only) */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Barcode className="w-4 h-4" />
              Barkod
            </Label>
            <Input value={quickCreateBarcode} readOnly className="bg-muted" />
          </div>

          {/* Product Code */}
          <div className="space-y-2">
            <Label>Ürün Kodu *</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ürün kodu"
            />
          </div>

          {/* Product Name */}
          <div className="space-y-2">
            <Label>Ürün Adı *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ürün adını girin"
              autoFocus
            />
          </div>

          {/* Shelf */}
          <ShelfSelector
            shelves={shelves}
            selectedShelfId={shelfId}
            onSelect={(shelf) => { setShelfId(shelf.id); setShelfName(shelf.name); }}
            onAddNew={addShelf}
            required
          />
        </div>

        <DrawerFooter>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? 'Kaydediliyor...' : 'Kaydet ve Devam Et'}
          </Button>
          <Button variant="outline" onClick={closeQuickCreate}>
            İptal
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
