import { useEffect, useMemo, useState, useCallback } from 'react';
import { Package, MapPin, AlertTriangle, ArrowUpDown, Download, Plus, Minus, Search, Loader2, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Product } from '@/types/stock';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import { BulkActions } from './BulkActions';
import { CategoryFilter, getCategoryColor } from './CategoryFilter';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { useHaptics } from '@/hooks/useHaptics';
import { useIsMobile } from '@/hooks/use-mobile';
import { Input } from '@/components/ui/input';
import { useProductSearch } from '@/hooks/useProductSearch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useShelves } from '@/hooks/useShelves';
import { Badge } from '@/components/ui/badge';
import { getProductStatus, getStatusLabel, getStatusColor } from '@/lib/productStatus';

interface ProductListProps {
  products: Product[];
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  onViewProduct: (id: string) => void;
  onStockAction: (product: Product, type: 'giris' | 'cikis') => void;
  totalCount?: number;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}

type SortField = 'urunAdi' | 'urunKodu' | 'mevcutStok' | 'rafKonum';
type SortOrder = 'asc' | 'desc';

export function ProductList({ 
  products, 
  onEditProduct, 
  onDeleteProduct,
  onViewProduct,
  onStockAction,
  totalCount,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
}: ProductListProps) {
  const { hasPermission } = usePermissions();
  const canDeleteProducts = hasPermission('products.delete');

  const [searchQuery, setSearchQuery] = useState('');
  const { searchResults, searching } = useProductSearch(searchQuery);

  const [sortField, setSortField] = useState<SortField>('urunAdi');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [exportShelfIds, setExportShelfIds] = useState<Set<string>>(new Set());
  const [shelfPopoverOpen, setShelfPopoverOpen] = useState(false);
  const [shelfSearch, setShelfSearch] = useState('');
  const { shelves } = useShelves();


  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => {
      const cat = (p as any).category;
      if (cat) cats.add(cat);
    });
    return Array.from(cats).sort((a, b) => a.localeCompare(b, 'tr'));
  }, [products]);

  // Use server search results when available, otherwise show all products
  const baseProducts = searchResults !== null ? searchResults : products;

  const filteredProducts = useMemo(() => {
    if (!selectedCategory) return baseProducts;
    return baseProducts.filter((product) => (product as any).category === selectedCategory);
  }, [baseProducts, selectedCategory]);

  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'mevcutStok') {
        comparison = a.mevcutStok - b.mevcutStok;
      } else {
        comparison = a[sortField].localeCompare(b[sortField], 'tr');
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredProducts, sortField, sortOrder]);

  // When searching, show all results; otherwise show all loaded products
  const visibleProducts = sortedProducts;

  const selectedProducts = useMemo(
    () => products.filter(p => selectedIds.has(p.id)),
    [products, selectedIds]
  );

  useEffect(() => {
    setSelectedIds(new Set());
  }, [searchQuery, sortField, sortOrder, selectedCategory]);


  useEffect(() => {
    setSelectedIds(new Set());
  }, [products]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === visibleProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleProducts.map(p => p.id)));
    }
  };

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={(e) => { e.stopPropagation(); handleSort(field); }}
      className="flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {label}
      <ArrowUpDown className={cn(
        'w-3 h-3',
        sortField === field ? 'text-accent' : 'text-muted-foreground/50'
      )} />
    </button>
  );

  const handleExportProducts = async () => {
    let productsToExport = filteredProducts;
    
    // Filter by selected shelves if any
    if (exportShelfIds.size > 0) {
      const selectedShelfNames = shelves
        .filter(s => exportShelfIds.has(s.id))
        .map(s => s.name);
      productsToExport = productsToExport.filter(p => 
        selectedShelfNames.includes(p.rafKonum)
      );
    }

    if (productsToExport.length === 0) {
      const { toast } = await import('sonner');
      toast.error('Seçilen raflarda ürün bulunamadı');
      return;
    }

    const exportData = productsToExport.map(p => ({
      'Ürün Kodu': p.urunKodu,
      'Ürün Adı': p.urunAdi,
      'Barkod': p.barkod || '',
      'Raf Konum': p.rafKonum,
      'Açılış Stok': p.acilisStok,
      'Toplam Giriş': p.toplamGiris,
      'Toplam Çıkış': p.toplamCikis,
      'Mevcut Stok': p.mevcutStok,
      'Set Stok': p.setStok || 0,
      'Min Stok': p.minStok,
      'Uyarı': p.uyari ? 'Evet' : 'Hayır',
      'Son İşlem Tarihi': p.sonIslemTarihi || '',
      'Not': p.not || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    ws['!cols'] = [
      { wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 15 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
      { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 15 }, { wch: 25 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ürünler');
    XLSX.writeFile(wb, `urunler-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const toggleExportShelf = (shelfId: string) => {
    setExportShelfIds(prev => {
      const next = new Set(prev);
      if (next.has(shelfId)) next.delete(shelfId);
      else next.add(shelfId);
      return next;
    });
  };

  const handleBulkDelete = (ids: string[]) => {
    ids.forEach(id => onDeleteProduct(id));
    setSelectedIds(new Set());
  };

  const isMobile = useIsMobile();

  return (
    <div className="animate-slide-up space-y-3">
      {/* Server Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          placeholder="Ürün adı, kodu veya barkod ile ara..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-10 h-10"
          style={{ fontSize: '16px' }}
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {/* Category Filter */}
      {categories.length > 0 && (
        <CategoryFilter
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
      )}

      {/* Bulk Actions */}
      <BulkActions
        selectedProducts={selectedProducts}
        onClearSelection={() => setSelectedIds(new Set())}
        onBulkDelete={canDeleteProducts ? handleBulkDelete : undefined}
      />

      {/* Action Bar */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {searchResults !== null ? filteredProducts.length : (totalCount ?? filteredProducts.length)} ürün
          {selectedCategory && <span className="ml-1">({selectedCategory})</span>}
        </p>
        <div className="flex items-center gap-2">
          <Popover modal={true} open={shelfPopoverOpen} onOpenChange={(open) => { setShelfPopoverOpen(open); if (!open) setShelfSearch(''); }}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Filter className="w-4 h-4" />
                Raf
                {exportShelfIds.size > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                    {exportShelfIds.size}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="end">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Dışa Aktarılacak Raflar</p>
                  {exportShelfIds.size > 0 && (
                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setExportShelfIds(new Set())}>
                      Temizle
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Raf seçilmezse tüm ürünler dışa aktarılır.</p>
                <Input
                  type="text"
                  placeholder="Raf ara..."
                  value={shelfSearch}
                  onChange={(e) => setShelfSearch(e.target.value)}
                  className="h-8 text-sm"
                />
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {shelves.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2 text-center">Yükleniyor...</p>
                  ) : (
                    shelves
                      .filter(s => !shelfSearch || s.name.toLowerCase().includes(shelfSearch.toLowerCase()))
                      .map(shelf => (
                        <label key={shelf.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent/50 cursor-pointer text-sm">
                          <Checkbox
                            checked={exportShelfIds.has(shelf.id)}
                            onCheckedChange={() => toggleExportShelf(shelf.id)}
                          />
                          {shelf.name}
                        </label>
                      ))
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="sm" onClick={handleExportProducts}>
            <Download className="w-4 h-4 mr-1.5" />
            Excel
          </Button>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block stat-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="py-4 px-3 w-10">
                  <Checkbox
                    checked={visibleProducts.length > 0 && selectedIds.size === visibleProducts.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </th>
                <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">
                  <SortButton field="urunKodu" label="Ürün Kodu" />
                </th>
                <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">
                  <SortButton field="urunAdi" label="Ürün Adı" />
                </th>
                <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">
                  <SortButton field="rafKonum" label="Konum" />
                </th>
                <th className="text-right py-4 px-4 text-sm font-medium text-muted-foreground">
                  <SortButton field="mevcutStok" label="Stok" />
                </th>
                <th className="text-right py-4 px-4 text-sm font-medium text-muted-foreground">
                  Set
                </th>
                <th className="text-center py-4 px-4 text-sm font-medium text-muted-foreground">
                  Durum
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleProducts.map((product, index) => {
                const isLowStock = product.mevcutStok < product.minStok;
                const delay = index < 20 ? index * 20 : 0;
                const isSelected = selectedIds.has(product.id);
                const category = (product as any).category;
                return (
                  <tr 
                    key={product.id} 
                    className={cn(
                      "border-b border-border last:border-0 animate-fade-in cursor-pointer transition-colors hover:bg-accent/50",
                      isSelected && "bg-primary/5"
                    )}
                    style={delay ? { animationDelay: `${delay}ms` } : undefined}
                    onClick={() => onViewProduct(product.id)}
                  >
                    <td className="py-4 px-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(product.id)}
                      />
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
                        {product.urunKodu}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Package className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <span className="font-medium text-foreground">{product.urunAdi}</span>
                          {category && (
                            <span className={cn(
                              'ml-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium border',
                              getCategoryColor(category)
                            )}>
                              {category}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>{product.rafKonum}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className={cn(
                        'font-semibold',
                        isLowStock ? 'text-destructive' : 'text-foreground'
                      )}>
                        {product.mevcutStok}
                      </span>
                      <span className="text-muted-foreground text-sm ml-1">
                        / {product.minStok}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="font-medium text-muted-foreground">
                        {product.setStok || 0}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {(() => {
                        const pStatus = getProductStatus(product);
                        if (pStatus === 'catalog_only') {
                          return (
                            <span className={cn('badge-status border', getStatusColor('catalog_only'))}>
                              Katalog
                            </span>
                          );
                        }
                        if (pStatus === 'out_of_stock') {
                          return (
                            <span className={cn('badge-status border', getStatusColor('out_of_stock'))}>
                              Stok Yok
                            </span>
                          );
                        }
                        if (isLowStock) {
                          return (
                            <span className="badge-status bg-destructive/10 text-destructive">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Düşük
                            </span>
                          );
                        }
                        return (
                          <span className="badge-status bg-success/10 text-success">
                            Normal
                          </span>
                        );
                      })()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards with Swipe Gestures */}
      <div className="md:hidden space-y-2">
        {visibleProducts.map((product, index) => {
          const delay = index < 20 ? index * 30 : 0;
          return (
            <SwipeableProductCard
              key={product.id}
              product={product}
              isSelected={selectedIds.has(product.id)}
              delay={delay}
              onView={() => onViewProduct(product.id)}
              onToggleSelect={() => toggleSelect(product.id)}
              onStockAction={onStockAction}
            />
          );
        })}
      </div>

      {sortedProducts.length === 0 && (
        <div className="stat-card text-center py-12">
          <Package className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Ürün bulunamadı</h3>
          <p className="text-muted-foreground">Arama kriterlerinize uygun ürün yok.</p>
        </div>
      )}

      {/* Server-side Load More — only shown when not in search mode */}
      {searchResults === null && hasMore && onLoadMore && (
        <div className="mt-4 stat-card">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Gösterilen: <span className="font-medium text-foreground">{products.length}</span> / <span className="font-medium text-foreground">{totalCount ?? products.length}</span>
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={onLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Yükleniyor...</>
              ) : (
                'Daha fazla yükle'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Swipeable mobile product card
function SwipeableProductCard({
  product,
  isSelected,
  delay,
  onView,
  onToggleSelect,
  onStockAction,
}: {
  product: Product;
  isSelected: boolean;
  delay: number;
  onView: () => void;
  onToggleSelect: () => void;
  onStockAction: (product: Product, type: 'giris' | 'cikis') => void;
}) {
  const { lightHaptic } = useHaptics();
  const isLowStock = product.mevcutStok < product.minStok;
  const category = (product as any).category;

  const { swipeOffset, lockedDirection, resetSwipe, onTouchStart, onTouchMove, onTouchEnd } = useSwipeGesture({
    threshold: 60,
    lockOffset: 80,
    onSwipeRight: () => {
      lightHaptic();
    },
    onSwipeLeft: () => {
      lightHaptic();
    },
    onLongPress: () => {
      lightHaptic();
      onStockAction(product, 'giris');
    },
  });

  const handleActionClick = (type: 'giris' | 'cikis') => {
    lightHaptic();
    resetSwipe();
    onStockAction(product, type);
  };

  const handleCardClick = () => {
    if (lockedDirection) {
      resetSwipe();
      return;
    }
    onView();
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Swipe reveal backgrounds */}
      <div className="absolute inset-0 flex">
        {/* Right swipe = Giriş (green) */}
        <button
          type="button"
          onClick={() => handleActionClick('giris')}
          className={cn(
            'flex-1 flex items-center justify-start pl-5 bg-success transition-opacity',
            swipeOffset > 10 || lockedDirection === 'right' ? 'opacity-100' : 'opacity-0'
          )}
        >
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Plus className="w-6 h-6 text-white" />
            </div>
            <span className="text-sm font-bold text-white">Giriş</span>
          </div>
        </button>
        {/* Left swipe = Çıkış (red) */}
        <button
          type="button"
          onClick={() => handleActionClick('cikis')}
          className={cn(
            'flex-1 flex items-center justify-end pr-5 bg-destructive transition-opacity',
            swipeOffset < -10 || lockedDirection === 'left' ? 'opacity-100' : 'opacity-0'
          )}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">Çıkış</span>
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Minus className="w-6 h-6 text-white" />
            </div>
          </div>
        </button>
      </div>

      {/* Card */}
      <div
        className={cn(
          "stat-card relative z-10 cursor-pointer transition-colors active:bg-accent/50 touch-feedback",
          isSelected && "ring-2 ring-primary/30"
        )}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: lockedDirection || swipeOffset === 0 ? 'transform 0.3s ease' : 'none',
          ...(delay ? { animationDelay: `${delay}ms` } : {}),
        }}
        onClick={handleCardClick}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={isSelected}
                onCheckedChange={onToggleSelect}
              />
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">{product.urunAdi}</h3>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground font-mono">{product.urunKodu}</p>
                {category && (
                  <span className={cn(
                    'inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border',
                    getCategoryColor(category)
                  )}>
                    {category}
                  </span>
                )}
              </div>
            </div>
          </div>
          {(() => {
            const pStatus = getProductStatus(product);
            if (pStatus === 'catalog_only') {
              return (
                <span className={cn('badge-status border text-xs', getStatusColor('catalog_only'))}>
                  Katalog
                </span>
              );
            }
            if (pStatus === 'out_of_stock') {
              return (
                <span className={cn('badge-status border text-xs', getStatusColor('out_of_stock'))}>
                  Stok Yok
                </span>
              );
            }
            if (isLowStock) {
              return (
                <span className="badge-status bg-destructive/10 text-destructive">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Düşük
                </span>
              );
            }
            return (
              <span className="badge-status bg-success/10 text-success text-xs">
                Normal
              </span>
            );
          })()}
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>{product.rafKonum}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className={cn(
                'font-semibold text-lg',
                isLowStock ? 'text-destructive' : 'text-foreground'
              )}>
                {product.mevcutStok}
              </span>
              <span className="text-muted-foreground ml-1">/ {product.minStok}</span>
            </div>
            {(product.setStok || 0) > 0 && (
              <div className="text-right border-l pl-3 border-border">
                <span className="text-sm text-muted-foreground">Set: </span>
                <span className="font-medium">{product.setStok}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
