import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Search, Package, MapPin, ArrowLeftRight, Plus, BarChart3, Settings,
  LayoutDashboard, AlertTriangle, Users, ScrollText, Archive, Scan,
  ClipboardList, RefreshCw, Command as CommandIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/usePermissions';
import { globalSearch, SearchResult } from '@/lib/globalSearch';
import { Product } from '@/types/stock';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface CommandPaletteProps {
  onNavigate: (view: string) => void;
  onAddProduct: () => void;
  products: Product[];
  onProductFound: (product: Product) => void;
}

export function CommandPalette({ onNavigate, onAddProduct, products, onProductFound }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await globalSearch(q);
      setSearchResults(results);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 250);
  };

  const handleSelect = (action: string) => {
    setOpen(false);
    setQuery('');
    setSearchResults([]);

    if (action.startsWith('nav:')) {
      const path = action.replace('nav:', '');
      navigate(path);
    } else if (action.startsWith('product:')) {
      const id = action.replace('product:', '');
      const product = products.find(p => p.id === id);
      if (product) onProductFound(product);
    } else if (action.startsWith('shelf:')) {
      navigate('/locations');
    } else if (action === 'action:new-product') {
      onAddProduct();
    } else if (action === 'action:new-movement') {
      navigate('/movements');
    }
  };

  const navigationItems = [
    { path: '/', label: 'Kontrol Paneli', icon: LayoutDashboard },
    { path: '/products', label: 'Ürünler', icon: Package },
    { path: '/locations', label: 'Raflar', icon: MapPin },
    { path: '/movements', label: 'Stok Hareketleri', icon: ArrowLeftRight },
    { path: '/reports', label: 'Raporlar', icon: BarChart3, perm: 'reports.view' as const },
    { path: '/alerts', label: 'Uyarılar', icon: AlertTriangle },
    { path: '/users', label: 'Kullanıcılar', icon: Users, perm: 'users.view' as const },
    { path: '/logs', label: 'Denetim Günlüğü', icon: ScrollText, perm: 'logs.view' as const },
    { path: '/settings', label: 'Ayarlar', icon: Settings, perm: 'settings.view' as const },
    { path: '/archive', label: 'Arşiv', icon: Archive, perm: 'products.delete' as const },
  ];

  const actionItems = [
    { id: 'action:new-product', label: 'Yeni Ürün', icon: Plus, perm: 'products.create' as const },
    { id: 'action:new-movement', label: 'Yeni Hareket', icon: ArrowLeftRight, perm: 'stock_movements.create' as const },
  ];

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(true)}
            className="h-9 w-9"
          >
            <CommandIcon className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Komut Paleti <kbd className="ml-1 text-xs bg-muted px-1 rounded">⌘K</kbd></p>
        </TooltipContent>
      </Tooltip>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Ürün, raf, barkod ara veya komut yaz..."
          value={query}
          onValueChange={handleQueryChange}
        />
        <CommandList>
          <CommandEmpty>
            {searching ? 'Aranıyor...' : 'Sonuç bulunamadı.'}
          </CommandEmpty>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <CommandGroup heading="Arama Sonuçları">
              {searchResults.map(result => (
                <CommandItem
                  key={`${result.type}-${result.id}`}
                  value={`${result.type}:${result.id}`}
                  onSelect={() => handleSelect(`${result.type}:${result.id}`)}
                >
                  {result.type === 'product' ? (
                    <>
                      <Package className="mr-2 h-4 w-4 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span>{result.name}</span>
                        <span className="text-xs text-muted-foreground">{result.code} • Stok: {result.stock}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>{result.name}</span>
                    </>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Actions */}
          {!query && (
            <>
              <CommandGroup heading="İşlemler">
                {actionItems
                  .filter(item => !item.perm || hasPermission(item.perm))
                  .map(item => {
                    const Icon = item.icon;
                    return (
                      <CommandItem key={item.id} value={item.id} onSelect={() => handleSelect(item.id)}>
                        <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span>{item.label}</span>
                      </CommandItem>
                    );
                  })}
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup heading="Gezinme">
                {navigationItems
                  .filter(item => !item.perm || hasPermission(item.perm))
                  .map(item => {
                    const Icon = item.icon;
                    return (
                      <CommandItem key={item.path} value={`nav:${item.path}`} onSelect={() => handleSelect(`nav:${item.path}`)}>
                        <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span>{item.label}</span>
                      </CommandItem>
                    );
                  })}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
