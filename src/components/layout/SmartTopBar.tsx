import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  X,
  Plus,
  Minus,
  ArrowLeftRight,
  ClipboardList,
  ChevronRight,
  Activity,
} from 'lucide-react';
import { GlobalScannerButton } from '@/modules/globalScanner/GlobalScannerButton';
import { Product } from '@/types/stock';
import { useNavigate } from 'react-router-dom';
import { useWorkingContext } from '@/hooks/useWorkingContext';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useSearchController } from '@/contexts/SearchController';
import { findByBarcode } from '@/lib/globalSearch';
import { RadialActionMenu } from './RadialActionMenu';
import { AlertsPopover } from './AlertsPopover';
import { cn } from '@/lib/utils';

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

interface SmartTopBarProps {
  products: Product[];
  onAddProduct: () => void;
  onProductFound: (product: Product) => void;
  onBarcodeNotFound: (barcode: string) => void;
  onStockAction: (product: Product, type: 'giris' | 'cikis') => void;
  onStockUpdated?: () => void;
  onOpenScan: () => void;
  onOpenTransfer: () => void;
}

export function SmartTopBar({
  products,
  onAddProduct,
  onProductFound,
  onBarcodeNotFound,
  onStockAction,
  onStockUpdated,
  onOpenScan,
  onOpenTransfer,
}: SmartTopBarProps) {
  const navigate = useNavigate();
  const ctx = useWorkingContext();
  const { pendingActions } = useOfflineSync();
  const search = useSearchController();
  const inputRef = useRef<HTMLInputElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>();
  const autoHideTimer = useRef<ReturnType<typeof setTimeout>>();

  const [commandResults, setCommandResults] = useState<typeof COMMANDS>([]);
  const [mobileInputExpanded, setMobileInputExpanded] = useState(false);

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const isCommandMode = search.query.startsWith('>');

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

  // Command mode filtering
  useEffect(() => {
    if (isCommandMode) {
      const cmdQuery = search.query.substring(1).trim().toLowerCase();
      const filtered = cmdQuery
        ? COMMANDS.filter(c => c.key.includes(cmdQuery) || c.label.toLowerCase().includes(cmdQuery))
        : COMMANDS;
      setCommandResults(filtered);
    } else {
      setCommandResults([]);
    }
  }, [search.query, isCommandMode]);

  const executeCommand = useCallback((key: string) => {
    search.clear();
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
  }, [onAddProduct, onOpenTransfer, navigate, search]);

  const handleProductResult = useCallback((id: string) => {
    setMobileInputExpanded(false);
    inputRef.current?.blur();
    search.openProduct(id);
  }, [search]);

  const handleShelfResult = useCallback((id: string, name: string) => {
    search.clear();
    setMobileInputExpanded(false);
    inputRef.current?.blur();
    ctx.setShelf({ id, name });
    navigate('/');
  }, [search, ctx, navigate]);

  const handleInputKeyDown = useCallback(async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && search.query.trim() && !isCommandMode) {
      const res = await findByBarcode(search.query.trim());
      if (res.type === 'product' && res.id) {
        const product = products.find(p => p.id === res.id);
        if (product) {
          ctx.setProduct({ id: product.id, name: product.urunAdi });
          onProductFound(product);
          search.clear();
          setMobileInputExpanded(false);
        }
      } else if (res.type === 'unknown') {
        onBarcodeNotFound(search.query.trim());
        search.clear();
        setMobileInputExpanded(false);
      }
    }
    if (e.key === 'Escape') {
      search.clear();
      setMobileInputExpanded(false);
      inputRef.current?.blur();
    }
  }, [search, isCommandMode, products, onProductFound, onBarcodeNotFound, ctx]);

  // Long press handler for command palette
  const handleLongPressStart = () => {
    longPressTimer.current = setTimeout(() => {
      inputRef.current?.focus();
      search.setQuery('>');
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

  const showDropdown = search.isOpen && !isCommandMode && search.results.length > 0;
  const showCommandDropdown = isCommandMode && commandResults.length > 0;

  // Hardened event handler factory — fires on ALL interaction types
  const makeResultHandlers = (action: () => void) => ({
    onPointerDownCapture: (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('RESULT CLICKED');
      action();
    },
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      action();
    },
    onClick: (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      action();
    },
    onTouchEnd: (e: React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      action();
    },
  });

  // Compute dropdown position based on input element
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  useEffect(() => {
    if ((showDropdown || showCommandDropdown) && inputContainerRef.current) {
      const rect = inputContainerRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  }, [showDropdown, showCommandDropdown, search.query]);

  return (
    <>
    <header
      className="sticky top-0 z-30 safe-area-top"
      onTouchStart={handleLongPressStart}
      onTouchEnd={handleLongPressEnd}
    >
      {/* Main Bar */}
      <div className="bg-card/85 backdrop-blur-xl border-b border-border">
        <div className="flex items-center gap-2 px-2 md:px-4 h-12 md:h-14">

          {/* LEFT — Context Brain */}
          <div className={cn(
            "flex items-center gap-1.5 flex-shrink-0 transition-all",
            mobileInputExpanded ? 'hidden md:flex' : 'flex'
          )}>
            <div className="flex items-center gap-1.5" title={syncLabels[syncState]}>
              <span className={cn('w-2 h-2 rounded-full flex-shrink-0', syncColors[syncState])} />
              <span className="hidden lg:inline text-[10px] font-medium text-muted-foreground">
                {syncLabels[syncState]}
              </span>
            </div>

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
          <div ref={inputContainerRef} className="relative flex-1 min-w-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={search.query}
                onChange={e => search.setQuery(e.target.value)}
                onFocus={() => {
                  setMobileInputExpanded(true);
                  if (search.query.trim().length >= 2) search.openDropdown();
                }}
                onKeyDown={handleInputKeyDown}
                placeholder={mobileInputExpanded ? 'Ürün, barkod, raf veya > komut' : 'Ara... ⌘K'}
                className={cn(
                  "w-full h-8 md:h-9 pl-8 pr-8 text-xs md:text-sm rounded-lg",
                  "bg-secondary/50 border border-transparent",
                  "focus:border-primary/40 focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary/20",
                  "placeholder:text-muted-foreground/60 transition-all",
                  search.loading && "pr-12"
                )}
                style={{ fontSize: '16px' }}
              />
              {search.query && (
                <button
                  onClick={() => { search.clear(); setMobileInputExpanded(false); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}
              {search.loading && (
                <div className="absolute right-8 top-1/2 -translate-y-1/2">
                  <div className="w-3 h-3 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — Instant Actions */}
          <div className={cn(
            "flex items-center gap-0.5 flex-shrink-0 transition-all",
            mobileInputExpanded && search.query ? 'hidden md:flex' : 'flex'
          )}>
            <GlobalScannerButton />
            <RadialActionMenu
              onStockIn={() => { if (lockedProduct) onStockAction(lockedProduct, 'giris'); else onAddProduct(); }}
              onStockOut={() => { if (lockedProduct) onStockAction(lockedProduct, 'cikis'); }}
              onCount={() => navigate('/')}
              onTransfer={onOpenTransfer}
              onDamage={() => navigate('/')}
              onPrintLabel={() => navigate('/')}
            />
            <AlertsPopover
              products={products}
              pendingSyncCount={pendingActions.length}
              onRestockProduct={(p) => onStockAction(p, 'giris')}
              onViewProduct={(id) => search.openProduct(id)}
            />
            <div className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50" title="Bugünkü işlemler">
              <Activity className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[10px] font-semibold text-muted-foreground">{ctx.sessionCount}</span>
            </div>
          </div>

          {/* Mobile cancel button when input expanded */}
          {mobileInputExpanded && (
            <button
              onClick={() => { setMobileInputExpanded(false); search.clear(); inputRef.current?.blur(); }}
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
              onClick={() => { if (lockedProduct) search.openProduct(lockedProduct.id); }}
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

    </header>

    {/* PORTAL: Dropdown + Backdrop rendered OUTSIDE header stacking context */}
    {(showDropdown || showCommandDropdown) && createPortal(
      <>
        {/* Backdrop — z-[9998] */}
        <div
          className="fixed inset-0"
          style={{ zIndex: 9998, pointerEvents: 'auto' }}
          onClick={(e) => { if (e.target === e.currentTarget) search.closeDropdown(); }}
        />
        {/* Results container — z-[9999], fixed position based on input */}
        <div
          className="fixed bg-popover border border-border rounded-lg shadow-xl overflow-hidden animate-scale-in"
          style={{
            zIndex: 9999,
            pointerEvents: 'auto',
            top: dropdownPos.top,
            left: dropdownPos.left,
            width: dropdownPos.width,
            maxWidth: '100vw',
          }}
        >
          <div className="max-h-64 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            {/* Command results */}
            {showCommandDropdown && (
              <div>
                <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">
                  Komutlar
                </div>
                {commandResults.map(cmd => (
                  <button
                    key={cmd.key}
                    type="button"
                    role="option"
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                    style={{ touchAction: 'manipulation' }}
                    {...makeResultHandlers(() => executeCommand(cmd.key))}
                  >
                    <span className="text-sm">{cmd.icon}</span>
                    <span className="text-xs font-medium text-foreground">{cmd.label}</span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground ml-auto" />
                  </button>
                ))}
              </div>
            )}

            {/* Search results - Products */}
            {search.results.filter(r => r.type === 'product').length > 0 && (
              <div>
                <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">
                  Ürünler
                </div>
                {search.results.filter(r => r.type === 'product').map(r => (
                  <button
                    key={r.id}
                    type="button"
                    role="option"
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                    style={{ touchAction: 'manipulation' }}
                    {...makeResultHandlers(() => handleProductResult(r.id))}
                  >
                    <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-primary">
                        {r.name.charAt(0)}
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
            {search.results.filter(r => r.type === 'shelf').length > 0 && (
              <div>
                <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">
                  Raflar
                </div>
                {search.results.filter(r => r.type === 'shelf').map(r => (
                  <button
                    key={r.id}
                    type="button"
                    role="option"
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                    style={{ touchAction: 'manipulation' }}
                    {...makeResultHandlers(() => handleShelfResult(r.id, r.name))}
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
          </div>
        </div>
      </>,
      document.body
    )}

    </>
  );
}
