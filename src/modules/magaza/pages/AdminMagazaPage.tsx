import { useState } from 'react';
import { useAllStoreProducts } from '../hooks/useStoreProducts';
import { useProducts } from '@/hooks/useProducts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, Store, Search } from 'lucide-react';
import type { StoreProduct } from '../types';

const badges = ['', 'Yeni', 'İndirim', 'Özel', 'Tükendi'];

export default function AdminMagazaPage() {
  const { products: storeProducts, isLoading, refetch } = useAllStoreProducts();
  const { products: warehouseProducts } = useProducts();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StoreProduct | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [form, setForm] = useState({
    product_id: '',
    slug: '',
    visible: false,
    title_override: '',
    description_override: '',
    price: '',
    compare_price: '',
    badge: '',
    allow_quote: true,
    allow_cart: true,
    show_stock: false,
    min_qty: 1,
    max_qty: '',
    order_step: 1,
    sort_order: 0,
  });

  const publishedIds = new Set(storeProducts.map(sp => sp.product_id));
  const unpublishedProducts = warehouseProducts.filter(wp => !publishedIds.has(wp.id));

  const resetForm = () => {
    setForm({
      product_id: '', slug: '', visible: false, title_override: '', description_override: '',
      price: '', compare_price: '', badge: '', allow_quote: true, allow_cart: true,
      show_stock: false, min_qty: 1, max_qty: '', order_step: 1, sort_order: 0,
    });
    setEditing(null);
  };

  const openEdit = (sp: StoreProduct) => {
    setEditing(sp);
    setForm({
      product_id: sp.product_id,
      slug: sp.slug,
      visible: sp.visible,
      title_override: sp.title_override || '',
      description_override: sp.description_override || '',
      price: sp.price?.toString() || '',
      compare_price: sp.compare_price?.toString() || '',
      badge: sp.badge || '',
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

  const openNew = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.product_id || !form.slug.trim()) {
      toast.error('Ürün ve slug zorunlu');
      return;
    }

    const payload = {
      product_id: form.product_id,
      slug: form.slug.trim().toLowerCase().replace(/\s+/g, '-'),
      visible: form.visible,
      title_override: form.title_override || null,
      description_override: form.description_override || null,
      price: form.price ? parseFloat(form.price) : null,
      compare_price: form.compare_price ? parseFloat(form.compare_price) : null,
      badge: form.badge || null,
      allow_quote: form.allow_quote,
      allow_cart: form.allow_cart,
      show_stock: form.show_stock,
      min_qty: form.min_qty,
      max_qty: form.max_qty ? parseInt(form.max_qty) : null,
      order_step: form.order_step,
      sort_order: form.sort_order,
    };

    try {
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

  const handleDelete = async (id: string) => {
    if (!confirm('Bu ürünü mağazadan kaldırmak istediğinize emin misiniz?')) return;
    const { error } = await supabase.from('store_products').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Kaldırıldı'); refetch(); }
  };

  const toggleVisibility = async (id: string, visible: boolean) => {
    const { error } = await supabase.from('store_products').update({ visible }).eq('id', id);
    if (error) toast.error(error.message);
    else refetch();
  };

  const filtered = storeProducts.filter(sp => {
    if (!searchQ) return true;
    const q = searchQ.toLowerCase();
    return (sp.title_override || sp.product?.urun_adi || '').toLowerCase().includes(q) ||
      (sp.product?.urun_kodu || '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Store className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold">Mağaza Yönetimi</h2>
            <p className="text-sm text-muted-foreground">{storeProducts.length} ürün yayınlanmış</p>
          </div>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Ürün Yayınla</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Ara..." value={searchQ} onChange={e => setSearchQ(e.target.value)} className="pl-9 h-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ürün</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Fiyat</TableHead>
                <TableHead>Badge</TableHead>
                <TableHead>Görünür</TableHead>
                <TableHead className="text-right">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(sp => (
                <TableRow key={sp.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{sp.title_override || sp.product?.urun_adi}</p>
                      <p className="text-xs text-muted-foreground">{sp.product?.urun_kodu}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-mono">{sp.slug}</TableCell>
                  <TableCell>
                    {sp.price != null ? `₺${sp.price}` : '—'}
                  </TableCell>
                  <TableCell>
                    {sp.badge ? <Badge variant="secondary">{sp.badge}</Badge> : '—'}
                  </TableCell>
                  <TableCell>
                    <Switch checked={sp.visible} onCheckedChange={v => toggleVisibility(sp.id, v)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(sp)}><Edit2 className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(sp.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Henüz mağaza ürünü eklenmemiş
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) { setDialogOpen(false); resetForm(); } else setDialogOpen(true); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Ürünü Düzenle' : 'Yeni Ürün Yayınla'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fiyat (₺)</Label>
                <Input type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
              </div>
              <div>
                <Label>Karşılaştırma Fiyatı</Label>
                <Input type="number" step="0.01" value={form.compare_price} onChange={e => setForm(f => ({ ...f, compare_price: e.target.value }))} />
              </div>
            </div>

            <div>
              <Label>Başlık (override)</Label>
              <Input value={form.title_override} onChange={e => setForm(f => ({ ...f, title_override: e.target.value }))} placeholder="Boş bırakılırsa depo adı kullanılır" />
            </div>

            <div>
              <Label>Badge</Label>
              <Select value={form.badge} onValueChange={v => setForm(f => ({ ...f, badge: v }))}>
                <SelectTrigger><SelectValue placeholder="Yok" /></SelectTrigger>
                <SelectContent>
                  {badges.map(b => <SelectItem key={b || 'none'} value={b || 'none'}>{b || 'Yok'}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Min Adet</Label>
                <Input type="number" value={form.min_qty} onChange={e => setForm(f => ({ ...f, min_qty: parseInt(e.target.value) || 1 }))} />
              </div>
              <div>
                <Label>Max Adet</Label>
                <Input type="number" value={form.max_qty} onChange={e => setForm(f => ({ ...f, max_qty: e.target.value }))} placeholder="Sınırsız" />
              </div>
              <div>
                <Label>Sıra</Label>
                <Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Görünür</Label>
                <Switch checked={form.visible} onCheckedChange={v => setForm(f => ({ ...f, visible: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Teklif İzin Ver</Label>
                <Switch checked={form.allow_quote} onCheckedChange={v => setForm(f => ({ ...f, allow_quote: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Sepet İzin Ver</Label>
                <Switch checked={form.allow_cart} onCheckedChange={v => setForm(f => ({ ...f, allow_cart: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Stok Göster</Label>
                <Switch checked={form.show_stock} onCheckedChange={v => setForm(f => ({ ...f, show_stock: v }))} />
              </div>
            </div>

            <Button onClick={handleSave} className="w-full">{editing ? 'Güncelle' : 'Yayınla'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
