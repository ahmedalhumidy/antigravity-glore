import {
  Layers, LayoutDashboard, Package, MapPin, ArrowLeftRight,
  BarChart3, Settings, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const modules = [
  { path: '/', label: 'Depo (Dashboard)', icon: LayoutDashboard },
  { path: '/products', label: 'Ürünler', icon: Package },
  { path: '/locations', label: 'Raflar', icon: MapPin },
  { path: '/movements', label: 'Stok Hareketleri', icon: ArrowLeftRight },
  { path: '/alerts', label: 'Uyarılar', icon: AlertTriangle },
  { path: '/reports', label: 'Raporlar', icon: BarChart3 },
  { path: '/settings', label: 'Ayarlar', icon: Settings },
];

export function ModuleSwitcher() {
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Layers className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Modüller</p>
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-52">
        {modules.map(m => {
          const Icon = m.icon;
          return (
            <DropdownMenuItem key={m.path} onClick={() => navigate(m.path)} className="gap-2 cursor-pointer">
              <Icon className="w-4 h-4 text-muted-foreground" />
              <span>{m.label}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
