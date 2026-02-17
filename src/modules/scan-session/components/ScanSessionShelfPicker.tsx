import { useState } from 'react';
import { MapPin, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useShelves } from '@/hooks/useShelves';

interface ScanSessionShelfPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectShelf: (shelfId: string, shelfName: string) => void;
}

export function ScanSessionShelfPicker({ isOpen, onClose, onSelectShelf }: ScanSessionShelfPickerProps) {
  const { shelves, loading, addShelf } = useShelves();
  const [selected, setSelected] = useState<string>('');
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleConfirm = () => {
    const shelf = shelves.find(s => s.id === selected);
    if (shelf) {
      onSelectShelf(shelf.id, shelf.name);
    }
  };

  const handleAddShelf = async () => {
    if (!newName.trim()) return;
    setIsAdding(true);
    const newShelf = await addShelf(newName.trim());
    setIsAdding(false);
    if (newShelf) {
      setSelected(newShelf.id);
      setNewName('');
      setShowAdd(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Raf / Konum Seç
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Raf QR kodunu tarayabilir veya listeden seçebilirsiniz.
          </p>

          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger>
              <SelectValue placeholder={loading ? 'Yükleniyor...' : 'Raf seçin'} />
            </SelectTrigger>
            <SelectContent className="max-h-[200px] overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
              {shelves.map(shelf => (
                <SelectItem key={shelf.id} value={shelf.id}>
                  {shelf.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {showAdd ? (
            <div className="space-y-2 p-3 rounded-lg border bg-muted/30">
              <Label htmlFor="newShelfName">Yeni Raf Adı *</Label>
              <Input
                id="newShelfName"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Örn: A-1, B-2(1)"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => { setShowAdd(false); setNewName(''); }}
                >
                  İptal
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleAddShelf}
                  disabled={!newName.trim() || isAdding}
                >
                  {isAdding ? 'Ekleniyor...' : 'Ekle'}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/10"
              onClick={() => setShowAdd(true)}
            >
              <Plus className="w-4 h-4" />
              Yeni Raf Ekle
            </Button>
          )}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              İptal
            </Button>
            <Button className="flex-1" onClick={handleConfirm} disabled={!selected}>
              Seç
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
