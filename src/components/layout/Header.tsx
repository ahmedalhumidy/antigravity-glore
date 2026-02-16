import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Product } from '@/types/stock';
import { CommandPalette } from './CommandPalette';
import { GlobalScanModal } from './GlobalScanModal';
import { HeaderSearch } from './HeaderSearch';
import { QuickCreateMenu } from './QuickCreateMenu';
import { ModuleSwitcher } from './ModuleSwitcher';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { SyncStatusChip } from './SyncStatusChip';
import { ThemeToggle } from './ThemeToggle';
import { TransferShelfModal } from '@/components/movements/TransferShelfModal';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAddProduct: () => void;
  alertCount: number;
  onMobileMenuToggle: () => void;
  products: Product[];
  onProductFound: (product: Product) => void;
  onBarcodeNotFound: (barcode: string) => void;
  onStockUpdated?: () => void;
}

export function Header({
  searchQuery,
  onSearchChange,
  onAddProduct,
  alertCount,
  onMobileMenuToggle,
  products,
  onProductFound,
  onBarcodeNotFound,
  onStockUpdated,
}: HeaderProps) {
  const navigate = useNavigate();
  const [showTransfer, setShowTransfer] = useState(false);

  const handleNavigate = (view: string) => {
    // view comes as path from command palette
    navigate(view);
  };

  return (
    <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-lg border-b border-border safe-area-top">
      <div className="flex items-center justify-between px-3 md:px-6 h-14 md:h-16">
        {/* Mobile Menu Button - hidden on mobile since bottom nav replaces it */}
        <button
          onClick={onMobileMenuToggle}
          className="hidden lg:hidden p-2 -ml-1 rounded-lg hover:bg-muted transition-colors flex-shrink-0"
        >
          <Menu className="w-5 h-5 text-foreground" />
        </button>

        {/* Search */}
        <HeaderSearch
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          products={products}
          onProductFound={onProductFound}
        />

        {/* Actions */}
        <div className="flex items-center gap-1 md:gap-1.5 flex-shrink-0">
          {/* Sync Status Chip */}
          <SyncStatusChip />

          {/* Command Palette */}
          <CommandPalette
            onNavigate={handleNavigate}
            onAddProduct={onAddProduct}
            products={products}
            onProductFound={onProductFound}
          />

          {/* Global Scan Modal */}
          <GlobalScanModal
            products={products}
            onProductFound={onProductFound}
            onBarcodeNotFound={onBarcodeNotFound}
            onNavigateToShelf={() => navigate('/locations')}
          />

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Module Switcher */}
          <ModuleSwitcher />

          {/* Notification Center */}
          <NotificationCenter />

          {/* Quick Create Menu */}
          <QuickCreateMenu onAddProduct={onAddProduct} onOpenTransfer={() => setShowTransfer(true)} />
        </div>
      </div>

      {/* Transfer Modal */}
      <TransferShelfModal
        isOpen={showTransfer}
        onClose={() => setShowTransfer(false)}
        products={products}
        onTransferred={onStockUpdated}
      />
    </header>
  );
}
