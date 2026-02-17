import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  ScanBarcode,
  X,
  Plus,
  Minus,
  ArrowLeftRight,
  ClipboardList,
  Wifi,
  WifiOff,
  ChevronRight,
  Activity,
} from 'lucide-react';
import { GlobalScannerButton } from '@/modules/globalScanner/GlobalScannerButton';
import { Product } from '@/types/stock';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useWorkingContext } from '@/hooks/useWorkingContext';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { globalSearch, SearchResult, findByBarcode } from '@/lib/globalSearch';
import { RadialActionMenu } from './RadialActionMenu';
import { AlertsPopover } from './AlertsPopover';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';

interface SmartTopBarProps {
  products: Product[];
  onAddProduct: () => void;
  onProductFound: (product: Product) => void;
  onBarcodeNotFound: (barcode: string) => void;
  onStockAction: (product: Product, type: 'giris' | 'cikis') => void;
  onViewProduct: (id: string) => void;
  onStockUpdated?: () => void;
  onOpenScan: () => void;
  onOpenTransfer: () => void;
}

// Command definitions
const COMMANDS = [
  { key: 'new product', label: 'Yeni Ürün Ekle', icon: '📦' },
  { key: 'transfer', label: 'Raf Transferi', icon: '🔄' },
  { key: 'quick count', label: 'Hızlı Sayım', icon: '📋' },
  { key: 'last movements', label: 'Son Hareketler', icon: '📊' },
  { key: 'alerts', label: 'Uyarılar', icon: '🔔' },
  { key: 'settings', label: 'Ayarlar', icon: '⚙️' },
  { key: 'reports', label: 'Raporlar', icon: '📈' },
  { key: 'locations', label: 'Konumlar', icon: '📍' },
];

