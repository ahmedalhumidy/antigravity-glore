import { useState, useMemo, useCallback, useRef } from 'react';
import { useAllStoreProducts } from '../hooks/useStoreProducts';
import { useProducts } from '@/hooks/useProducts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Store, Eye, EyeOff, Tag, Trash2, Upload } from 'lucide-react';
import { ImageUploader } from '../components/ImageUploader';
import { AdminDataGrid } from '../components/AdminDataGrid';
import type { StoreProduct } from '../types';
import { useQueryClient } from '@tanstack/react-query';

const BADGES = ['', 'Yeni', 'İndirim', 'Özel', 'Tükendi'];

export default function AdminMagazaPage() {
  const { products: storeProducts, isLoading, refetch } = useAllStoreProducts();
  const { products: warehouseProducts } = useProducts();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StoreProduct | null>(null);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<StoreProduct | null>(null);
  const [quickUploadItem, setQuickUploadItem] = useState<StoreProduct | null>(null);
  const quickUploadRef = useRef<HTMLInputElement>(null);

  // Search / filter / sort state
  const [searchQ, setSearchQ] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterVisible, setFilterVisible] = useState('');
  const [filterBadge, setFilterBadge] = useState('');
  const [filterPriceMode, setFilterPriceMode] = useState('');
  const [filterStock, setFilterStock] = useState('');
  const [sortBy, setSortBy] = useState('');

  const [form, setForm] = useState({
    product_id: '', slug: '', visible: false, title_override: '', description_override: '',
    price: '', compare_price: '', badge: '', category: '', allow_quote: true, allow_cart: true,
    show_stock: false, min_qty: 1, max_qty: '', order_step: 1, sort_order: 0,
  });

  // Derived data
  const existingCategories = useMemo(() =>
    Array.from(new Set(storeProducts.map(sp => sp.category).filter(Boolean) as string[])).sort(),
    [storeProducts]
  );

  const publishedIds = useMemo(() => new Set(storeProducts.map(sp => sp.product_id)), [storeProducts]);
  const unpublishedProducts = useMemo(() => warehouseProducts.filter(wp => !publishedIds.has(wp.id)), [warehouseProducts, publishedIds]);

  // Filtered + sorted data
  const filteredData = useMemo(() => {
    let list = [...storeProducts];

    if (searchQ) {
      const q = searchQ.toLowerCase();
      list = list.filter(sp =>
        (sp.title_override || sp.product?.urun_adi || '').toLowerCase().includes(q) ||
        (sp.product?.urun_kodu || '').toLowerCase().includes(q) ||
        sp.slug.toLowerCase().includes(q)
      );
    }

    if (filterCategory) list = list.filter(sp => sp.category === filterCategory);
    if (filterVisible === 'yes') list = list.filter(sp => sp.visible);
    if (filterVisible === 'no') list = list.filter(sp => !sp.visible);
    if (filterBadge) list = list.filter(sp => sp.badge === filterBadge);
    if (filterPriceMode === 'fiyatli') list = list.filter(sp => sp.price != null && sp.price > 0);
    if (filterPriceMode === 'teklif') list = list.filter(sp => sp.price == null || sp.price === 0);
    if (filterStock === 'stokta') list = list.filter(sp => (sp.product?.mevcut_stok ?? 0) > 0);
    if (filterStock === 'tukendi') list = list.filter(sp => (sp.product?.mevcut_stok ?? 0) <= 0);

    if (sortBy === 'newest') list.sort((a, b) => b.created_at.localeCompare(a.created_at));
    if (sortBy === 'title') list.sort((a, b) => (a.title_override || a.product?.urun_adi || '').localeCompare(b.title_override || b.product?.urun_adi || ''));
    if (sortBy === 'price') list.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    if (sortBy === 'visible') list.sort((a, b) => (b.visible ? 1 : 0) - (a.visible ? 1 : 0));

    return list;
  }, [storeProducts, searchQ, filterCategory, filterVisible, filterBadge, filterPriceMode, filterStock, sortBy]);

  // ---------- Form helpers ----------
  const resetForm = () => {
    setForm({
      product_id: '', slug: '', visible: false, title_override: '', description_override: '',
      price: '', compare_price: '', badge: '', category: '', allow_quote: true, allow_cart: true,
      show_stock: false, min_qty: 1, max_qty: '', order_step: 1, sort_order: 0,
    });
    setEditing(null);
    setProductImages([]);
  };

  const openEdit = (sp: StoreProduct) => {
    setEditing(sp);
    const existingImages = (sp.product?.images as string[] | null) || [];
    setProductImages(existingImages);
    setForm({
      product_id: sp.product_id,
      slug: sp.slug,
      visible: sp.visible,
      title_override: sp.title_override || '',
      description_override: sp.description_override || '',
      price: sp.price?.toString() || '',
      compare_price: sp.compare_price?.toString() || '',
      badge: sp.badge || '',
      category: sp.category || '',
      allow_quote: sp.allow_quote,
      allow_cart: sp.allow_cart,
      show_stock: sp.show_stock,
      min_qty: sp.min_qty,
      max_qty: sp.max_qty?.toString() || '',
      order_step: sp.order_step,
      sort_order: sp.sort_order,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.product_id || !form.slug.trim()) {
      toast.error('Ürün ve slug zorunlu');
      return;
    }

    // Check slug uniqueness
    const slugVal = form.slug.trim().toLowerCase().replace(/\s+/g, '-');
    const duplicate = storeProducts.find(sp => sp.slug === slugVal && sp.id !== editing?.id);
    if (duplicate) {
      toast.error('Bu slug zaten kullanılıyor');
      return;
    }

    const payload = {
      product_id: form.product_id,
      slug: slugVal,
      visible: form.visible,
      title_override: form.title_override || null,
      description_override: form.description_override || null,
      price: form.price ? parseFloat(form.price) : null,
      compare_price: form.compare_price ? parseFloat(form.compare_price) : null,
      badge: form.badge || null,
      category: form.category || null,
      allow_quote: form.allow_quote,
      allow_cart: form.allow_cart,
      show_stock: form.show_stock,
      min_qty: form.min_qty,
      max_qty: form.max_qty ? parseInt(form.max_qty) : null,
      order_step: form.order_step,
      sort_order: form.sort_order,
    };

    try {
      if (form.product_id && productImages.length > 0) {
        await supabase.from('products').update({ images: productImages }).eq('id', form.product_id);
      }
      if (editing) {
        const { error } = await supabase.from('store_products').update(payload).eq('id', editing.id);
        if (error) throw error;
        toast.success('Güncellendi');
      } else {
        const { error } = await supabase.from('store_products').insert(payload);
        if (error) throw error;
        toast.success('Eklendi');
      }
      setDialogOpen(false);
      resetForm();
      refetch();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (sp: StoreProduct) => {
    setDeleteConfirm(sp);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    const { error } = await supabase.from('store_products').delete().eq('id', deleteConfirm.id);
    if (error) toast.error(error.message);
    else { toast.success('Kaldırıldı'); refetch(); }
    setDeleteConfirm(null);
  };

  const toggleVisibility = async (sp: StoreProduct, visible: boolean) => {
    // Optimistic update
    queryClient.setQueryData(['admin-store-products'], (old: StoreProduct[] | undefined) =>
      old?.map(item => item.id === sp.id ? { ...item, visible } : item)
    );
    const { error } = await supabase.from('store_products').update({ visible }).eq('id', sp.id);
    if (error) {
      toast.error(error.message);
      refetch();
    }
  };

  // Bulk actions
  const handleBulkAction = async (action: string, ids: string[]) => {
    const updates: Record<string, any> = {};
    if (action === 'publish') updates.visible = true;
    if (action === 'unpublish') updates.visible = false;
    if (action === 'allow_quote_on') updates.allow_quote = true;
    if (action === 'allow_quote_off') updates.allow_quote = false;
    if (action === 'allow_cart_on') updates.allow_cart = true;
    if (action === 'allow_cart_off') updates.allow_cart = false;
    if (action === 'show_stock_on') updates.show_stock = true;
    if (action === 'show_stock_off') updates.show_stock = false;
    if (action === 'mark_teklif') updates.price = null;

    if (action === 'delete') {
      for (const id of ids) {
        await supabase.from('store_products').delete().eq('id', id);
      }
      refetch();
      return;
    }

    if (Object.keys(updates).length > 0) {
      for (const id of ids) {
        await supabase.from('store_products').update(updates).eq('id', id);
      }
      refetch();
    }
  };

  // Quick image upload
  const handleQuickUpload = async (files: FileList) => {
    if (!quickUploadItem) return;
    const existingImages = (quickUploadItem.product?.images as string[] | null) || [];
    const newUrls: string[] = [];

    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) { toast.error('Dosya 5MB\'dan büyük'); continue; }
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `store/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from('product-images').upload(path, file, { cacheControl: '3600', upsert: false });
      if (error) { toast.error(error.message); continue; }
      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path);
      newUrls.push(urlData.publicUrl);
    }

    if (newUrls.length > 0) {
      await supabase.from('products').update({ images: [...existingImages, ...newUrls] }).eq('id', quickUploadItem.product_id);
      toast.success(`${newUrls.length} görsel eklendi`);
      refetch();
    }
    setQuickUploadItem(null);
  };

  // Preview / link
  const handlePreview = (sp: StoreProduct) => {
    window.open(`/magaza/urun/${sp.slug}`, '_blank');
  };

  const handleCopyLink = (sp: StoreProduct) => {
    navigator.clipboard.writeText(`${window.location.origin}/magaza/urun/${sp.slug}`);
    toast.success('Link kopyalandı');
  };

  // ---------- Grid config ----------
  const columns = useMemo(() => [
    {
      key: 'title',
      label: 'Ürün',
      render: (sp: StoreProduct) => (
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{sp.title_override || sp.product?.urun_adi}</p>
          <p className="text-[11px] text-muted-foreground font-mono">{sp.product?.urun_kodu}</p>
        </div>
      ),
    },
    {
      key: 'slug',
      label: 'Slug',
      render: (sp: StoreProduct) => <span className="text-xs font-mono text-muted-foreground">{sp.slug}</span>,
      hideOnMobile: true,
    },
    {
      key: 'price',
      label: 'Fiyat',
      width: '100px',
      render: (sp: StoreProduct) => sp.price != null && sp.price > 0
        ? (
          <div>
            <span className="font-medium text-sm">₺{Number(sp.price).toLocaleString('tr-TR')}</span>
            {sp.compare_price && <span className="text-xs text-muted-foreground line-through ml-1">₺{Number(sp.compare_price).toLocaleString('tr-TR')}</span>}
          </div>
        )
        : <Badge variant="outline" className="text-[10px]">Teklif</Badge>,
    },
    {
      key: 'badge',
      label: 'Badge',
      width: '80px',
      render: (sp: StoreProduct) => sp.badge ? <Badge variant="secondary" className="text-[10px]">{sp.badge}</Badge> : <span className="text-muted-foreground">—</span>,
      hideOnMobile: true,
    },
    {
      key: 'category',
      label: 'Kategori',
      width: '110px',
      render: (sp: StoreProduct) => sp.category ? <span className="text-xs">{sp.category}</span> : <span className="text-muted-foreground">—</span>,
      hideOnMobile: true,
    },
    {
      key: 'status',
      label: 'Durum',
      width: '80px',
      render: (sp: StoreProduct) => (
        <Badge variant={sp.visible ? 'default' : 'secondary'} className="text-[10px]">
          {sp.visible ? 'Yayında' : 'Gizli'}
        </Badge>
      ),
    },
    {
      key: 'visible',
      label: 'Görünür',
      width: '70px',
      render: (sp: StoreProduct) => (
        <Switch
          checked={sp.visible}
          onCheckedChange={v => toggleVisibility(sp, v)}
        />
      ),
    },
  ], [storeProducts]);

  const filterConfigs = useMemo(() => [
    {
      key: 'category',
      label: 'Kategori',
      options: existingCategories.map(c => ({ label: c, value: c })),
    },
    {
      key: 'visible',
      label: 'Görünürlük',
      options: [{ label: 'Yayında', value: 'yes' }, { label: 'Gizli', value: 'no' }],
    },
    {
      key: 'badge',
      label: 'Badge',
      options: BADGES.filter(Boolean).map(b => ({ label: b, value: b })),
    },
    {
      key: 'priceMode',
      label: 'Fiyat',
      options: [{ label: 'Fiyatlı', value: 'fiyatli' }, { label: 'Teklif', value: 'teklif' }],
    },
    {
      key: 'stock',
      label: 'Stok',
      options: [{ label: 'Stokta', value: 'stokta' }, { label: 'Tükendi', value: 'tukendi' }],
    },
  ], [existingCategories]);

  const bulkActions = useMemo(() => [
    { key: 'publish', label: 'Yayınla', icon: <Eye className="w-3 h-3 mr-1" /> },
    { key: 'unpublish', label: 'Gizle', icon: <EyeOff className="w-3 h-3 mr-1" /> },
    { key: 'mark_teklif', label: 'Teklif Yap', icon: <Tag className="w-3 h-3 mr-1" /> },
    { key: 'delete', label: 'Sil', icon: <Trash2 className="w-3 h-3 mr-1" />, variant: 'destructive' as const, requiresConfirm: true },
  ], []);

  const sortOpts = [
    { label: 'En Yeni', value: 'newest' },
    { label: 'Başlık', value: 'title' },
    { label: 'Fiyat', value: 'price' },
    { label: 'Görünür', value: 'visible' },
  ];

  // Handle filter callbacks
  const onFilterChange = useCallback((key: string, value: string) => {
    if (key === 'category') setFilterCategory(value === '__all__' ? '' : value);
    if (key === 'visible') setFilterVisible(value === '__all__' ? '' : value);
    if (key === 'badge') setFilterBadge(value === '__all__' ? '' : value);
    if (key === 'priceMode') setFilterPriceMode(value === '__all__' ? '' : value);
    if (key === 'stock') setFilterStock(value === '__all__' ? '' : value);
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Store className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold">Mağaza Yönetimi</h2>
            <p className="text-sm text-muted-foreground">
              {storeProducts.length} ürün • {storeProducts.filter(sp => sp.visible).length} yayında
            </p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }} size="sm">
          <Plus className="w-4 h-4 mr-1.5" />Ürün Yayınla
        </Button>
      </div>

      {/* Data Grid */}
      <AdminDataGrid
        data={filteredData}
        columns={columns}
        filters={filterConfigs}
        bulkActions={bulkActions}
        sortOptions={sortOpts}
        isLoading={isLoading}
        searchPlaceholder="Ürün, kod veya slug ara... (/ ile odakla)"
        emptyMessage="Henüz mağaza ürünü eklenmemiş"
        onSearch={setSearchQ}
        onFilter={onFilterChange}
        onSort={setSortBy}
        onBulkAction={handleBulkAction}
        onEdit={openEdit}
        onDelete={handleDelete}
        onPreview={handlePreview}
        onCopyLink={handleCopyLink}
        onQuickUpload={(sp) => { setQuickUploadItem(sp); setTimeout(() => quickUploadRef.current?.click(), 100); }}
        getItemImage={(sp) => {
          const imgs = sp.product?.images as string[] | null;
          return imgs?.[0] || null;
        }}
        getItemTitle={(sp) => sp.title_override || sp.product?.urun_adi || ''}
        getItemSubtitle={(sp) => `${sp.product?.urun_kodu || ''} • ${sp.slug}`}
        getIsVisible={(sp) => sp.visible}
        onToggleVisible={(sp, v) => toggleVisibility(sp, v)}
      />

      {/* Hidden quick upload input */}
      <input
        ref={quickUploadRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => e.target.files && handleQuickUpload(e.target.files)}
      />

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ürünü Kaldır</DialogTitle>
            <DialogDescription>
              "{deleteConfirm?.title_override || deleteConfirm?.product?.urun_adi}" mağazadan kaldırılacak. Devam edilsin mi?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>İptal</Button>
            <Button variant="destructive" onClick={confirmDelete}>Kaldır</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) { setDialogOpen(false); resetForm(); } else setDialogOpen(true); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Ürünü Düzenle' : 'Yeni Ürün Yayınla'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Product selector */}
            {!editing && (
              <div>
                <Label>Depo Ürünü *</Label>
                <Select value={form.product_id} onValueChange={v => {
                  const wp = warehouseProducts.find(p => p.id === v);
                  setForm(f => ({
                    ...f,
                    product_id: v,
                    slug: f.slug || (wp?.urunKodu || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                  }));
                }}>
                  <SelectTrigger><SelectValue placeholder="Ürün seçin" /></SelectTrigger>
                  <SelectContent>
                    {unpublishedProducts.map(wp => (
                      <SelectItem key={wp.id} value={wp.id}>{wp.urunKodu} — {wp.urunAdi}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Slug *</Label>
              <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="urun-adi" />
              <p className="text-[10px] text-muted-foreground mt-1">URL adresi: /magaza/urun/{form.slug || '...'}</p>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fiyat (₺)</Label>
                <Input type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="Boş = Teklif" />
              </div>
              <div>
                <Label>Karşılaştırma Fiyatı</Label>
                <Input type="number" step="0.01" value={form.compare_price} onChange={e => setForm(f => ({ ...f, compare_price: e.target.value }))} />
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setForm(f => ({ ...f, price: '', compare_price: '' }))}
            >
              <Tag className="w-3 h-3 mr-1" />Teklif Olarak İşaretle
            </Button>

            {/* Images */}
            <div>
              <Label>Ürün Görselleri</Label>
              <ImageUploader images={productImages} onChange={setProductImages} folder="store" />
            </div>

            {/* Overrides */}
            <div>
              <Label>Başlık (override)</Label>
              <Input value={form.title_override} onChange={e => setForm(f => ({ ...f, title_override: e.target.value }))} placeholder="Boş = depo adı" />
            </div>
            <div>
              <Label>Açıklama (override)</Label>
              <Textarea value={form.description_override} onChange={e => setForm(f => ({ ...f, description_override: e.target.value }))} rows={2} placeholder="Boş = depo açıklaması" />
            </div>

            {/* Badge & Category */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Badge</Label>
                <Select value={form.badge} onValueChange={v => setForm(f => ({ ...f, badge: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Yok" /></SelectTrigger>
                  <SelectContent>
                    {BADGES.map(b => <SelectItem key={b || 'none'} value={b || 'none'}>{b || 'Yok'}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Kategori</Label>
                <Input
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  placeholder="Kategori adı"
                  list="cat-suggest"
                />
                <datalist id="cat-suggest">
                  {existingCategories.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
            </div>

            {/* Quantities */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Min Adet</Label>
                <Input type="number" value={form.min_qty} onChange={e => setForm(f => ({ ...f, min_qty: parseInt(e.target.value) || 1 }))} />
              </div>
              <div>
                <Label>Max Adet</Label>
                <Input type="number" value={form.max_qty} onChange={e => setForm(f => ({ ...f, max_qty: e.target.value }))} placeholder="∞" />
              </div>
              <div>
                <Label>Sıra</Label>
                <Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>

            {/* Toggles */}
            <div className="rounded-lg border border-border p-3 space-y-3">
              {[
                { label: 'Görünür (Yayında)', key: 'visible' },
                { label: 'Teklif İzin Ver', key: 'allow_quote' },
                { label: 'Sepet İzin Ver', key: 'allow_cart' },
                { label: 'Stok Göster', key: 'show_stock' },
              ].map(t => (
                <div key={t.key} className="flex items-center justify-between">
                  <Label className="text-sm">{t.label}</Label>
                  <Switch
                    checked={(form as any)[t.key]}
                    onCheckedChange={v => setForm(f => ({ ...f, [t.key]: v }))}
                  />
                </div>
              ))}
            </div>

            <Button onClick={handleSave} className="w-full">{editing ? 'Güncelle' : 'Yayınla'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
