import { useState, useRef, useEffect } from 'react';
import { Plus, Check, ChevronDown, ChevronUp, MapPin, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Shelf } from '@/hooks/useShelves';

interface ShelfSelectorProps {
  shelves: Shelf[];
  selectedShelfId?: string;
  selectedShelfName?: string;
  onSelect: (shelf: Shelf) => void;
  onAddNew: (name: string) => Promise<Shelf | null>;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

export function ShelfSelector({
  shelves,
  selectedShelfId,
  selectedShelfName,
  onSelect,
  onAddNew,
  label = 'Raf Konumu',
  placeholder = 'Raf seçin...',
  required = false,
  disabled = false,
}: ShelfSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newShelfName, setNewShelfName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedShelf = shelves.find(s => s.id === selectedShelfId) ||
    (selectedShelfName ? shelves.find(s => s.name === selectedShelfName) : undefined);

  const filtered = search.trim()
    ? shelves.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
    : shelves;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (listRef.current && !listRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open]);

  const handleAddNewShelf = async () => {
    if (!newShelfName.trim()) return;
    setIsAdding(true);
    const newShelf = await onAddNew(newShelfName.trim());
    setIsAdding(false);
    if (newShelf) {
      onSelect(newShelf);
      setNewShelfName('');
      setShowAddDialog(false);
      setOpen(false);
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <Label className="flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          {label} {required && '*'}
        </Label>
      )}

      {/* Inline dropdown — no portal, no touch event conflicts */}
      <div ref={listRef} className="relative">
        {/* Trigger button */}
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => {
            setOpen(prev => !prev);
            setSearch('');
          }}
          className="w-full justify-between"
        >
          {selectedShelf ? (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <span>{selectedShelf.name}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          {open
            ? <ChevronUp className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            : <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          }
        </Button>

        {/* Inline list — rendered in normal DOM flow, no portal */}
        {open && (
          <div className="mt-1 border rounded-md bg-popover shadow-md z-10 relative">
            {/* Search */}
            <div className="flex items-center gap-2 px-3 py-2 border-b">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Raf ara..."
                autoFocus
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>

            {/* Scrollable shelf list — touch-action: pan-y ensures iOS passes touches here */}
            <div
              className="max-h-48 overflow-y-auto overscroll-contain"
              style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
            >
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Raf bulunamadı</p>
              ) : (
                filtered.map(shelf => (
                  <button
                    key={shelf.id}
                    type="button"
                    onClick={() => {
                      onSelect(shelf);
                      setOpen(false);
                      setSearch('');
                    }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground transition-colors',
                      selectedShelfId === shelf.id && 'bg-accent/50'
                    )}
                  >
                    <Check
                      className={cn(
                        'h-4 w-4 shrink-0',
                        selectedShelfId === shelf.id ? 'opacity-100 text-primary' : 'opacity-0'
                      )}
                    />
                    <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                    {shelf.name}
                  </button>
                ))
              )}
            </div>

            {/* Add new shelf button */}
            <div className="border-t">
              <button
                type="button"
                onClick={() => {
                  setShowAddDialog(true);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-accent transition-colors"
              >
                <Plus className="h-4 w-4" />
                Yeni Raf Ekle
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add New Shelf Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Yeni Raf Ekle
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="shelfName">Raf Adı *</Label>
              <Input
                id="shelfName"
                value={newShelfName}
                onChange={(e) => setNewShelfName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddNewShelf()}
                placeholder="Örn: A-1, B-2(1)"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewShelfName('');
                setShowAddDialog(false);
              }}
            >
              İptal
            </Button>
            <Button
              onClick={handleAddNewShelf}
              disabled={!newShelfName.trim() || isAdding}
            >
              {isAdding ? 'Ekleniyor...' : 'Ekle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
