import { useState } from 'react';
import { Plus, Package, MapPin, ArrowLeftRight, ClipboardList, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { usePermissions } from '@/hooks/usePermissions';
import { useNavigate } from 'react-router-dom';

interface QuickCreateMenuProps {
  onAddProduct: () => void;
}

export function QuickCreateMenu({ onAddProduct }: QuickCreateMenuProps) {
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();

  const items = [
    {
      label: 'Yeni Ürün',
      icon: Package,
      action: () => onAddProduct(),
      perm: 'products.create' as const,
    },
    {
      label: 'Yeni Raf',
      icon: MapPin,
      action: () => navigate('/locations'),
      perm: 'products.create' as const,
    },
    {
      label: 'Yeni Hareket',
      icon: ArrowLeftRight,
      action: () => navigate('/movements'),
      perm: 'stock_movements.create' as const,
    },
    {
      label: 'Transfer',
      icon: RefreshCw,
      action: () => navigate('/movements'),
      perm: 'stock_movements.create' as const,
    },
    {
      label: 'Sayım',
      icon: ClipboardList,
      action: () => navigate('/products'),
      perm: 'products.update' as const,
    },
  ];

  const visibleItems = items.filter(item => hasPermission(item.perm));

  if (visibleItems.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          className="gap-1.5 gradient-accent border-0 hover:opacity-90 transition-opacity h-9 px-3 md:px-4"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline text-sm">Yeni</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {visibleItems.map((item, i) => {
          const Icon = item.icon;
          return (
            <DropdownMenuItem key={item.label} onClick={item.action} className="gap-2 cursor-pointer">
              <Icon className="w-4 h-4 text-muted-foreground" />
              <span>{item.label}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
