import { useState, useMemo, useCallback, useRef } from 'react';
import { useAllGalleryProducts } from '../hooks/useGalleryProducts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Plus, Image as ImageIcon, Eye, EyeOff, Trash2, Upload } from 'lucide-react';
import { ImageUploader } from '../components/ImageUploader';
import { AdminDataGrid } from '../components/AdminDataGrid';
import type { GalleryProduct } from '../types';
import { useQueryClient } from '@tanstack/react-query';

export default function AdminGaleriPage() {
  const { products, isLoading, refetch } = useAllGalleryProducts();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GalleryProduct | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<GalleryProduct | null>(null);
  const [quickUploadItem, setQuickUploadItem] = useState<GalleryProduct | null>(null);
  const quickUploadRef = useRef<HTMLInputElement>(null);

  const [searchQ, setSearchQ] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterVisible, setFilterVisible] = useState('');
  const [sortBy, setSortBy] = useState('');

  const [form, setForm] = useState({
    title: '', slug: '', description: '',
    price_hint: '', category: '', tags: '', visible: false, sort_order: 0,
  });

  const existingCategories = useMemo(() =>
    Array.from(new Set(products.map(g => g.category).filter(Boolean) as string[])).sort(),
    [products]
  );

  const filteredData = useMemo(() => {
    let list = [...products];

    if (searchQ) {
      const q = searchQ.toLowerCase();
      list = list.filter(g =>
        g.title.toLowerCase().includes(q) ||
        (g.category || '').toLowerCase().includes(q) ||
        (g.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }

    if (filterCategory) list = list.filter(g => g.category === filterCategory);
    if (filterVisible === 'yes') list = list.filter(g => g.visible);
    if (filterVisible === 'no') list = list.filter(g => !g.visible);

    if (sortBy === 'newest') list.sort((a, b) => b.created_at.localeCompare(a.created_at));
    if (sortBy === 'title') list.sort((a, b) => a.title.localeCompare(b.title));
    if (sortBy === 'visible') list.sort((a, b) => (b.visible ? 1 : 0) - (a.visible ? 1 : 0));

    return list;
  }, [products, searchQ, filterCategory, filterVisible, sortBy]);

  const resetForm = () => {
    setForm({ title: '', slug: '', description: '', price_hint: '', category: '', tags: '', visible: false, sort_order: 0 });
    setUploadedImages([]);
    setEditing(null);
  };

  const openEdit = (g: GalleryProduct) => {
    setEditing(g);
    setUploadedImages(g.images || []);
    setForm({
      title: g.title, slug: g.slug || '', description: g.description || '',
      price_hint: g.price_hint?.toString() || '',
      category: g.category || '', tags: (g.tags || []).join(', '),
      visible: g.visible, sort_order: g.sort_order,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Başlık zorunlu'); return; }

    const slugVal = (form.slug.trim() || form.title.trim()).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    // Check uniqueness
    const duplicate = products.find(g => g.slug === slugVal && g.id !== editing?.id);
    if (duplicate) { toast.error('Bu slug zaten kullanılıyor'); return; }

    const payload = {
      title: form.title.trim(),
      slug: slugVal,
      description: form.description || null,
      images: uploadedImages,
      price_hint: form.price_hint ? parseFloat(form.price_hint) : null,
      category: form.category || null,
      tags: form.tags ? form.tags.split(',').map(s => s.trim()).filter(Boolean) : null,
      visible: form.visible,
      sort_order: form.sort_order,
    };

    try {
      if (editing) {
        const { error } = await supabase.from('gallery_products').update(payload).eq('id', editing.id);
        if (error) throw error;
        toast.success('Güncellendi');
      } else {
        const { error } = await supabase.from('gallery_products').insert(payload);
        if (error) throw error;
        toast.success('Eklendi');
      }
      setDialogOpen(false); resetForm(); refetch();
    } catch (err: any) { toast.error(err.message); }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    const { error } = await supabase.from('gallery_products').delete().eq('id', deleteConfirm.id);
    if (error) toast.error(error.message);
    else { toast.success('Silindi'); refetch(); }
    setDeleteConfirm(null);
  };

  const toggleVisibility = async (g: GalleryProduct, visible: boolean) => {
    queryClient.setQueryData(['admin-gallery-products'], (old: GalleryProduct[] | undefined) =>
      old?.map(item => item.id === g.id ? { ...item, visible } : item)
    );
    const { error } = await supabase.from('gallery_products').update({ visible }).eq('id', g.id);
    if (error) { toast.error(error.message); refetch(); }
  };

  const handleBulkAction = async (action: string, ids: string[]) => {
    if (action === 'publish') {
      for (const id of ids) await supabase.from('gallery_products').update({ visible: true }).eq('id', id);
    }
    if (action === 'unpublish') {
      for (const id of ids) await supabase.from('gallery_products').update({ visible: false }).eq('id', id);
    }
    if (action === 'delete') {
      for (const id of ids) await supabase.from('gallery_products').delete().eq('id', id);
    }
    refetch();
  };

  const handleQuickUpload = async (files: FileList) => {
    if (!quickUploadItem) return;
    const existingImages = quickUploadItem.images || [];
    const newUrls: string[] = [];

    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) { toast.error('Dosya 5MB\'dan büyük'); continue; }
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `gallery/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from('product-images').upload(path, file, { cacheControl: '3600', upsert: false });
      if (error) { toast.error(error.message); continue; }
      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path);
      newUrls.push(urlData.publicUrl);
    }

    if (newUrls.length > 0) {
      await supabase.from('gallery_products').update({ images: [...existingImages, ...newUrls] }).eq('id', quickUploadItem.id);
      toast.success(`${newUrls.length} görsel eklendi`);
      refetch();
    }
    setQuickUploadItem(null);
  };

  const columns = useMemo(() => [
    {
      key: 'title',
      label: 'Başlık',
      render: (g: GalleryProduct) => (
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{g.title}</p>
          {g.slug && <p className="text-[11px] text-muted-foreground font-mono">{g.slug}</p>}
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Kategori',
      width: '120px',
      render: (g: GalleryProduct) => g.category ? <span className="text-xs">{g.category}</span> : <span className="text-muted-foreground">—</span>,
      hideOnMobile: true,
    },
    {
      key: 'tags',
      label: 'Etiketler',
      render: (g: GalleryProduct) => g.tags?.length ? (
        <div className="flex gap-1 flex-wrap">
          {g.tags.slice(0, 3).map(t => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
          {g.tags.length > 3 && <span className="text-[10px] text-muted-foreground">+{g.tags.length - 3}</span>}
        </div>
      ) : <span className="text-muted-foreground">—</span>,
      hideOnMobile: true,
    },
    {
      key: 'price',
      label: 'Fiyat İpucu',
      width: '90px',
      render: (g: GalleryProduct) => g.price_hint ? <span className="text-sm">₺{Number(g.price_hint).toLocaleString('tr-TR')}</span> : <span className="text-muted-foreground">—</span>,
      hideOnMobile: true,
    },
    {
      key: 'status',
      label: 'Durum',
      width: '80px',
      render: (g: GalleryProduct) => (
        <Badge variant={g.visible ? 'default' : 'secondary'} className="text-[10px]">
          {g.visible ? 'Yayında' : 'Gizli'}
        </Badge>
      ),
    },
    {
      key: 'visible',
      label: 'Görünür',
      width: '70px',
      render: (g: GalleryProduct) => (
        <Switch checked={g.visible} onCheckedChange={v => toggleVisibility(g, v)} />
      ),
    },
  ], [products]);

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
  ], [existingCategories]);

  const bulkActions = [
    { key: 'publish', label: 'Yayınla', icon: <Eye className="w-3 h-3 mr-1" /> },
    { key: 'unpublish', label: 'Gizle', icon: <EyeOff className="w-3 h-3 mr-1" /> },
    { key: 'delete', label: 'Sil', icon: <Trash2 className="w-3 h-3 mr-1" />, variant: 'destructive' as const, requiresConfirm: true },
  ];

  const onFilterChange = useCallback((key: string, value: string) => {
    if (key === 'category') setFilterCategory(value === '__all__' ? '' : value);
    if (key === 'visible') setFilterVisible(value === '__all__' ? '' : value);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ImageIcon className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold">Galeri Yönetimi</h2>
            <p className="text-sm text-muted-foreground">
              {products.length} ürün • {products.filter(g => g.visible).length} yayında
            </p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }} size="sm">
          <Plus className="w-4 h-4 mr-1.5" />Ekle
        </Button>
      </div>

      <AdminDataGrid
        data={filteredData}
        columns={columns}
        filters={filterConfigs}
        bulkActions={bulkActions}
        sortOptions={[
          { label: 'En Yeni', value: 'newest' },
          { label: 'Başlık', value: 'title' },
          { label: 'Görünür', value: 'visible' },
        ]}
        isLoading={isLoading}
        searchPlaceholder="Başlık, kategori veya etiket ara..."
        emptyMessage="Henüz galeri ürünü yok"
        onSearch={setSearchQ}
        onFilter={onFilterChange}
        onSort={setSortBy}
        onBulkAction={handleBulkAction}
        onEdit={openEdit}
        onDelete={(g) => setDeleteConfirm(g)}
        onPreview={(g) => window.open(`/galeri/urun/${g.slug}`, '_blank')}
        onCopyLink={(g) => { navigator.clipboard.writeText(`${window.location.origin}/galeri/urun/${g.slug}`); toast.success('Link kopyalandı'); }}
        onQuickUpload={(g) => { setQuickUploadItem(g); setTimeout(() => quickUploadRef.current?.click(), 100); }}
        getItemImage={(g) => g.images?.[0] || null}
        getItemTitle={(g) => g.title}
        getItemSubtitle={(g) => `${g.category || 'Kategorisiz'} • ${g.slug || ''}`}
        getIsVisible={(g) => g.visible}
        onToggleVisible={(g, v) => toggleVisibility(g, v)}
      />

      <input
        ref={quickUploadRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => e.target.files && handleQuickUpload(e.target.files)}
      />

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ürünü Sil</DialogTitle>
            <DialogDescription>"{deleteConfirm?.title}" silinecek. Bu işlem geri alınamaz.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>İptal</Button>
            <Button variant="destructive" onClick={confirmDelete}>Sil</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) { setDialogOpen(false); resetForm(); } else setDialogOpen(true); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Düzenle' : 'Yeni Galeri Ürünü'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Başlık *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div>
              <Label>Slug</Label>
              <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="otomatik oluşturulur" />
              <p className="text-[10px] text-muted-foreground mt-1">URL: /galeri/urun/{form.slug || '...'}</p>
            </div>
            <div><Label>Açıklama</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div>
            <div>
              <Label>Görseller</Label>
              <ImageUploader images={uploadedImages} onChange={setUploadedImages} folder="gallery" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Fiyat İpucu</Label><Input type="number" step="0.01" value={form.price_hint} onChange={e => setForm(f => ({ ...f, price_hint: e.target.value }))} /></div>
              <div>
                <Label>Kategori</Label>
                <Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} list="gal-cat-suggest" />
                <datalist id="gal-cat-suggest">
                  {existingCategories.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
            </div>
            <div><Label>Etiketler (virgülle ayırın)</Label><Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Sıra</Label><Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} /></div>
              <div className="flex items-center justify-between pt-6">
                <Label>Görünür</Label>
                <Switch checked={form.visible} onCheckedChange={v => setForm(f => ({ ...f, visible: v }))} />
              </div>
            </div>
            <Button onClick={handleSave} className="w-full">{editing ? 'Güncelle' : 'Ekle'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
