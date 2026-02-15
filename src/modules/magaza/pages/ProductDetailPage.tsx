import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileText, Plus, Minus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { MagazaHeader } from '../components/MagazaHeader';
import { useStoreProductBySlug } from '../hooks/useStoreProducts';
import { useQuoteCartContext } from '../context/QuoteCartContext';

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { product: item, isLoading } = useStoreProductBySlug(slug || '');
  const { addItem } = useQuoteCartContext();
  const [qty, setQty] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const [search, setSearch] = useState('');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <MagazaHeader searchQuery={search} onSearchChange={setSearch} />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-background">
        <MagazaHeader searchQuery={search} onSearchChange={setSearch} />
        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl font-bold mb-4">Ürün bulunamadı</h2>
          <Link to="/magaza"><Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Mağazaya Dön</Button></Link>
        </div>
      </div>
    );
  }

  const title = item.title_override || item.product?.urun_adi || '';
  const desc = item.description_override || item.product?.product_description || '';
  const images = (item.product?.images as string[]) || [];
  if (images.length === 0) images.push('/placeholder.svg');
  const stock = item.product?.mevcut_stok || 0;
  const outOfStock = stock <= 0;

  const handleAddQuote = () => {
    addItem({
      id: item.id,
      type: 'store',
      title,
      image: images[0],
      price: item.price || undefined,
      quantity: qty,
      product_id: item.product_id,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <MagazaHeader searchQuery={search} onSearchChange={setSearch} />

      <main className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <Link to="/magaza" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Mağazaya Dön
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image Gallery */}
          <div className="space-y-3">
            <div className="relative aspect-square rounded-xl overflow-hidden bg-muted">
              <img
                src={images[imageIndex]}
                alt={title}
                className="w-full h-full object-cover"
              />
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setImageIndex(i => (i - 1 + images.length) % images.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-card/80 backdrop-blur rounded-full p-1.5 hover:bg-card"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setImageIndex(i => (i + 1) % images.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-card/80 backdrop-blur rounded-full p-1.5 hover:bg-card"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
              {item.badge && (
                <Badge className="absolute top-3 left-3 bg-accent text-accent-foreground">{item.badge}</Badge>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setImageIndex(i)}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-colors ${i === imageIndex ? 'border-primary' : 'border-transparent'}`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground font-mono mb-1">{item.product?.urun_kodu}</p>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">{title}</h1>
            </div>

            {/* Stock */}
            <div>
              {item.show_stock ? (
                <Badge variant={outOfStock ? 'destructive' : 'secondary'}>
                  {outOfStock ? 'Stokta Yok' : `Stokta: ${stock}`}
                </Badge>
              ) : (
                <Badge variant={outOfStock ? 'destructive' : 'secondary'}>
                  {outOfStock ? 'Stokta Yok' : 'Stokta Var'}
                </Badge>
              )}
            </div>

            {/* Price */}
            {item.price != null && (
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-foreground">
                  ₺{item.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </span>
                {item.compare_price && item.compare_price > (item.price || 0) && (
                  <span className="text-lg text-muted-foreground line-through">
                    ₺{item.compare_price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>
            )}

            {/* Quantity */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Adet:</span>
              <div className="flex items-center border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => setQty(q => Math.max(item.min_qty || 1, q - (item.order_step || 1)))}
                  className="px-3 py-2 hover:bg-muted transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-4 py-2 text-base font-semibold min-w-[3rem] text-center">{qty}</span>
                <button
                  onClick={() => setQty(q => {
                    const next = q + (item.order_step || 1);
                    return item.max_qty ? Math.min(next, item.max_qty) : next;
                  })}
                  className="px-3 py-2 hover:bg-muted transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              {item.allow_quote && (
                <Button size="lg" className="flex-1" onClick={handleAddQuote}>
                  <FileText className="w-4 h-4 mr-2" />
                  {outOfStock ? 'Talep Oluştur' : 'Teklif Al'}
                </Button>
              )}
            </div>

            {/* Tabs */}
            <Tabs defaultValue="description" className="pt-4">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="description">Açıklama</TabsTrigger>
                <TabsTrigger value="specs">Özellikler</TabsTrigger>
              </TabsList>
              <TabsContent value="description" className="pt-4">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {desc || 'Açıklama bulunmamaktadır.'}
                </p>
              </TabsContent>
              <TabsContent value="specs" className="pt-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-1.5 border-b border-border">
                    <span className="text-muted-foreground">Ürün Kodu</span>
                    <span className="font-medium">{item.product?.urun_kodu}</span>
                  </div>
                  {item.product?.barkod && (
                    <div className="flex justify-between py-1.5 border-b border-border">
                      <span className="text-muted-foreground">Barkod</span>
                      <span className="font-medium">{item.product.barkod}</span>
                    </div>
                  )}
                  {item.product?.category && (
                    <div className="flex justify-between py-1.5 border-b border-border">
                      <span className="text-muted-foreground">Kategori</span>
                      <span className="font-medium">{item.product.category}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1.5 border-b border-border">
                    <span className="text-muted-foreground">Min. Sipariş</span>
                    <span className="font-medium">{item.min_qty} adet</span>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}
