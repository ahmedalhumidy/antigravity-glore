import {
  PackagePlus,
  PackageMinus,
  ClipboardList,
  ArrowLeftRight,
  AlertTriangle,
  Printer,
  Zap,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useState } from 'react';

interface RadialActionMenuProps {
  onStockIn: () => void;
  onStockOut: () => void;
  onCount: () => void;
  onTransfer: () => void;
  onDamage: () => void;
  onPrintLabel: () => void;
}

const actions = [
  { key: 'in', label: 'Giriş', icon: PackagePlus, color: 'text-green-500 bg-green-500/10' },
  { key: 'out', label: 'Çıkış', icon: PackageMinus, color: 'text-red-500 bg-red-500/10' },
  { key: 'count', label: 'Sayım', icon: ClipboardList, color: 'text-blue-500 bg-blue-500/10' },
  { key: 'transfer', label: 'Transfer', icon: ArrowLeftRight, color: 'text-purple-500 bg-purple-500/10' },
  { key: 'damage', label: 'Hasar', icon: AlertTriangle, color: 'text-orange-500 bg-orange-500/10' },
  { key: 'print', label: 'Etiket', icon: Printer, color: 'text-muted-foreground bg-muted' },
] as const;

export function RadialActionMenu({
  onStockIn,
  onStockOut,
  onCount,
  onTransfer,
  onDamage,
  onPrintLabel,
}: RadialActionMenuProps) {
  const [open, setOpen] = useState(false);

  const handlers: Record<string, () => void> = {
    in: onStockIn,
    out: onStockOut,
    count: onCount,
    transfer: onTransfer,
    damage: onDamage,
    print: onPrintLabel,
  };

  const handleAction = (key: string) => {
    setOpen(false);
    handlers[key]?.();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors touch-feedback" title="Hızlı İşlemler">
          <Zap className="w-5 h-5 text-accent" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-52 p-2" sideOffset={8}>
        <div className="grid grid-cols-3 gap-1.5">
          {actions.map((a) => (
            <button
              key={a.key}
              onClick={() => handleAction(a.key)}
              className={`flex flex-col items-center gap-1 p-2.5 rounded-lg transition-all hover:scale-105 active:scale-95 touch-feedback ${a.color}`}
            >
              <a.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium leading-none">{a.label}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
