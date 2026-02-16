import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ArrowLeftRight, Menu, ScanLine } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { path: '/', icon: LayoutDashboard, label: 'Ana Sayfa' },
  { path: '/products', icon: Package, label: 'Ürünler' },
  { path: '__scan__', icon: ScanLine, label: 'Tara' },
  { path: '/movements', icon: ArrowLeftRight, label: 'Hareketler' },
  { path: '__menu__', icon: Menu, label: 'Menü' },
];

interface MobileBottomNavProps {
  onScanPress: () => void;
  onMenuPress: () => void;
}

export function MobileBottomNav({ onScanPress, onMenuPress }: MobileBottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-card/95 backdrop-blur-xl border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-end justify-around h-16 px-1">
        {tabs.map((tab) => {
          if (tab.path === '__scan__') {
            return (
              <button
                key="scan"
                onClick={onScanPress}
                className="flex flex-col items-center justify-center -mt-5 touch-feedback"
              >
                <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center shadow-lg active:scale-95 transition-transform">
                  <ScanLine className="w-7 h-7 text-accent-foreground" />
                </div>
                <span className="text-[10px] mt-0.5 text-accent font-medium">Tara</span>
              </button>
            );
          }

          if (tab.path === '__menu__') {
            const Icon = tab.icon;
            return (
              <button
                key="menu"
                onClick={onMenuPress}
                className="flex flex-col items-center justify-center flex-1 h-full pt-2 touch-feedback active:scale-95 transition-transform text-muted-foreground"
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] mt-1 font-normal">{tab.label}</span>
              </button>
            );
          }

          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;

          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full pt-2 touch-feedback active:scale-95 transition-transform',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon className={cn('w-5 h-5', isActive && 'stroke-[2.5]')} />
              <span className={cn('text-[10px] mt-1', isActive ? 'font-semibold' : 'font-normal')}>
                {tab.label}
              </span>
              {isActive && (
                <div className="w-5 h-0.5 rounded-full bg-primary mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
