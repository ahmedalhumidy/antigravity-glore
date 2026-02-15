import { useState } from 'react';
import { useAllGalleryProducts } from '../hooks/useGalleryProducts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, Image, Search } from 'lucide-react';
import { ImageUploader } from '../components/ImageUploader';
import type { GalleryProduct } from '../types';

export default function AdminGaleriPage() {
  const { products, isLoading, refetch } = useAllGalleryProducts();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GalleryProduct | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [form, setForm] = useState({
    title: '', slug: '', description: '',
    price_hint: '', category: '', tags: '', visible: false, sort_order: 0,
  });

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

    const payload = {
      title: form.title.trim(),
      slug: (form.slug.trim() || form.title.trim()).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
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

  const handleDelete = async (id: string) => {
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
    const { error } = await supabase.from('gallery_products').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Silindi'); refetch(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold">Galeri Yönetimi</h2>
            <p className="text-sm text-muted-foreground">{products.length} ürün</p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-2" />Ekle</Button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Ürün ara... (başlık, kategori, etiket)"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Başlık</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Fiyat İpucu</TableHead>
                <TableHead>Görünür</TableHead>
                <TableHead className="text-right">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(search.trim()
                ? products.filter(g => {
                    const q = search.toLowerCase();
                    return g.title.toLowerCase().includes(q) ||
                      (g.category || '').toLowerCase().includes(q) ||
                      (g.tags || []).some(t => t.toLowerCase().includes(q));
                  })
                : products
              ).map(g => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.title}</TableCell>
                  <TableCell>{g.category || '—'}</TableCell>
                  <TableCell>{g.price_hint ? `₺${g.price_hint}` : '—'}</TableCell>
                  <TableCell>
                    <Badge variant={g.visible ? 'default' : 'secondary'}>{g.visible ? 'Evet' : 'Hayır'}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(g)}><Edit2 className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(g.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {products.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Henüz galeri ürünü yok</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) { setDialogOpen(false); resetForm(); } else setDialogOpen(true); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Düzenle' : 'Yeni Galeri Ürünü'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Başlık *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><Label>Slug</Label><Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} /></div>
            <div><Label>Açıklama</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div>
            <div>
              <Label>Görseller</Label>
              <ImageUploader
                images={uploadedImages}
                onChange={setUploadedImages}
                folder="gallery"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Fiyat İpucu</Label><Input type="number" step="0.01" value={form.price_hint} onChange={e => setForm(f => ({ ...f, price_hint: e.target.value }))} /></div>
              <div><Label>Kategori</Label><Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} /></div>
            </div>
            <div><Label>Etiketler (virgülle ayırın)</Label><Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
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
