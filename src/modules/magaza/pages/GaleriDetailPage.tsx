import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Send, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useGalleryProducts } from '../hooks/useGalleryProducts';
import { useQuoteCartContext } from '../context/QuoteCartContext';

export default function GaleriDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { products, isLoading } = useGalleryProducts();
  const { addItem } = useQuoteCartContext();
  const [imageIndex, setImageIndex] = useState(0);

  const item = products.find(p => p.slug === slug || p.id === slug);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-32 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <Skeleton className="aspect-square rounded-2xl" />
            <div className="space-y-4">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-12 w-48 mt-8" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-foreground">Ürün bulunamadı</h2>
          <Link
            to="/galeri"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Galeriye Dön
          </Link>
        </div>
      </div>
    );
  }

  const images = item.images || [];
  const hasImages = images.length > 0;

  const handleQuote = () => {
    addItem({
      id: item.id,
      type: 'gallery',
      title: item.title,
      image: images[0] || '/placeholder.svg',
      price: item.price_hint || undefined,
      gallery_id: item.id,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center gap-6">
          <Link to="/galeri" className="text-lg font-bold text-foreground tracking-tight">
            Galeri
          </Link>
          <Link to="/magaza" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Mağaza
          </Link>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <Link
          to="/galeri"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Galeriye Dön
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Image */}
          <div className="space-y-3">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted">
              {hasImages ? (
                <img
                  src={images[imageIndex]}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-secondary">
                  <ImageIcon className="w-16 h-16 text-muted-foreground/30" />
                </div>
              )}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setImageIndex(i => (i - 1 + images.length) % images.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-card/80 backdrop-blur flex items-center justify-center hover:bg-card transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-foreground" />
                  </button>
                  <button
                    onClick={() => setImageIndex(i => (i + 1) % images.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-card/80 backdrop-blur flex items-center justify-center hover:bg-card transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-foreground" />
                  </button>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setImageIndex(i)}
                    className={`w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-colors ${
                      i === imageIndex ? 'border-primary' : 'border-transparent'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col">
            {item.category && (
              <Badge variant="secondary" className="w-fit mb-4 text-xs">
                {item.category}
              </Badge>
            )}

            <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-4">
              {item.title}
            </h1>

            {item.description && (
              <p className="text-muted-foreground leading-relaxed text-base mb-6 whitespace-pre-wrap">
                {item.description}
              </p>
            )}

            {/* Tags */}
            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {item.tags.map(tag => (
                  <span
                    key={tag}
                    className="text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* CTA */}
            <div className="mt-auto pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground mb-4">
                Bu ürünle ilgileniyorsanız talep gönderin, ekibimiz sizinle iletişime geçsin.
              </p>
              <button
                onClick={handleQuote}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
              >
                <Send className="w-4 h-4" />
                Talep Gönder
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
