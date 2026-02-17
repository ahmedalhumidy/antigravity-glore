import { useEffect, useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  PackagePlus,
  PackageMinus,
  ArrowLeftRight,
  Eye,
  MapPin,
  Barcode,
  AlertTriangle,
} from 'lucide-react';
import { useGlobalScanner } from './GlobalScannerProvider';
import { useCurrentView } from '@/hooks/useCurrentView';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/stock';
import { toast } from 'sonner';
import { getProductStatus, getStatusLabel, getStatusColor, getStatusDescription } from '@/lib/productStatus';

interface RecentMovement {
  id: string;
  type: string;
  quantity: number;
  date: string;
}

export function CopilotActionSheet({
  onViewProduct,
  onStockAction,
  onStockUpdated,
}: {
  onViewProduct: (id: string) => void;
  onStockAction: (product: Product, type: 'giris' | 'cikis') => void;
  onStockUpdated?: () => void;
}) {
  const { copilotProduct, copilotOpen, closeCopilot } = useGlobalScanner();
  const { currentView } = useCurrentView();
  const [recentMovements, setRecentMovements] = useState<RecentMovement[]>([]);

  useEffect(() => {
    if (copilotProduct && copilotOpen) {
      supabase
        .from('stock_movements')
        .select('id, movement_type, quantity, movement_date')
        .eq('product_id', copilotProduct.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(3)
        .then(({ data }) => {
          setRecentMovements(
            (data || []).map(m => ({
              id: m.id,
              type: m.movement_type,
              quantity: m.quantity,
              date: m.movement_date,
            }))
          );
        });
    }
  }, [copilotProduct, copilotOpen]);

  if (!copilotProduct) return null;

  const status = getProductStatus(copilotProduct);
  const hasStock = status === 'in_stock';

  // Smart CTA based on status + current route
  const getPrimaryCTA = () => {
    // If catalog_only or out_of_stock, always suggest stock entry
    if (status === 'catalog_only') {
      return { label: 'İlk Stok Girişi', icon: PackagePlus, action: () => { closeCopilot(); onStockAction(copilotProduct, 'giris'); }, color: 'bg-emerald-600 hover:bg-emerald-700 text-white' };
    }
    if (status === 'out_of_stock') {
      return { label: 'Stok Girişi', icon: PackagePlus, action: () => { closeCopilot(); onStockAction(copilotProduct, 'giris'); }, color: 'bg-emerald-600 hover:bg-emerald-700 text-white' };
    }

    // in_stock: context-aware CTA
    if (currentView === 'movements' || currentView.startsWith('uretim-')) {
      return { label: 'Stok Girişi', icon: PackagePlus, action: () => { closeCopilot(); onStockAction(copilotProduct, 'giris'); }, color: 'bg-emerald-600 hover:bg-emerald-700 text-white' };
    }
    if (currentView === 'locations') {
      return { label: 'Rafa Taşı', icon: ArrowLeftRight, action: () => { closeCopilot(); toast.info('Raf transfer sayfasına yönlendiriliyorsunuz'); }, color: 'bg-blue-600 hover:bg-blue-700 text-white' };
    }
    if (currentView === 'products' || currentView === 'dashboard') {
      return { label: 'Ürünü Görüntüle', icon: Eye, action: () => { closeCopilot(); onViewProduct(copilotProduct.id); }, color: 'bg-primary hover:bg-primary/90 text-primary-foreground' };
    }
    return { label: 'Stok Girişi', icon: PackagePlus, action: () => { closeCopilot(); onStockAction(copilotProduct, 'giris'); }, color: 'bg-emerald-600 hover:bg-emerald-700 text-white' };
  };

  const primaryCTA = getPrimaryCTA();
  const PrimaryIcon = primaryCTA.icon;

  const handleCikisClick = () => {
    if (!hasStock) {
      toast.warning('Bu ürün için stok bulunmuyor');
      return;
    }
    closeCopilot();
    onStockAction(copilotProduct, 'cikis');
  };

  return (
    <Drawer open={copilotOpen} onOpenChange={(open) => { if (!open) closeCopilot(); }}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-left">Ürün Bilgisi</DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-6 space-y-4 overflow-y-auto">
          {/* Product Identity */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-lg">{copilotProduct.urunAdi}</h3>
              <Badge
                variant="outline"
                className={`text-[10px] ${getStatusColor(status)}`}
              >
                {getStatusLabel(status)}
              </Badge>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary">{copilotProduct.urunKodu}</Badge>
              {copilotProduct.barkod && (
                <Badge variant="outline" className="gap-1">
                  <Barcode className="w-3 h-3" />
                  {copilotProduct.barkod}
                </Badge>
              )}
            </div>
          </div>

          {/* Status Banner for catalog_only */}
          {status === 'catalog_only' && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                {getStatusDescription(status)} — İlk stok girişi yaparak depoya ekleyin.
              </p>
            </div>
          )}

          {status === 'out_of_stock' && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
              <p className="text-sm text-destructive">
                {getStatusDescription(status)} — Yeni stok girişi yapın.
              </p>
            </div>
          )}

          {/* Stock Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{copilotProduct.mevcutStok}</p>
              <p className="text-xs text-muted-foreground">Adet</p>
            </div>
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{copilotProduct.setStok}</p>
              <p className="text-xs text-muted-foreground">Set</p>
            </div>
            <div className="rounded-lg bg-muted p-3 text-center flex flex-col items-center justify-center">
              <MapPin className="w-4 h-4 text-muted-foreground mb-1" />
              <p className="text-sm font-medium text-foreground">{copilotProduct.rafKonum}</p>
            </div>
          </div>

          {/* Recent Movements */}
          {recentMovements.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Son Hareketler</p>
              <div className="space-y-1">
                {recentMovements.map(m => (
                  <div key={m.id} className="flex items-center justify-between text-sm p-2 rounded bg-muted/50">
                    <span className={m.type === 'giris' ? 'text-emerald-500' : 'text-red-500'}>
                      {m.type === 'giris' ? '+' : '-'}{m.quantity} adet
                    </span>
                    <span className="text-muted-foreground text-xs">{m.date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Primary CTA */}
          <Button
            className={`w-full h-12 text-base gap-2 ${primaryCTA.color}`}
            onClick={primaryCTA.action}
          >
            <PrimaryIcon className="w-5 h-5" />
            {primaryCTA.label}
          </Button>

          {/* Secondary Actions */}
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" size="sm" className="flex-col h-auto py-3 gap-1" onClick={() => { closeCopilot(); onViewProduct(copilotProduct.id); }}>
              <Eye className="w-4 h-4" />
              <span className="text-[10px]">Görüntüle</span>
            </Button>
            <Button variant="outline" size="sm" className="flex-col h-auto py-3 gap-1" onClick={() => { closeCopilot(); onStockAction(copilotProduct, 'giris'); }}>
              <PackagePlus className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px]">Giriş</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-col h-auto py-3 gap-1"
              disabled={!hasStock}
              onClick={handleCikisClick}
            >
              <PackageMinus className={`w-4 h-4 ${hasStock ? 'text-red-500' : 'text-muted-foreground'}`} />
              <span className="text-[10px]">{hasStock ? 'Çıkış' : 'Stok Yok'}</span>
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
