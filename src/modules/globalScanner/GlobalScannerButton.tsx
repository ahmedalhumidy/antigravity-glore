import { useRef, useCallback } from 'react';
import { ScanLine, PackagePlus, PackageMinus, ArrowLeftRight, Layers } from 'lucide-react';
import { useGlobalScanner } from './GlobalScannerProvider';
import { useHaptics } from '@/hooks/useHaptics';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';

export function GlobalScannerButton() {
  const { openScanner } = useGlobalScanner();
  const { lightHaptic, strongHaptic } = useHaptics();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  const handlePointerDown = useCallback(() => {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      strongHaptic();
      setDropdownOpen(true);
    }, 500);
  }, [strongHaptic]);

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (!didLongPress.current) {
      lightHaptic();
      openScanner(false);
    }
  }, [lightHaptic, openScanner]);

  const handlePointerLeave = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  return (
    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <button
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-muted transition-colors select-none touch-none"
          aria-label="Barkod Tara"
        >
          <ScanLine className="w-5 h-5 text-primary" />
          <span className="text-[10px] text-muted-foreground mt-0.5 hidden md:block">Tara</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => { openScanner(false); setDropdownOpen(false); }}>
          <PackagePlus className="w-4 h-4 mr-2 text-emerald-500" />
          Stok Girişi
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { openScanner(false); setDropdownOpen(false); }}>
          <PackageMinus className="w-4 h-4 mr-2 text-red-500" />
          Stok Çıkışı
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { openScanner(false); setDropdownOpen(false); }}>
          <ArrowLeftRight className="w-4 h-4 mr-2 text-blue-500" />
          Raf Taşı
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { openScanner(true); setDropdownOpen(false); }}>
          <Layers className="w-4 h-4 mr-2 text-amber-500" />
          Toplu Tarama
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