export function SmartTopBar({
  products,
  onAddProduct,
  onProductFound,
  onBarcodeNotFound,
  onStockAction,
  onViewProduct,
  onStockUpdated,
  onOpenScan,
  onOpenTransfer,
}: SmartTopBarProps) {
  const navigate = useNavigate();
  const ctx = useWorkingContext();
  const { pendingActions, syncing } = useOfflineSync();
  const inputRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>();
  const autoHideTimer = useRef<ReturnType<typeof setTimeout>>();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [commandResults, setCommandResults] = useState<typeof COMMANDS>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const [mobileInputExpanded, setMobileInputExpanded] = useState(false);

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const isCommandMode = query.startsWith('>');

  // Sync status
  const syncState: 'synced' | 'pending' | 'offline' = !isOnline
    ? 'offline'
    : pendingActions.length > 0
    ? 'pending'
    : 'synced';

  const syncColors = {
    synced: 'bg-green-500',
    pending: 'bg-yellow-500 animate-pulse',
    offline: 'bg-red-500',
  };

  const syncLabels = {
    synced: 'Senkron',
    pending: `${pendingActions.length} bekliyor`,
    offline: 'Çevrimdışı',
  };

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setMobileInputExpanded(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Auto-hide product strip after 30s
  useEffect(() => {
    if (ctx.lastProduct) {
      if (autoHideTimer.current) clearTimeout(autoHideTimer.current);
      autoHideTimer.current = setTimeout(() => ctx.clearContext(), 30000);
    }
    return () => { if (autoHideTimer.current) clearTimeout(autoHideTimer.current); };
  }, [ctx.lastProduct]);

  // Search logic
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setCommandResults([]);
      setShowDropdown(false);
      return;
    }

    if (isCommandMode) {
      const cmdQuery = query.substring(1).trim().toLowerCase();
      const filtered = cmdQuery
        ? COMMANDS.filter(c => c.key.includes(cmdQuery) || c.label.toLowerCase().includes(cmdQuery))
        : COMMANDS;
      setCommandResults(filtered);
      setResults([]);
      setShowDropdown(true);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      const res = await globalSearch(query);
      setResults(res);
      setCommandResults([]);
      setShowDropdown(true);
      setSearching(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [query, isCommandMode]);

  const executeCommand = useCallback((key: string) => {
    setQuery('');
    setShowDropdown(false);
    setMobileInputExpanded(false);
    switch (key) {
      case 'new product': onAddProduct(); break;
      case 'transfer': onOpenTransfer(); break;
      case 'quick count': navigate('/'); break;
      case 'last movements': navigate('/'); break;
      case 'alerts': navigate('/'); break;
      case 'settings': navigate('/'); break;
      case 'reports': navigate('/'); break;
      case 'locations': navigate('/'); break;
    }
  }, [onAddProduct, onOpenTransfer, navigate]);

  const handleResultClick = useCallback(async (result: SearchResult) => {
    setQuery('');
    setShowDropdown(false);
    setMobileInputExpanded(false);
    try {
      if (result.type === 'product') {
        let product = products.find(p => p.id === result.id);
        if (!product) {
          console.log('[Search] Product not in local cache, fetching from DB:', result.id);
          const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', result.id)
            .maybeSingle();
          if (error) {
            console.error('[Search] DB fetch error:', error);
            toast({ title: 'Ürün bilgisi alınamadı', description: error.message, variant: 'destructive' });
            return;
          }
          if (data) {
            product = {
              id: data.id,
              urunKodu: data.urun_kodu,
              urunAdi: data.urun_adi,
              rafKonum: data.raf_konum,
              barkod: data.barkod || undefined,
              acilisStok: data.acilis_stok,
              toplamGiris: data.toplam_giris,
              toplamCikis: data.toplam_cikis,
              mevcutStok: data.mevcut_stok,
              setStok: data.set_stok || 0,
              minStok: data.min_stok,
              uyari: data.uyari,
              sonIslemTarihi: data.son_islem_tarihi || undefined,
              not: data.notes || undefined,
              category: data.category || undefined,
            };
          }
        }
        if (product) {
          ctx.setProduct({ id: product.id, name: product.urunAdi });
          onProductFound(product);
        } else {
          console.warn('[Search] Product not found:', result.id);
          toast({ title: 'Ürün bulunamadı', variant: 'destructive' });
        }
      } else if (result.type === 'shelf') {
        ctx.setShelf({ id: result.id, name: result.name });
        navigate('/');
      }
    } catch (err) {
      console.error('[Search] handleResultClick error:', err);
      toast({ title: 'Bir hata oluştu', variant: 'destructive' });
    }
  }, [products, onProductFound, ctx, navigate]);

  const handleInputKeyDown = useCallback(async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim() && !isCommandMode) {
      // Try barcode lookup
      setSearching(true);
      const res = await findByBarcode(query.trim());
      setSearching(false);
      if (res.type === 'product') {
        const product = products.find(p => p.id === res.id);
        if (product) {
          ctx.setProduct({ id: product.id, name: product.urunAdi });
          onProductFound(product);
          setQuery('');
          setShowDropdown(false);
          setMobileInputExpanded(false);
        }
      } else if (res.type === 'unknown') {
        onBarcodeNotFound(query.trim());
        setQuery('');
        setShowDropdown(false);
        setMobileInputExpanded(false);
      }
    }
    if (e.key === 'Escape') {
      setQuery('');
      setShowDropdown(false);
      setMobileInputExpanded(false);
      inputRef.current?.blur();
    }
  }, [query, isCommandMode, products, onProductFound, onBarcodeNotFound, ctx]);

  // Long press handler for command palette
  const handleLongPressStart = () => {
    longPressTimer.current = setTimeout(() => {
      // Trigger Ctrl+K equivalent
      inputRef.current?.focus();
      setQuery('>');
      setMobileInputExpanded(true);
    }, 500);
  };
  const handleLongPressEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  // Stock action helpers for locked product
  const lockedProduct = ctx.lastProduct ? products.find(p => p.id === ctx.lastProduct!.id) : null;

  const handleQuickStockIn = () => { if (lockedProduct) onStockAction(lockedProduct, 'giris'); };
  const handleQuickStockOut = () => { if (lockedProduct) onStockAction(lockedProduct, 'cikis'); };

  return (
    <header
      className="sticky top-0 z-30 safe-area-top"
      onTouchStart={handleLongPressStart}
      onTouchEnd={handleLongPressEnd}
      onMouseDown={handleLongPressStart}
      onMouseUp={handleLongPressEnd}
      onMouseLeave={handleLongPressEnd}
    >
      {/* Main Bar */}
      <div className="bg-card/85 backdrop-blur-xl border-b border-border">
        <div className="flex items-center gap-2 px-2 md:px-4 h-12 md:h-14">

          {/* LEFT — Context Brain */}
          <div className={cn(
            "flex items-center gap-1.5 flex-shrink-0 transition-all",
            mobileInputExpanded ? 'hidden md:flex' : 'flex'
          )}>
            {/* Sync dot */}
            <div className="flex items-center gap-1.5" title={syncLabels[syncState]}>
              <span className={cn('w-2 h-2 rounded-full flex-shrink-0', syncColors[syncState])} />
              <span className="hidden lg:inline text-[10px] font-medium text-muted-foreground">
                {syncLabels[syncState]}
              </span>
            </div>

            {/* Context chip */}
            {ctx.lastProduct ? (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary max-w-[120px] lg:max-w-[180px]">
                <span className="text-[10px] font-medium truncate">{ctx.lastProduct.name}</span>
              </div>
            ) : ctx.lastShelf ? (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 text-accent max-w-[100px] lg:max-w-[140px]">
                <span className="text-[10px] font-medium truncate">{ctx.lastShelf.name}</span>
              </div>
            ) : (
              <span className="hidden lg:inline text-[10px] text-muted-foreground">Hazır</span>
            )}

            <div className="hidden lg:block w-px h-5 bg-border mx-1" />
          </div>

          {/* CENTER — Universal Command Input */}
          <div className="relative flex-1 min-w-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => { setMobileInputExpanded(true); if (query) setShowDropdown(true); }}
                onKeyDown={handleInputKeyDown}
                placeholder={mobileInputExpanded ? 'Ürün, barkod, raf veya > komut' : 'Ara... ⌘K'}
                className={cn(
                  "w-full h-8 md:h-9 pl-8 pr-8 text-xs md:text-sm rounded-lg",
                  "bg-secondary/50 border border-transparent",
                  "focus:border-primary/40 focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary/20",
                  "placeholder:text-muted-foreground/60 transition-all",
                  searching && "pr-12"
                )}
                style={{ fontSize: '16px' }}
              />
              {query && (
                <button
                  onClick={() => { setQuery(''); setShowDropdown(false); setMobileInputExpanded(false); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}
              {searching && (
                <div className="absolute right-8 top-1/2 -translate-y-1/2">
                  <div className="w-3 h-3 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Dropdown */}
            {showDropdown && (results.length > 0 || commandResults.length > 0) && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50 animate-scale-in">
                <ScrollArea className="max-h-64">
                  {/* Command results */}
                  {commandResults.length > 0 && (
                    <div>
                      <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">
                        Komutlar
                      </div>
                      {commandResults.map(cmd => (
                        <button
                          key={cmd.key}
                          onClick={() => executeCommand(cmd.key)}
                          className="flex items-center gap-2.5 w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                        >
                          <span className="text-sm">{cmd.icon}</span>
                          <span className="text-xs font-medium text-foreground">{cmd.label}</span>
                          <ChevronRight className="w-3 h-3 text-muted-foreground ml-auto" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Search results - Products */}
                  {results.filter(r => r.type === 'product').length > 0 && (
                    <div>
                      <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">
                        Ürünler
                      </div>
                      {results.filter(r => r.type === 'product').map(r => (
                        <button
                          key={r.id}
                          onClick={() => handleResultClick(r)}
                          onTouchStart={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.preventDefault()}
                          className="flex items-center gap-2.5 w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                        >
                          <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] font-bold text-primary">
                              {r.type === 'product' ? r.name.charAt(0) : ''}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{r.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {r.type === 'product' && `${r.code} · Stok: ${r.stock}`}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Search results - Shelves */}
                  {results.filter(r => r.type === 'shelf').length > 0 && (
                    <div>
                      <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">
                        Raflar
                      </div>
                      {results.filter(r => r.type === 'shelf').map(r => (
                        <button
                          key={r.id}
                          onClick={() => handleResultClick(r)}
                          onTouchStart={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.preventDefault()}
                          className="flex items-center gap-2.5 w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                        >
                          <div className="w-6 h-6 rounded bg-accent/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] font-bold text-accent">{r.name.charAt(0)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{r.name}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}
          </div>

          {/* RIGHT — Instant Actions */}
          <div className={cn(
            "flex items-center gap-0.5 flex-shrink-0 transition-all",
            mobileInputExpanded && query ? 'hidden md:flex' : 'flex'
          )}>
            {/* Global Scanner Button */}
            <GlobalScannerButton />

            {/* Radial Action Menu */}
            <RadialActionMenu
              onStockIn={() => { if (lockedProduct) onStockAction(lockedProduct, 'giris'); else onAddProduct(); }}
              onStockOut={() => { if (lockedProduct) onStockAction(lockedProduct, 'cikis'); }}
              onCount={() => navigate('/')}
              onTransfer={onOpenTransfer}
              onDamage={() => navigate('/')}
              onPrintLabel={() => navigate('/')}
            />

            {/* Alerts Popover */}
            <AlertsPopover
              products={products}
              pendingSyncCount={pendingActions.length}
              onRestockProduct={(p) => onStockAction(p, 'giris')}
              onViewProduct={onViewProduct}
            />

            {/* Session count */}
            <div className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50" title="Bugünkü işlemler">
              <Activity className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[10px] font-semibold text-muted-foreground">{ctx.sessionCount}</span>
            </div>
          </div>

          {/* Mobile cancel button when input expanded */}
          {mobileInputExpanded && (
            <button
              onClick={() => { setMobileInputExpanded(false); setQuery(''); setShowDropdown(false); inputRef.current?.blur(); }}
              className="md:hidden text-xs font-medium text-primary flex-shrink-0 px-1"
            >
              İptal
            </button>
          )}
        </div>
      </div>

      {/* Post-Scan Quick Action Strip */}
      {lockedProduct && (
        <div className="bg-card/90 backdrop-blur-lg border-b border-border animate-slide-up">
          <div className="flex items-center gap-1.5 px-2 md:px-4 h-10">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{lockedProduct.urunAdi}</p>
              <p className="text-[10px] text-muted-foreground">Stok: {lockedProduct.mevcutStok}</p>
            </div>
            <button
              onClick={handleQuickStockIn}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-green-500/10 text-green-600 text-[11px] font-medium hover:bg-green-500/20 transition-colors touch-feedback"
            >
              <Plus className="w-3 h-3" /> Giriş
            </button>
            <button
              onClick={handleQuickStockOut}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-500/10 text-red-600 text-[11px] font-medium hover:bg-red-500/20 transition-colors touch-feedback"
            >
              <Minus className="w-3 h-3" /> Çıkış
            </button>
            <button
              onClick={() => { if (lockedProduct) { onViewProduct(lockedProduct.id); } }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 text-[11px] font-medium hover:bg-blue-500/20 transition-colors touch-feedback"
            >
              <ClipboardList className="w-3 h-3" /> Detay
            </button>
            <button
              onClick={onOpenTransfer}
              className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-600 text-[11px] font-medium hover:bg-purple-500/20 transition-colors touch-feedback"
            >
              <ArrowLeftRight className="w-3 h-3" /> Transfer
            </button>
            <button
              onClick={ctx.clearContext}
              className="p-1 rounded hover:bg-muted transition-colors"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}

      {/* Click overlay to close dropdown */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => { setShowDropdown(false); }}
        />
      )}
    </header>
  );
}
