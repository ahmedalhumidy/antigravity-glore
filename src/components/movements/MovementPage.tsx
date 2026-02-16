import { useState, lazy, Suspense } from 'react';
import { ArrowLeftRight, Plus, History, ShieldAlert, RefreshCw } from 'lucide-react';
import { Product, StockMovement } from '@/types/stock';
import { MovementForm } from './MovementForm';
import { MovementHistory } from './MovementHistory';
import { TransferShelfModal } from './TransferShelfModal';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

const ScanSessionLauncher = lazy(() =>
  import('@/modules/scan-session/components/ScanSessionLauncher').then(m => ({ default: m.ScanSessionLauncher }))
);

interface MovementPageProps {
  products: Product[];
  movements: StockMovement[];
  searchQuery: string;
  onAddMovement: (data: {
    productId: string;
    type: 'giris' | 'cikis';
    quantity: number;
    date: string;
    time: string;
    handledBy: string;
    note?: string;
  }) => void;
  onAddNewProduct?: (barcode: string) => void;
  onStockUpdated?: () => void;
}

type Tab = 'form' | 'history';

export function MovementPage({ products, movements, searchQuery, onAddMovement, onAddNewProduct, onStockUpdated }: MovementPageProps) {
  const { hasPermission } = usePermissions();
  const { isModuleEnabled } = useFeatureFlags();
  const canCreateMovements = hasPermission('stock_movements.create');
  const scanSessionEnabled = isModuleEnabled('scan_session');
  const [activeTab, setActiveTab] = useState<Tab>(canCreateMovements ? 'form' : 'history');
  const [showTransfer, setShowTransfer] = useState(false);

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Tab Navigation + Scan Session */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-2 p-1 bg-muted/50 rounded-xl w-fit">
          {canCreateMovements && (
            <button
              onClick={() => setActiveTab('form')}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium',
                activeTab === 'form'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Plus className="w-4 h-4" />
              Yeni Hareket
            </button>
          )}
          <button
            onClick={() => setActiveTab('history')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium',
              activeTab === 'history'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <History className="w-4 h-4" />
            Hareket Geçmişi
          </button>
        </div>

        {/* Scan Session Launcher (feature-flagged) */}
        {scanSessionEnabled && canCreateMovements && (
          <Suspense fallback={null}>
            <ScanSessionLauncher
              products={products}
              onStockUpdated={onStockUpdated}
            />
          </Suspense>
        )}

        {/* Transfer Button */}
        {canCreateMovements && (
          <Button
            variant="outline"
            className="gap-2 border-primary/30 hover:bg-primary/10 hover:border-primary"
            onClick={() => setShowTransfer(true)}
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Raf Transferi</span>
          </Button>
        )}
      </div>

      {/* Content */}
      {activeTab === 'form' && canCreateMovements && (
        <div className="max-w-xl">
          <MovementForm
            products={products}
            onSubmit={onAddMovement}
            onAddNewProduct={onAddNewProduct}
          />
        </div>
      )}

      {activeTab === 'form' && !canCreateMovements && (
        <Card>
          <CardContent className="p-8 text-center">
            <ShieldAlert className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Hareket ekleme yetkiniz bulunmuyor</p>
          </CardContent>
        </Card>
      )}

      {activeTab === 'history' && (
        <MovementHistory movements={movements} searchQuery={searchQuery} />
      )}

      {/* Transfer Modal */}
      <TransferShelfModal
        isOpen={showTransfer}
        onClose={() => setShowTransfer(false)}
        products={products}
        onTransferred={onStockUpdated}
      />
    </div>
  );
}
