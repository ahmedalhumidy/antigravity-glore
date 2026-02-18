import { useState } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, BarChart3, FileText, Activity, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReportFilters, ReportFilterValues } from './ReportFilters';
import { StockMovementReport } from './StockMovementReport';
import { ProductActivityReport } from './ProductActivityReport';
import { UserActivityReport } from './UserActivityReport';
import { Product, StockMovement } from '@/types/stock';

interface ReportsPageProps {
  products: Product[];
  movements: StockMovement[];
}

type ReportTab = 'movements' | 'products' | 'users';

export function ReportsPage({ products, movements }: ReportsPageProps) {
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const canViewReports = hasPermission('reports.view');
  
  const [activeTab, setActiveTab] = useState<ReportTab>('movements');
  const [filters, setFilters] = useState<ReportFilterValues>({
    dateFrom: null,
    dateTo: null,
    productId: null,
    userId: null,
    movementType: null,
  });

  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!canViewReports) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Bu sayfa için yetkiniz yok</p>
        </CardContent>
      </Card>
    );
  }

  const tabs = [
    { id: 'movements' as ReportTab, icon: Activity, label: 'Stok Hareketleri Raporu' },
    { id: 'products' as ReportTab, icon: BarChart3, label: 'Ürün Aktivite Raporu' },
    { id: 'users' as ReportTab, icon: Users, label: 'Kullanıcı Aktivite Raporu' },
  ];

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 p-1 bg-muted/50 rounded-xl w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium text-sm',
                activeTab === tab.id 
                  ? 'bg-card text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <ReportFilters
        products={products}
        filters={filters}
        onFiltersChange={setFilters}
        showUserFilter={activeTab === 'movements' || activeTab === 'users'}
        showProductFilter={activeTab === 'movements' || activeTab === 'products'}
        showMovementTypeFilter={activeTab === 'movements'}
      />

      {/* Report Content */}
      {activeTab === 'movements' && (
        <StockMovementReport 
          products={products} 
          movements={movements} 
          filters={filters} 
        />
      )}

      {activeTab === 'products' && (
        <ProductActivityReport 
          products={products} 
          movements={movements} 
          filters={filters} 
        />
      )}

      {activeTab === 'users' && (
        <UserActivityReport 
          movements={movements} 
          filters={filters} 
        />
      )}
    </div>
  );
}
