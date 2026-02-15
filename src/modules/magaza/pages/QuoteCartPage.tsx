import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, ArrowLeft, Send, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MagazaHeader } from '../components/MagazaHeader';
import { useQuoteCartContext } from '../context/QuoteCartContext';
import { useAuth } from '@/hooks/useAuth';

export default function QuoteCartPage() {
  const { items, removeItem, updateQuantity, updateNote, submitQuote, submitting, clearCart } = useQuoteCartContext();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    await submitQuote({
      ...form,
      customer_id: user?.id,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <MagazaHeader searchQuery={search} onSearchChange={setSearch} />

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <Link to="/magaza" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Alışverişe Devam
        </Link>

        <h1 className="text-2xl font-bold mb-6">Teklif Sepeti</h1>

        {items.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">Teklif sepetiniz boş</p>
            <Link to="/magaza"><Button>Mağazaya Git</Button></Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Items */}
            <div className="lg:col-span-3 space-y-3">
              {items.map(item => (
                <Card key={item.id} className="overflow-hidden">
                  <CardContent className="p-3 flex gap-3">
                    <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                      <img src={item.image || '/placeholder.svg'} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold truncate">{item.title}</h3>
                      {item.price && (
                        <p className="text-sm text-muted-foreground">
                          ₺{item.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center border border-border rounded overflow-hidden">
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="px-1.5 py-0.5 hover:bg-muted">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 text-xs font-medium">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="px-1.5 py-0.5 hover:bg-muted">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <Input
                          placeholder="Not..."
                          value={item.note}
                          onChange={e => updateNote(item.id, e.target.value)}
                          className="h-7 text-xs flex-1"
                        />
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(item.id)}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button variant="outline" size="sm" onClick={clearCart} className="text-destructive">
                Sepeti Temizle
              </Button>
            </div>

            {/* Quote Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">İletişim Bilgileri</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                      <Label className="text-xs">Ad Soyad *</Label>
                      <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required className="h-9" />
                    </div>
                    <div>
                      <Label className="text-xs">Telefon</Label>
                      <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="h-9" />
                    </div>
                    <div>
                      <Label className="text-xs">E-posta</Label>
                      <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="h-9" />
                    </div>
                    <div>
                      <Label className="text-xs">Firma</Label>
                      <Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} className="h-9" />
                    </div>
                    <div>
                      <Label className="text-xs">Not</Label>
                      <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
                    </div>
                    <Button type="submit" className="w-full" disabled={submitting}>
                      <Send className="w-4 h-4 mr-2" />
                      {submitting ? 'Gönderiliyor...' : 'Teklif Talebi Gönder'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
