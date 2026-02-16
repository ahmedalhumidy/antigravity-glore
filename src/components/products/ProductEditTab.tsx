import { useState, useEffect, useRef, useMemo } from 'react';
import { Product } from '@/types/stock';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ShelfSelector } from '@/components/shelves/ShelfSelector';
import { useShelves, Shelf } from '@/hooks/useShelves';
import { CustomFieldsSection } from '@/modules/dynamic-forms/components/CustomFieldsSection';
import type { CustomFieldValuesMap } from '@/modules/dynamic-forms/types';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Save, Archive, ArrowRight, AlertTriangle, CheckCircle2, Hash, Type, MapPin, Package, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface ProductEditTabProps {
  product: Product;
  onSave: (product: Product) => Promise<boolean | void>;
  onDelete: (id: string) => Promise<boolean | void>;
  onSaved?: () => void;
  onDeleted?: () => void;
}

interface FormData {
  urunKodu: string;
  urunAdi: string;
  rafKonum: string;
  barkod: string;
  minStok: number;
  not: string;
  category: string;
}

function getInitialFormData(product: Product): FormData {
  return {
    urunKodu: product.urunKodu,
    urunAdi: product.urunAdi,
    rafKonum: product.rafKonum,
    barkod: product.barkod || '',
    minStok: product.minStok,
    not: product.not || '',
    category: product.category || '',
  };
}

