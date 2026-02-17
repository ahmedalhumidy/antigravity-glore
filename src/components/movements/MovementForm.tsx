import { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, User, Calendar, Clock, Package, FileText, Scan, Plus, ChevronsUpDown, Check } from 'lucide-react';
import { Product } from '@/types/stock';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { BarcodeScanner } from '@/components/scanner/BarcodeScanner';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ShelfSelector } from '@/components/shelves/ShelfSelector';
import { useShelves, Shelf } from '@/hooks/useShelves';

interface MovementFormProps {
  products: Product[];
  onSubmit: (data: {
    productId: string;
    type: 'giris' | 'cikis';
    quantity: number;
    setQuantity?: number;
    date: string;
    time: string;
    note?: string;
    shelfId?: string;
  }) => void;
  onAddNewProduct?: (barcode: string) => void;
}

export function MovementForm({ products, onSubmit, onAddNewProduct }: MovementFormProps) {
  const [type, setType] = useState<'giris' | 'cikis'>('giris');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [setQty, setSetQty] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
  const [note, setNote] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [notFoundBarcode, setNotFoundBarcode] = useState<string | null>(null);
  const [autoSubmitReady, setAutoSubmitReady] = useState(false);
  const [openProductCombobox, setOpenProductCombobox] = useState(false);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const [selectedShelfId, setSelectedShelfId] = useState<string | undefined>();

  const { shelves, addShelf } = useShelves();
  const selectedProduct = products.find(p => p.id === productId);

  // Fetch current user's profile name on mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (session.session?.user.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', session.session.user.id)
          .single();
        setCurrentUserName(profile?.full_name || session.session.user.email || 'Bilinmeyen Kullanıcı');
      }
    };
    fetchUserProfile();
  }, []);

  // Auto-select shelf when product is selected
  useEffect(() => {
    if (selectedProduct && selectedProduct.rafKonum) {
      const matchingShelf = shelves.find(s => s.name === selectedProduct.rafKonum);
      if (matchingShelf) {
        setSelectedShelfId(matchingShelf.id);
      }
    }
  }, [selectedProduct, shelves]);

  const handleBarcodeScan = (code: string) => {
    const product = products.find(p => p.barkod === code || p.urunKodu === code);
    if (product) {
      setProductId(product.id);
      setShowScanner(false);
      setNotFoundBarcode(null);
      setAutoSubmitReady(true);
      toast.success(`Ürün bulundu: ${product.urunAdi}`, {
        description: `Kod: ${product.urunKodu} - Miktar ekleyip kaydedin`,
      });
    } else {
      setNotFoundBarcode(code);
      setShowScanner(false);
      toast.warning('Ürün bulunamadı', {
        description: `Barkod: ${code} - Yeni ürün ekleyebilirsiniz`,
      });
    }
  };

  const handleAddNewProductClick = () => {
    if (notFoundBarcode && onAddNewProduct) {
      onAddNewProduct(notFoundBarcode);
      setNotFoundBarcode(null);
    }
  };

  const handleShelfSelect = (shelf: Shelf) => {
    setSelectedShelfId(shelf.id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) return;

    onSubmit({
      productId,
      type,
      quantity,
      setQuantity: setQty || 0,
      date,
      time,
      note: note || undefined,
      shelfId: selectedShelfId,
    });

    // Reset form
    setProductId('');
    setQuantity(1);
    setSetQty(0);
    setNote('');
    setSelectedShelfId(undefined);
    setAutoSubmitReady(false);
  };

  return (
    <form onSubmit={handleSubmit} className="stat-card space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-border">
        <div className={cn(
          'p-3 rounded-xl',
          type === 'giris' ? 'bg-success/10' : 'bg-destructive/10'
        )}>
          {type === 'giris' ? (
            <ArrowUpRight className="w-6 h-6 text-success" />
          ) : (
            <ArrowDownRight className="w-6 h-6 text-destructive" />
          )}
        </div>
        <div>
          <h3 className="font-semibold text-lg text-foreground">
            Yeni {type === 'giris' ? 'Stok Girişi' : 'Stok Çıkışı'}
          </h3>
          <p className="text-sm text-muted-foreground">
            Hareket bilgilerini doldurun
          </p>
        </div>
      </div>

      {/* Type Selection */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setType('giris')}
          className={cn(
            'p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2',
            type === 'giris' 
              ? 'border-success bg-success/10 text-success' 
              : 'border-border hover:border-success/50'
          )}
        >
          <ArrowUpRight className="w-5 h-5" />
          <span className="font-medium">Giriş</span>
        </button>
        <button
          type="button"
          onClick={() => setType('cikis')}
          className={cn(
            'p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2',
            type === 'cikis' 
              ? 'border-destructive bg-destructive/10 text-destructive' 
              : 'border-border hover:border-destructive/50'
          )}
        >
          <ArrowDownRight className="w-5 h-5" />
          <span className="font-medium">Çıkış</span>
        </button>
      </div>

      {/* Barcode Scanner */}
      <BarcodeScanner
        isOpen={showScanner}
        onScan={handleBarcodeScan}
        onClose={() => setShowScanner(false)}
      />

      {/* Not Found Barcode - Add New Product Option */}
      {notFoundBarcode && (
        <div className="p-4 rounded-xl bg-warning/10 border border-warning/30 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/20">
              <Scan className="w-5 h-5 text-warning" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">Ürün Bulunamadı</p>
              <p className="text-sm text-muted-foreground">
                Barkod: <span className="font-mono font-bold">{notFoundBarcode}</span>
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleAddNewProductClick}
              className="flex-1 bg-primary hover:bg-primary/90"
              disabled={!onAddNewProduct}
            >
              <Plus className="w-4 h-4 mr-2" />
              Yeni Ürün Ekle
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setNotFoundBarcode(null)}
              className="flex-1"
            >
              İptal
            </Button>
          </div>
        </div>
      )}

      {/* Product Selection with Search and Barcode */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Package className="w-4 h-4" />
          Ürün Seçin *
        </Label>
        
        {/* Barcode Scan Button */}
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setShowScanner(!showScanner);
            setNotFoundBarcode(null);
          }}
          className={cn(
            'w-full flex items-center justify-center gap-2 border-2 border-dashed',
            showScanner ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
          )}
        >
          <Scan className="w-5 h-5" />
          {showScanner ? 'Tarayıcıyı Kapat' : 'Barkod ile Tara'}
        </Button>

        {/* Product Combobox with integrated search */}
        <Popover open={openProductCombobox} onOpenChange={setOpenProductCombobox}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={openProductCombobox}
              className="w-full justify-between h-auto min-h-10 py-2"
            >
              {selectedProduct ? (
                <div className="flex items-center gap-3 w-full text-left">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{selectedProduct.urunAdi}</div>
                    <div className="text-xs text-muted-foreground">
                      Kod: {selectedProduct.urunKodu}
                    </div>
                  </div>
                  <span className={cn(
                    'text-xs font-semibold px-2 py-0.5 rounded shrink-0',
                    selectedProduct.mevcutStok <= selectedProduct.minStok 
                      ? 'bg-destructive/10 text-destructive' 
                      : 'bg-success/10 text-success'
                  )}>
                    {selectedProduct.mevcutStok}
                  </span>
                </div>
              ) : (
                <span className="text-muted-foreground">Ürün seçin...</span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
            <Command>
              <CommandInput placeholder="Ürün adı veya kodu ara..." />
              <CommandList>
                <CommandEmpty>Ürün bulunamadı</CommandEmpty>
                <CommandGroup>
                  {products.map((product) => (
                    <CommandItem
                      key={product.id}
                      value={`${product.urunAdi} ${product.urunKodu} ${product.barkod || ''}`}
                      onSelect={() => {
                        setProductId(product.id);
                        setOpenProductCombobox(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          productId === product.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex items-center gap-3 w-full">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{product.urunAdi}</div>
                          <div className="text-xs text-muted-foreground">
                            Kod: {product.urunKodu} {product.barkod && `| Barkod: ${product.barkod}`}
                          </div>
                        </div>
                        <span className={cn(
                          'text-xs font-semibold px-2 py-0.5 rounded shrink-0',
                          product.mevcutStok <= product.minStok 
                            ? 'bg-destructive/10 text-destructive' 
                            : 'bg-success/10 text-success'
                        )}>
                          {product.mevcutStok}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Selected Product Info */}
        {selectedProduct && (
          <div className={cn(
            "p-3 rounded-xl border",
            autoSubmitReady 
              ? "bg-success/10 border-success/30 animate-pulse" 
              : "bg-primary/5 border-primary/20"
          )}>
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                autoSubmitReady ? "bg-success/20" : "bg-primary/10"
              )}>
                <Package className={cn(
                  "w-5 h-5",
                  autoSubmitReady ? "text-success" : "text-primary"
                )} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">{selectedProduct.urunAdi}</p>
                <p className="text-xs text-muted-foreground">
                  Kod: {selectedProduct.urunKodu} | Konum: {selectedProduct.rafKonum}
                </p>
                {autoSubmitReady && (
                  <p className="text-xs text-success font-medium mt-1">
                    ✓ Barkod ile seçildi - Miktar girin ve kaydedin
                  </p>
                )}
              </div>
              <div className="text-right">
                <div className="flex gap-3">
                  <div>
                    <p className={cn(
                      'text-lg font-bold',
                      selectedProduct.mevcutStok <= selectedProduct.minStok ? 'text-destructive' : 'text-success'
                    )}>
                      {selectedProduct.mevcutStok}
                    </p>
                    <p className="text-xs text-muted-foreground">adet</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">
                      {selectedProduct.setStok}
                    </p>
                    <p className="text-xs text-muted-foreground">set</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Shelf Selection */}
      <ShelfSelector
        shelves={shelves}
        selectedShelfId={selectedShelfId}
        onSelect={handleShelfSelect}
        onAddNew={addShelf}
        label={type === 'giris' ? 'Giriş Yapılacak Raf' : 'Çıkış Yapılacak Raf'}
        placeholder="Raf seçin..."
      />

      {/* Quantity Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="quantity">Adet (Mevcut Stok) *</Label>
          <Input
            id="quantity"
            type="number"
            min="0"
            max={type === 'cikis' && selectedProduct ? selectedProduct.mevcutStok : undefined}
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
          />
          {type === 'cikis' && selectedProduct && (
            <p className="text-xs text-muted-foreground">
              Maks: {selectedProduct.mevcutStok}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="setQty">Set Adedi</Label>
          <Input
            id="setQty"
            type="number"
            min="0"
            max={type === 'cikis' && selectedProduct ? selectedProduct.setStok : undefined}
            value={setQty}
            onChange={(e) => setSetQty(parseInt(e.target.value) || 0)}
          />
          {type === 'cikis' && selectedProduct && (
            <p className="text-xs text-muted-foreground">
              Maks: {selectedProduct.setStok}
            </p>
          )}
        </div>
      </div>

      {/* Date & Time */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Tarih *
          </Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Saat *
          </Label>
          <Input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
          />
        </div>
      </div>

      {/* Handled By - Read Only (Auto-filled from logged-in user) */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <User className="w-4 h-4" />
          {type === 'giris' ? 'Teslim Alan' : 'Teslim Eden'}
        </Label>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted border border-border">
          <div className="p-2 rounded-full bg-primary/10">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">{currentUserName || 'Yükleniyor...'}</p>
            <p className="text-xs text-muted-foreground">Oturum açmış kullanıcı</p>
          </div>
        </div>
      </div>

      {/* Note */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Not
        </Label>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="İşlem açıklaması..."
          rows={2}
        />
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={!productId || !currentUserName || (quantity === 0 && setQty === 0)}
        className={cn(
          'w-full border-0',
          type === 'giris' ? 'gradient-success' : 'bg-destructive hover:bg-destructive/90'
        )}
      >
        {type === 'giris' ? 'Stok Girişi Kaydet' : 'Stok Çıkışı Kaydet'}
      </Button>
    </form>
  );
}
