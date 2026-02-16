import { useState } from 'react';
import { Plus, Pencil, Trash2, Percent, Tag, Truck, Copy, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePromotions, type Promotion, type PromotionInsert, isPromotionValid } from '../hooks/usePromotions';
import { toast } from 'sonner';

const emptyForm: PromotionInsert = {
  name: '',
  description: null,
  promotion_type: 'coupon',
  code: null,
  discount_type: 'percentage',
  discount_value: 10,
  min_order_amount: null,
  max_discount_amount: null,
  usage_limit: null,
  usage_count: 0,
  starts_at: null,
  expires_at: null,
  is_active: true,
  category: null,
  store_id: null,
  conditions: {},
};

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function getTypeIcon(type: string) {
  if (type === 'coupon') return <Tag className="w-3.5 h-3.5" />;
  if (type === 'automatic') return <Zap className="w-3.5 h-3.5" />;
  return <Truck className="w-3.5 h-3.5" />;
}

function getTypeLabel(type: string) {
  if (type === 'coupon') return 'Kupon';
  if (type === 'automatic') return 'Otomatik';
  return 'Ücretsiz Kargo';
}

function getStatusInfo(promo: Promotion) {
  if (!promo.is_active) return { label: 'Pasif', cls: 'bg-muted text-muted-foreground' };
  const now = new Date();
  if (promo.starts_at && new Date(promo.starts_at) > now) return { label: 'Beklemede', cls: 'bg-[hsl(38_92%_50%)] text-[hsl(215_25%_8%)]' };
  if (promo.expires_at && new Date(promo.expires_at) < now) return { label: 'Süresi Doldu', cls: 'bg-destructive text-destructive-foreground' };
  if (promo.usage_limit && (promo.usage_count || 0) >= promo.usage_limit) return { label: 'Limit Doldu', cls: 'bg-destructive text-destructive-foreground' };
  return { label: 'Aktif', cls: 'bg-[hsl(142_76%_36%)] text-white' };
}

