import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  Search, ChevronLeft, ChevronRight, Eye, EyeOff, Trash2, Edit2, ExternalLink,
  Copy, Upload, Image as ImageIcon, Package, X, Check, Tag, Loader2, AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ---------- types ----------
export interface GridColumn<T> {
  key: string;
  label: string;
  width?: string;
  render: (item: T) => React.ReactNode;
  mobileRender?: (item: T) => React.ReactNode;
  hideOnMobile?: boolean;
}

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  options: FilterOption[];
}

export interface BulkAction {
  key: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'destructive';
  requiresConfirm?: boolean;
  confirmMessage?: string;
}

export interface AdminDataGridProps<T extends { id: string }> {
  data: T[];
  columns: GridColumn<T>[];
  filters?: FilterConfig[];
  bulkActions?: BulkAction[];
  sortOptions?: FilterOption[];
  isLoading?: boolean;
  pageSize?: number;
  searchPlaceholder?: string;
  emptyMessage?: string;
  // callbacks
  onSearch?: (query: string) => void;
  onFilter?: (key: string, value: string) => void;
  onSort?: (value: string) => void;
  onBulkAction?: (action: string, ids: string[]) => Promise<void>;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onPreview?: (item: T) => void;
  onCopyLink?: (item: T) => void;
  onQuickUpload?: (item: T) => void;
  // render
  mobileCard?: (item: T, selected: boolean, onToggle: () => void) => React.ReactNode;
  getItemImage?: (item: T) => string | null;
  getItemTitle?: (item: T) => string;
  getItemSubtitle?: (item: T) => string;
  getIsVisible?: (item: T) => boolean;
  onToggleVisible?: (item: T, visible: boolean) => void;
}

