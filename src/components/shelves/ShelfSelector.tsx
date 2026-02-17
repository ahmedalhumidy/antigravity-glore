import { useState } from 'react';
import { Plus, Check, ChevronsUpDown, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
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
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newShelfName, setNewShelfName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const selectedShelf = shelves.find(s => s.id === selectedShelfId) || 
    (selectedShelfName ? shelves.find(s => s.name === selectedShelfName) : undefined);

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
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
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
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[var(--radix-popover-trigger-width)] p-0" 
          align="start"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command shouldFilter={true}>
            <CommandInput placeholder="Raf ara..." />
            <CommandList 
              className="max-h-[200px] overflow-y-auto overscroll-contain"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <CommandEmpty>
                <div className="py-2 text-center">
                  <p className="text-sm text-muted-foreground mb-2">Raf bulunamadı</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowAddDialog(true);
                      setOpen(false);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Yeni Raf Ekle
                  </Button>
                </div>
              </CommandEmpty>
              <CommandGroup>
                {shelves.map((shelf) => (
                  <CommandItem
                    key={shelf.id}
                    value={shelf.name}
                    onSelect={() => {
                      onSelect(shelf);
                      setOpen(false);
                    }}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedShelfId === shelf.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                    {shelf.name}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setShowAddDialog(true);
                    setOpen(false);
                  }}
                  className="text-primary cursor-pointer"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Yeni Raf Ekle
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

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