export function ProductEditTab({ product, onSave, onDelete, onSaved, onDeleted }: ProductEditTabProps) {
  const { shelves, addShelf } = useShelves();
  const [selectedShelfId, setSelectedShelfId] = useState<string | undefined>();
  const [formData, setFormData] = useState<FormData>(getInitialFormData(product));
  const [saving, setSaving] = useState(false);
  const customFieldsRef = useRef<{
    values: CustomFieldValuesMap;
    save: (entityId: string) => Promise<boolean>;
  } | null>(null);

  // Reset form when product changes
  useEffect(() => {
    setFormData(getInitialFormData(product));
    const matchingShelf = shelves.find(s => s.name === product.rafKonum);
    setSelectedShelfId(matchingShelf?.id);
  }, [product.id, shelves]);

  const handleShelfSelect = (shelf: Shelf) => {
    setSelectedShelfId(shelf.id);
    setFormData(prev => ({ ...prev, rafKonum: shelf.name }));
  };

  // Change detection
  const changes = useMemo(() => {
    const diffs: { field: string; label: string; oldVal: string; newVal: string }[] = [];
    if (formData.urunKodu !== product.urunKodu)
      diffs.push({ field: 'urunKodu', label: 'Ürün Kodu', oldVal: product.urunKodu, newVal: formData.urunKodu });
    if (formData.urunAdi !== product.urunAdi)
      diffs.push({ field: 'urunAdi', label: 'Ürün Adı', oldVal: product.urunAdi, newVal: formData.urunAdi });
    if (formData.rafKonum !== product.rafKonum)
      diffs.push({ field: 'rafKonum', label: 'Raf Konum', oldVal: product.rafKonum, newVal: formData.rafKonum });
    if (formData.barkod !== (product.barkod || ''))
      diffs.push({ field: 'barkod', label: 'Barkod', oldVal: product.barkod || '—', newVal: formData.barkod || '—' });
    if (formData.minStok !== product.minStok)
      diffs.push({ field: 'minStok', label: 'Min Stok', oldVal: String(product.minStok), newVal: String(formData.minStok) });
    if (formData.not !== (product.not || ''))
      diffs.push({ field: 'not', label: 'Not', oldVal: product.not || '—', newVal: formData.not || '—' });
    if (formData.category !== (product.category || ''))
      diffs.push({ field: 'category', label: 'Kategori', oldVal: product.category || '—', newVal: formData.category || '—' });
    return diffs;
  }, [formData, product]);

  const hasChanges = changes.length > 0;

  const handleSave = async () => {
    if (!formData.urunKodu.trim()) {
      toast.error('Ürün kodu zorunludur');
      return;
    }
    if (!formData.urunAdi.trim()) {
      toast.error('Ürün adı zorunludur');
      return;
    }
    if (formData.urunAdi.length > 200) {
      toast.error('Ürün adı en fazla 200 karakter olabilir');
      return;
    }

    setSaving(true);
    try {
      const updatedProduct: Product = {
        ...product,
        urunKodu: formData.urunKodu.trim(),
        urunAdi: formData.urunAdi.trim(),
        rafKonum: formData.rafKonum,
        barkod: formData.barkod.trim() || undefined,
        minStok: formData.minStok,
        not: formData.not.trim() || undefined,
        category: formData.category.trim() || undefined,
        uyari: product.mevcutStok < formData.minStok,
        sonIslemTarihi: new Date().toISOString().split('T')[0],
      };

      await onSave(updatedProduct);

      // Save custom fields
      if (customFieldsRef.current) {
        await customFieldsRef.current.save(product.id);
      }

      onSaved?.();
    } catch {
      toast.error('Güncelleme sırasında hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    await onDelete(product.id);
    onDeleted?.();
  };

  return (
    <div className="space-y-6">
      {/* Product Identity */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Hash className="w-4 h-4" />
          <span>Ürün Kimliği</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="edit-urunKodu" className="text-xs">Ürün Kodu *</Label>
            <Input
              id="edit-urunKodu"
              value={formData.urunKodu}
              onChange={(e) => setFormData(prev => ({ ...prev, urunKodu: e.target.value }))}
              placeholder="Örn: 85426"
              required
              className="h-11 sm:h-9 rounded-lg"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-barkod" className="text-xs">Barkod</Label>
            <Input
              id="edit-barkod"
              value={formData.barkod}
              onChange={(e) => setFormData(prev => ({ ...prev, barkod: e.target.value }))}
              placeholder="Opsiyonel"
              className="h-11 sm:h-9 rounded-lg"
            />
          </div>
        </div>
      </section>

      <Separator />

      {/* Product Name */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Type className="w-4 h-4" />
          <span>Ürün Bilgileri</span>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="edit-urunAdi" className="text-xs">Ürün Adı *</Label>
            <span className={`text-xs ${formData.urunAdi.length > 180 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {formData.urunAdi.length}/200
            </span>
          </div>
          <Input
            id="edit-urunAdi"
            value={formData.urunAdi}
            onChange={(e) => setFormData(prev => ({ ...prev, urunAdi: e.target.value.slice(0, 200) }))}
            placeholder="Ürün adını girin"
            required
            className="h-11 sm:h-9 rounded-lg"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="edit-category" className="text-xs">Kategori</Label>
          <Input
            id="edit-category"
            value={formData.category}
            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
            placeholder="Opsiyonel kategori"
            className="h-11 sm:h-9 rounded-lg"
          />
        </div>
      </section>

      <Separator />

      {/* Shelf Location */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <MapPin className="w-4 h-4" />
          <span>Konum</span>
        </div>
        <ShelfSelector
          shelves={shelves}
          selectedShelfId={selectedShelfId}
          selectedShelfName={formData.rafKonum}
          onSelect={handleShelfSelect}
          onAddNew={addShelf}
          label=""
          placeholder="Raf seçin veya yeni ekleyin..."
          required
        />
      </section>

      <Separator />

      {/* Stock Config */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Package className="w-4 h-4" />
          <span>Stok Yapılandırması</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="edit-minStok" className="text-xs">Minimum Stok Eşiği</Label>
            <Input
              id="edit-minStok"
              type="number"
              min="0"
              value={formData.minStok}
              onChange={(e) => setFormData(prev => ({ ...prev, minStok: parseInt(e.target.value) || 0 }))}
              className="h-11 sm:h-9 rounded-lg"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Mevcut Stok</Label>
            <div className="h-11 sm:h-9 flex items-center px-3 rounded-lg bg-muted/50 text-sm font-medium">
              {product.mevcutStok} adet / {product.setStok} set
            </div>
          </div>
        </div>
      </section>

      <Separator />

      {/* Notes */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <FileText className="w-4 h-4" />
          <span>Notlar</span>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="edit-not" className="text-xs">Not</Label>
            <span className="text-xs text-muted-foreground">{formData.not.length}/500</span>
          </div>
          <Textarea
            id="edit-not"
            value={formData.not}
            onChange={(e) => setFormData(prev => ({ ...prev, not: e.target.value.slice(0, 500) }))}
            placeholder="Ek notlar..."
            rows={3}
            className="text-sm"
          />
        </div>
      </section>

      {/* Custom Fields */}
      <CustomFieldsSection
        entityId={product.id}
        entityType="product"
        valuesRef={customFieldsRef}
      />

      {/* Change Summary */}
      {hasChanges && (
        <>
          <Separator />
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-warning">
              <AlertTriangle className="w-4 h-4" />
              <span>Değişiklik Özeti</span>
              <Badge variant="secondary" className="text-xs">{changes.length}</Badge>
            </div>
            <div className="space-y-2">
              {changes.map((change) => (
                <div
                  key={change.field}
                  className="flex items-center gap-2 text-xs p-2 rounded-md bg-muted/50 border border-border"
                >
                  <span className="font-medium text-muted-foreground min-w-[80px]">{change.label}:</span>
                  <span className="text-destructive line-through truncate max-w-[120px]">{change.oldVal}</span>
                  <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  <span className="text-primary font-medium truncate max-w-[120px]">{change.newVal}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* Save Button */}
      <div className="sticky bottom-0 bg-background pt-3 pb-1 border-t border-border -mx-3 sm:-mx-4 px-3 sm:px-4">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className="w-full h-12 sm:h-10 rounded-xl sm:rounded-lg text-sm active:scale-[0.98] transition-transform"
        >
          {saving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-background border-t-transparent mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {saving ? 'Kaydediliyor...' : hasChanges ? 'Değişiklikleri Kaydet' : 'Değişiklik Yok'}
        </Button>
      </div>

      {/* Danger Zone */}
      <Separator />
      <section className="space-y-2 pb-6">
        <p className="text-xs text-muted-foreground">Tehlikeli İşlemler</p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10 h-8 text-xs">
              <Archive className="w-3.5 h-3.5 mr-1.5" />
              Ürünü Arşivle
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Ürünü arşivlemek istediğinize emin misiniz?</AlertDialogTitle>
              <AlertDialogDescription>
                <strong>{product.urunAdi}</strong> ({product.urunKodu}) arşivlenecek.
                Bu işlem geri alınabilir (Arşiv Yönetimi'nden).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>İptal</AlertDialogCancel>
              <AlertDialogAction onClick={handleArchive} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Arşivle
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </div>
  );
}