export default function AdminPromotionsPage() {
  const { promotions, isLoading, createPromotion, updatePromotion, deletePromotion, togglePromotion, creating, updating } = usePromotions();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<PromotionInsert>({ ...emptyForm });
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const openCreate = () => {
    setEditId(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  };

  const openEdit = (p: Promotion) => {
    setEditId(p.id);
    setForm({
      name: p.name,
      description: p.description,
      promotion_type: p.promotion_type,
      code: p.code,
      discount_type: p.discount_type,
      discount_value: p.discount_value,
      min_order_amount: p.min_order_amount,
      max_discount_amount: p.max_discount_amount,
      usage_limit: p.usage_limit,
      usage_count: p.usage_count,
      starts_at: p.starts_at,
      expires_at: p.expires_at,
      is_active: p.is_active,
      category: p.category,
      store_id: p.store_id,
      conditions: p.conditions || {},
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Kampanya adı gerekli'); return; }
    if (form.promotion_type === 'coupon' && !form.code?.trim()) { toast.error('Kupon kodu gerekli'); return; }

    const payload = {
      ...form,
      code: form.code?.toUpperCase() || null,
    };

    if (editId) {
      await updatePromotion({ id: editId, ...payload });
    } else {
      await createPromotion(payload);
    }
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kampanyayı silmek istediğinize emin misiniz?')) return;
    await deletePromotion(id);
  };

  // Filtering
  const filtered = promotions.filter(p => {
    if (search) {
      const q = search.toLowerCase();
      if (!(p.name.toLowerCase().includes(q) || (p.code || '').toLowerCase().includes(q))) return false;
    }
    if (filterType !== 'all' && p.promotion_type !== filterType) return false;
    if (filterStatus !== 'all') {
      const status = getStatusInfo(p).label;
      if (filterStatus === 'active' && status !== 'Aktif') return false;
      if (filterStatus === 'inactive' && status === 'Aktif') return false;
    }
    return true;
  });

  // Stats
  const activeCount = promotions.filter(isPromotionValid).length;
  const couponCount = promotions.filter(p => p.promotion_type === 'coupon').length;
  const autoCount = promotions.filter(p => p.promotion_type === 'automatic').length;

  const set = (key: string, val: any) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{promotions.length}</p>
          <p className="text-xs text-muted-foreground">Toplam Kampanya</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-[hsl(142_76%_36%)]">{activeCount}</p>
          <p className="text-xs text-muted-foreground">Aktif</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{couponCount}</p>
          <p className="text-xs text-muted-foreground">Kupon</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{autoCount}</p>
          <p className="text-xs text-muted-foreground">Otomatik</p>
        </CardContent></Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 w-full sm:w-auto">
          <Input placeholder="Kampanya ara..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Türler</SelectItem>
              <SelectItem value="coupon">Kupon</SelectItem>
              <SelectItem value="automatic">Otomatik</SelectItem>
              <SelectItem value="free_shipping">Ücretsiz Kargo</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Durum</SelectItem>
              <SelectItem value="active">Aktif</SelectItem>
              <SelectItem value="inactive">Pasif</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1.5" />Yeni Kampanya</Button>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kampanya</TableHead>
                <TableHead>Tür</TableHead>
                <TableHead>Kod</TableHead>
                <TableHead>İndirim</TableHead>
                <TableHead>Kullanım</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Aktif</TableHead>
                <TableHead className="w-[90px]">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Yükleniyor...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Kampanya bulunamadı</TableCell></TableRow>
              ) : filtered.map(p => {
                const status = getStatusInfo(p);
                const usagePercent = p.usage_limit ? Math.min(100, ((p.usage_count || 0) / p.usage_limit) * 100) : 0;
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{p.name}</p>
                        {p.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{p.description}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="gap-1 text-xs">
                        {getTypeIcon(p.promotion_type)}{getTypeLabel(p.promotion_type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {p.code ? (
                        <button onClick={() => { navigator.clipboard.writeText(p.code!); toast.success('Kopyalandı'); }} className="flex items-center gap-1 font-mono text-xs bg-muted px-2 py-0.5 rounded hover:bg-muted/80">
                          {p.code}<Copy className="w-3 h-3" />
                        </button>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-semibold">
                        {p.discount_type === 'percentage' ? `%${p.discount_value}` : `₺${p.discount_value}`}
                      </span>
                    </TableCell>
                    <TableCell>
                      {p.usage_limit ? (
                        <div className="space-y-1 min-w-[80px]">
                          <span className="text-xs text-muted-foreground">{p.usage_count || 0}/{p.usage_limit}</span>
                          <Progress value={usagePercent} className="h-1.5" />
                        </div>
                      ) : <span className="text-xs text-muted-foreground">Sınırsız</span>}
                    </TableCell>
                    <TableCell><Badge className={`${status.cls} text-[10px]`}>{status.label}</Badge></TableCell>
                    <TableCell>
                      <Switch checked={!!p.is_active} onCheckedChange={v => togglePromotion({ id: p.id, is_active: v })} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'Kampanyayı Düzenle' : 'Yeni Kampanya'}</DialogTitle>
            <DialogDescription>Kampanya bilgilerini doldurun</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Kampanya Adı *</Label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Yaz İndirimi" />
            </div>

            <div>
              <Label>Açıklama</Label>
              <Textarea value={form.description || ''} onChange={e => set('description', e.target.value || null)} rows={2} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Kampanya Türü</Label>
                <Select value={form.promotion_type} onValueChange={v => set('promotion_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="coupon">Kupon Kodu</SelectItem>
                    <SelectItem value="automatic">Otomatik İndirim</SelectItem>
                    <SelectItem value="free_shipping">Ücretsiz Kargo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.promotion_type === 'coupon' && (
                <div>
                  <Label>Kupon Kodu *</Label>
                  <div className="flex gap-1.5">
                    <Input value={form.code || ''} onChange={e => set('code', e.target.value.toUpperCase())} placeholder="YAZFIRSAT" className="font-mono" />
                    <Button type="button" variant="outline" size="icon" onClick={() => set('code', generateCode())} title="Rastgele Kod">
                      <Zap className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {form.promotion_type !== 'free_shipping' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>İndirim Türü</Label>
                  <Select value={form.discount_type} onValueChange={v => set('discount_type', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Yüzde (%)</SelectItem>
                      <SelectItem value="fixed_amount">Sabit Tutar (₺)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>İndirim Değeri *</Label>
                  <Input type="number" min={0} value={form.discount_value} onChange={e => set('discount_value', Number(e.target.value))} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Min. Sipariş Tutarı (₺)</Label>
                <Input type="number" min={0} value={form.min_order_amount || ''} onChange={e => set('min_order_amount', e.target.value ? Number(e.target.value) : null)} placeholder="Opsiyonel" />
              </div>
              <div>
                <Label>Maks. İndirim (₺)</Label>
                <Input type="number" min={0} value={form.max_discount_amount || ''} onChange={e => set('max_discount_amount', e.target.value ? Number(e.target.value) : null)} placeholder="Opsiyonel" />
              </div>
            </div>

            <div>
              <Label>Kullanım Limiti</Label>
              <Input type="number" min={0} value={form.usage_limit || ''} onChange={e => set('usage_limit', e.target.value ? Number(e.target.value) : null)} placeholder="Sınırsız" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Başlangıç Tarihi</Label>
                <Input type="datetime-local" value={form.starts_at?.slice(0, 16) || ''} onChange={e => set('starts_at', e.target.value ? new Date(e.target.value).toISOString() : null)} />
              </div>
              <div>
                <Label>Bitiş Tarihi</Label>
                <Input type="datetime-local" value={form.expires_at?.slice(0, 16) || ''} onChange={e => set('expires_at', e.target.value ? new Date(e.target.value).toISOString() : null)} />
              </div>
            </div>

            <div>
              <Label>Kategori (opsiyonel)</Label>
              <Input value={form.category || ''} onChange={e => set('category', e.target.value || null)} placeholder="Tüm ürünler" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>İptal</Button>
            <Button onClick={handleSave} disabled={creating || updating}>
              {creating || updating ? 'Kaydediliyor...' : editId ? 'Güncelle' : 'Oluştur'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
