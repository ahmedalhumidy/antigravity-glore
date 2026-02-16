import { useState, useEffect, useMemo } from 'react';
import { Product } from '@/types/stock';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProductOverviewTab } from './ProductOverviewTab';
import { ProductMovementsTab } from './ProductMovementsTab';
import { ProductAnalyticsTab } from './ProductAnalyticsTab';
import { ProductActivityTimeline } from './ProductActivityTimeline';
import { ProductEditTab } from './ProductEditTab';
import { printBarcodeLabels } from './BarcodeLabel';
import { TransferShelfModal } from '@/components/movements/TransferShelfModal';
import { ArrowUpRight, ArrowDownRight, Printer, X, BarChart3, Clock, Eye, Activity, RefreshCw, Pencil, ChevronLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';

interface ProductIntelligenceDrawerProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  onSave?: (product: Product) => Promise<boolean | void>;
  onDelete?: (id: string) => Promise<boolean | void>;
  onStockAction?: (product: Product, type: 'giris' | 'cikis') => void;
  products?: Product[];
  onTransferred?: () => void;
}

export function ProductIntelligenceDrawer({ product, open, onClose, onSave, onDelete, onStockAction, products, onTransferred }: ProductIntelligenceDrawerProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [sparklineData, setSparklineData] = useState<{ date: string; giris: number; cikis: number }[]>([]);
  const [avgDailyConsumption, setAvgDailyConsumption] = useState(0);
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  useEffect(() => {
    if (!product || !open) return;

    const fetchSparkline = async () => {
      const since = subDays(new Date(), 7).toISOString().split('T')[0];
      const { data } = await supabase
        .from('stock_movements')
        .select('movement_type, quantity, movement_date')
        .eq('product_id', product.id)
        .eq('is_deleted', false)
        .gte('movement_date', since);

      const days: Record<string, { giris: number; cikis: number }> = {};
      for (let i = 6; i >= 0; i--) {
        days[format(subDays(new Date(), i), 'yyyy-MM-dd')] = { giris: 0, cikis: 0 };
      }
      (data || []).forEach((m) => {
        if (days[m.movement_date]) {
          if (m.movement_type === 'giris') days[m.movement_date].giris += m.quantity;
          else days[m.movement_date].cikis += m.quantity;
        }
      });
      setSparklineData(Object.entries(days).map(([date, v]) => ({ date, ...v })));

      const since30 = subDays(new Date(), 30).toISOString().split('T')[0];
      const { data: data30 } = await supabase
        .from('stock_movements')
        .select('quantity')
        .eq('product_id', product.id)
        .eq('is_deleted', false)
        .eq('movement_type', 'cikis')
        .gte('movement_date', since30);

      const totalOut = (data30 || []).reduce((s, m) => s + m.quantity, 0);
      setAvgDailyConsumption(totalOut / 30);
    };

    fetchSparkline();
  }, [product?.id, open]);

  if (!product) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent
          className="w-full sm:max-w-2xl overflow-hidden p-0 flex flex-col gap-0 border-none sm:border-l"
          side="right"
          hideCloseButton
        >
          {/* Native-style Header */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b safe-area-top">
            {/* Title Row */}
            <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 flex-shrink-0 active:scale-95 transition-transform rounded-full"
                onClick={onClose}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm sm:text-base font-bold truncate">{product.urunAdi}</h2>
                <p className="text-[11px] text-muted-foreground font-mono truncate">{product.urunKodu}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 flex-shrink-0 active:scale-95 transition-transform rounded-full sm:hidden"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Scrollable Quick Actions */}
            <div className="overflow-x-auto scrollbar-hide px-3 pb-2.5 sm:px-4">
              <div className="flex gap-2 w-max">
                {onStockAction && (
                  <>
                    <Button
                      size="sm"
                      className="h-9 min-w-[44px] text-xs bg-success hover:bg-success/90 text-success-foreground active:scale-95 transition-transform rounded-full"
                      onClick={() => onStockAction(product, 'giris')}
                    >
                      <ArrowUpRight className="w-4 h-4 mr-1" /> Giriş
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-9 min-w-[44px] text-xs active:scale-95 transition-transform rounded-full"
                      onClick={() => onStockAction(product, 'cikis')}
                    >
                      <ArrowDownRight className="w-4 h-4 mr-1" /> Çıkış
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 min-w-[44px] text-xs active:scale-95 transition-transform rounded-full"
                  onClick={() => setTransferModalOpen(true)}
                >
                  <RefreshCw className="w-4 h-4 mr-1" /> Transfer
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 min-w-[44px] text-xs active:scale-95 transition-transform rounded-full"
                  onClick={() => printBarcodeLabels([product])}
                >
                  <Printer className="w-4 h-4 mr-1" /> Etiket
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 min-w-[44px] text-xs active:scale-95 transition-transform rounded-full"
                  onClick={() => setActiveTab('edit')}
                >
                  <Pencil className="w-4 h-4 mr-1" /> Düzenle
                </Button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <div className="border-b bg-background">
              <div className="overflow-x-auto scrollbar-hide">
                <TabsList className="inline-flex w-max min-w-full justify-start rounded-none bg-transparent h-auto p-0 px-3 sm:px-4">
                  <TabsTrigger value="overview" className="text-xs min-h-[44px] data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-3 py-2.5 bg-transparent">
                    <Eye className="w-4 h-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">Genel Bakış</span>
                  </TabsTrigger>
                  <TabsTrigger value="movements" className="text-xs min-h-[44px] data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-3 py-2.5 bg-transparent">
                    <Clock className="w-4 h-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">Hareketler</span>
                  </TabsTrigger>
                  <TabsTrigger value="analytics" className="text-xs min-h-[44px] data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-3 py-2.5 bg-transparent">
                    <BarChart3 className="w-4 h-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">Analiz</span>
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="text-xs min-h-[44px] data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-3 py-2.5 bg-transparent">
                    <Activity className="w-4 h-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">Aktivite</span>
                  </TabsTrigger>
                  <TabsTrigger value="edit" className="text-xs min-h-[44px] data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-3 py-2.5 bg-transparent">
                    <Pencil className="w-4 h-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">Düzenle</span>
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 pb-safe">
              <TabsContent value="overview" className="m-0 mt-0">
                <ProductOverviewTab product={product} sparklineData={sparklineData} avgDailyConsumption={avgDailyConsumption} />
              </TabsContent>

              <TabsContent value="movements" className="m-0 mt-0">
                <ProductMovementsTab productId={product.id} totalIn={product.toplamGiris} totalOut={product.toplamCikis} />
              </TabsContent>

              <TabsContent value="analytics" className="m-0 mt-0">
                <ProductAnalyticsTab product={product} />
              </TabsContent>

              <TabsContent value="activity" className="m-0 mt-0">
                <ProductActivityTimeline productId={product.id} productName={product.urunAdi} />
              </TabsContent>

              <TabsContent value="edit" className="m-0 mt-0">
                {onSave && onDelete && (
                  <ProductEditTab
                    product={product}
                    onSave={onSave}
                    onDelete={onDelete}
                    onSaved={() => {
                      setActiveTab('overview');
                      onTransferred?.();
                    }}
                    onDeleted={() => {
                      onClose();
                      onTransferred?.();
                    }}
                  />
                )}
              </TabsContent>
            </div>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Transfer Modal */}
      <TransferShelfModal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        products={products || (product ? [product] : [])}
        preSelectedProductId={product?.id}
        onTransferred={() => {
          setTransferModalOpen(false);
          onTransferred?.();
        }}
      />
    </>
  );
}