export function AdminDataGrid<T extends { id: string }>({
  data,
  columns,
  filters = [],
  bulkActions = [],
  sortOptions = [],
  isLoading,
  pageSize = 50,
  searchPlaceholder = 'Ara...',
  emptyMessage = 'Veri bulunamadı',
  onSearch,
  onFilter,
  onSort,
  onBulkAction,
  onEdit,
  onDelete,
  onPreview,
  onCopyLink,
  onQuickUpload,
  mobileCard,
  getItemImage,
  getItemTitle,
  getItemSubtitle,
  getIsVisible,
  onToggleVisible,
}: AdminDataGridProps<T>) {
  const [search, setSearch] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [sortBy, setSortBy] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<{ action: string; message: string } | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // keyboard shortcut: / to focus search, Esc to clear
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setSelected(new Set());
        setSearch('');
        onSearch?.('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onSearch]);

  // debounced search
  const handleSearch = useCallback((val: string) => {
    setSearch(val);
    setPage(0);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearch?.(val), 250);
  }, [onSearch]);

  const handleFilter = (key: string, value: string) => {
    const next = { ...activeFilters };
    if (value === '__all__') delete next[key];
    else next[key] = value;
    setActiveFilters(next);
    setPage(0);
    onFilter?.(key, value);
  };

  const handleSort = (val: string) => {
    setSortBy(val);
    onSort?.(val);
  };

  // pagination
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const paged = data.slice(page * pageSize, (page + 1) * pageSize);

  // selection
  const allSelected = paged.length > 0 && paged.every(item => selected.has(item.id));
  const someSelected = selected.size > 0;

  const toggleAll = () => {
    if (allSelected) {
      const next = new Set(selected);
      paged.forEach(item => next.delete(item.id));
      setSelected(next);
    } else {
      const next = new Set(selected);
      paged.forEach(item => next.add(item.id));
      setSelected(next);
    }
  };

  const toggleItem = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const executeBulkAction = async (action: string) => {
    if (!onBulkAction) return;
    setBulkLoading(true);
    try {
      await onBulkAction(action, Array.from(selected));
      setSelected(new Set());
      toast.success('İşlem tamamlandı');
    } catch (err: any) {
      toast.error(err.message || 'İşlem başarısız');
    } finally {
      setBulkLoading(false);
      setConfirmDialog(null);
    }
  };

  return (
    <div className="space-y-0">
      {/* ===== TOOLBAR ===== */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border pb-3 space-y-3">
        {/* Row 1: Search + Sort + Count */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={searchRef}
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-9 h-9 text-sm"
            />
            {search && (
              <button onClick={() => handleSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {sortOptions.length > 0 && (
            <Select value={sortBy} onValueChange={handleSort}>
              <SelectTrigger className="h-9 w-[160px] text-xs">
                <SelectValue placeholder="Sırala" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
            <span>{data.length} sonuç</span>
            {someSelected && <span className="text-primary font-medium">• {selected.size} seçili</span>}
          </div>
        </div>

        {/* Row 2: Filters */}
        {filters.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {filters.map(f => (
              <Select key={f.key} value={activeFilters[f.key] || '__all__'} onValueChange={v => handleFilter(f.key, v)}>
                <SelectTrigger className="h-8 w-auto min-w-[120px] text-xs">
                  <SelectValue placeholder={f.label} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Tümü</SelectItem>
                  {f.options.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ))}
            {Object.keys(activeFilters).length > 0 && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setActiveFilters({}); }}>
                <X className="w-3 h-3 mr-1" />Temizle
              </Button>
            )}
          </div>
        )}

        {/* Bulk Actions Bar */}
        {someSelected && bulkActions.length > 0 && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20 flex-wrap">
            <span className="text-xs font-medium text-primary mr-1">{selected.size} öğe seçili</span>
            {bulkActions.map(ba => (
              <Button
                key={ba.key}
                variant={ba.variant === 'destructive' ? 'destructive' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                disabled={bulkLoading}
                onClick={() => {
                  if (ba.requiresConfirm) {
                    setConfirmDialog({ action: ba.key, message: ba.confirmMessage || `${selected.size} öğeye "${ba.label}" uygulanacak. Devam edilsin mi?` });
                  } else {
                    executeBulkAction(ba.key);
                  }
                }}
              >
                {ba.icon}
                {ba.label}
              </Button>
            ))}
            <Button variant="ghost" size="sm" className="h-7 text-xs ml-auto" onClick={() => setSelected(new Set())}>
              Seçimi Kaldır
            </Button>
          </div>
        )}
      </div>

      {/* ===== TABLE (Desktop) ===== */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : paged.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="sticky top-[120px] z-10 bg-muted/80 backdrop-blur-sm border-b border-border">
                  <th className="w-10 p-3 text-left">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                  </th>
                  {getItemImage && (
                    <th className="w-14 p-3 text-left">
                      <ImageIcon className="w-4 h-4 text-muted-foreground" />
                    </th>
                  )}
                  {columns.filter(c => !c.hideOnMobile).map(col => (
                    <th key={col.key} className="p-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider" style={col.width ? { width: col.width } : undefined}>
                      {col.label}
                    </th>
                  ))}
                  <th className="w-[140px] p-3 text-right font-medium text-muted-foreground text-xs uppercase tracking-wider">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(item => {
                  const isSelected = selected.has(item.id);
                  const image = getItemImage?.(item);
                  return (
                    <tr
                      key={item.id}
                      className={cn(
                        'border-b border-border/50 transition-colors hover:bg-muted/30',
                        isSelected && 'bg-primary/5'
                      )}
                    >
                      <td className="p-3">
                        <Checkbox checked={isSelected} onCheckedChange={() => toggleItem(item.id)} />
                      </td>
                      {getItemImage && (
                        <td className="p-3">
                          <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-muted border border-border flex-shrink-0 group">
                            {image ? (
                              <img src={image} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="w-4 h-4 text-muted-foreground/40" />
                              </div>
                            )}
                            {onQuickUpload && (
                              <button
                                onClick={(e) => { e.stopPropagation(); onQuickUpload(item); }}
                                className="absolute inset-0 bg-foreground/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Upload className="w-3.5 h-3.5 text-background" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                      {columns.filter(c => !c.hideOnMobile).map(col => (
                        <td key={col.key} className="p-3">{col.render(item)}</td>
                      ))}
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-1">
                          {onEdit && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(item)} title="Düzenle">
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {onPreview && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onPreview(item)} title="Önizle">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {onCopyLink && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onCopyLink(item)} title="Link Kopyala">
                              <Copy className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {onDelete && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(item)} title="Sil">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2 pt-3">
            {paged.map(item => {
              const isSelected = selected.has(item.id);
              if (mobileCard) return mobileCard(item, isSelected, () => toggleItem(item.id));

              const image = getItemImage?.(item);
              const title = getItemTitle?.(item) || item.id;
              const subtitle = getItemSubtitle?.(item);
              const visible = getIsVisible?.(item);

              return (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border border-border bg-card transition-colors',
                    isSelected && 'border-primary/40 bg-primary/5'
                  )}
                >
                  <Checkbox checked={isSelected} onCheckedChange={() => toggleItem(item.id)} />
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted border border-border flex-shrink-0">
                    {image ? (
                      <img src={image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{title}</p>
                    {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
                  </div>
                  {onToggleVisible && visible !== undefined && (
                    <Switch checked={visible} onCheckedChange={v => onToggleVisible(item, v)} />
                  )}
                  <div className="flex items-center gap-0.5">
                    {onEdit && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(item)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(item)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 pb-2">
              <p className="text-xs text-muted-foreground">
                Sayfa {page + 1} / {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-8" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const pg = totalPages <= 5 ? i : Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
                  return (
                    <Button
                      key={pg}
                      variant={pg === page ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 w-8 p-0 text-xs"
                      onClick={() => setPage(pg)}
                    >
                      {pg + 1}
                    </Button>
                  );
                })}
                <Button variant="outline" size="sm" className="h-8" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Confirm Dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Onay Gerekli
            </DialogTitle>
            <DialogDescription>{confirmDialog?.message}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>İptal</Button>
            <Button
              variant="destructive"
              disabled={bulkLoading}
              onClick={() => confirmDialog && executeBulkAction(confirmDialog.action)}
            >
              {bulkLoading && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Onayla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
