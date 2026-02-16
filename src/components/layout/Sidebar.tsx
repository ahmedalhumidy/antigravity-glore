import { 
  LayoutDashboard, 
  Package, 
  ArrowLeftRight, 
  MapPin, 
  AlertTriangle,
  UserCog,
  Users,
  ScrollText,
  BarChart3,
  Settings,
  Archive,
  Settings2,
  Store,
  Image,
  FileText,
  Percent,
  Factory,
  Stamp,
  Scissors,
  Flame,
  Eraser,
  Paintbrush,
  ThermometerSun,
  PackageCheck,
  Drill
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { ViewMode } from '@/types/stock';
import { cn } from '@/lib/utils';
import { usePermissions, PermissionType } from '@/hooks/usePermissions';
import { useSystemSettings } from '@/hooks/useSystemSettings';

interface SidebarProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  alertCount: number;
}

interface MenuItem {
  id: ViewMode;
  path: string;
  icon: typeof LayoutDashboard;
  label: string;
  requiredPermission?: PermissionType;
  group?: string;
}

const menuItems: MenuItem[] = [
  { id: 'dashboard', path: '/', icon: LayoutDashboard, label: 'Kontrol Paneli' },
  { id: 'products', path: '/products', icon: Package, label: 'Ürünler' },
  { id: 'movements', path: '/movements', icon: ArrowLeftRight, label: 'Stok Hareketleri' },
  { id: 'locations', path: '/locations', icon: MapPin, label: 'Konumlar' },
  { id: 'alerts', path: '/alerts', icon: AlertTriangle, label: 'Uyarılar' },
  { id: 'archive', path: '/archive', icon: Archive, label: 'Arşiv', requiredPermission: 'products.delete' },
  { id: 'reports', path: '/reports', icon: BarChart3, label: 'Raporlar', requiredPermission: 'reports.view' },
  { id: 'users', path: '/users', icon: Users, label: 'Kullanıcılar', requiredPermission: 'users.view' },
  { id: 'logs', path: '/logs', icon: ScrollText, label: 'Denetim Günlüğü', requiredPermission: 'logs.view' },
  { id: 'settings', path: '/settings', icon: Settings, label: 'Sistem Ayarları', requiredPermission: 'settings.view' },
  { id: 'control-center', path: '/control-center', icon: Settings2, label: 'Kontrol Merkezi', requiredPermission: 'settings.view' },
  { id: 'admin-magaza', path: '/admin/magaza', icon: Store, label: 'Mağaza Yönetimi', requiredPermission: 'settings.view' },
  { id: 'admin-magaza-teklifler', path: '/admin/magaza/teklifler', icon: FileText, label: 'Teklif Talepleri', requiredPermission: 'settings.view' },
  { id: 'admin-magaza-kampanyalar', path: '/admin/magaza/kampanyalar', icon: Percent, label: 'Kampanyalar', requiredPermission: 'settings.view' },
  { id: 'admin-galeri', path: '/admin/galeri', icon: Image, label: 'Galeri Yönetimi', requiredPermission: 'settings.view' },
  { id: 'profile', path: '/profile', icon: UserCog, label: 'Profil Ayarları' },
];

const productionItems: MenuItem[] = [
  { id: 'uretim-baski', path: '/uretim/baski', icon: Stamp, label: 'Baskı', group: 'uretim' },
  { id: 'uretim-kesim', path: '/uretim/kesim', icon: Scissors, label: 'Kesim', group: 'uretim' },
  { id: 'uretim-firinlar', path: '/uretim/firinlar', icon: Flame, label: 'Fırınlar', group: 'uretim' },
  { id: 'uretim-zimpara', path: '/uretim/zimpara', icon: Eraser, label: 'Zımpara', group: 'uretim' },
  { id: 'uretim-dekor', path: '/uretim/dekor', icon: Paintbrush, label: 'Dekor', group: 'uretim' },
  { id: 'uretim-tunel-firin', path: '/uretim/tunel-firin', icon: ThermometerSun, label: 'Tünel Fırın', group: 'uretim' },
  { id: 'uretim-paketleme', path: '/uretim/paketleme', icon: PackageCheck, label: 'Paketleme', group: 'uretim' },
  { id: 'uretim-dabo', path: '/uretim/dabo', icon: Drill, label: 'Dabo', group: 'uretim' },
];

export function Sidebar({ currentView, onViewChange, alertCount }: SidebarProps) {
  const { hasPermission } = usePermissions();
  const { organization } = useSystemSettings();
  const location = useLocation();
  
  const visibleMenuItems = menuItems.filter(item => {
    if (!item.requiredPermission) return true;
    return hasPermission(item.requiredPermission);
  });

  // Determine active state from URL for reliability
  const getIsActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname === path;
  };

  const companyName = organization?.name || 'GLORE';
  const logoUrl = organization?.logo_url || '/favicon.png';

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border/50 flex flex-col shadow-xl">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-sidebar-border/50">
        <div className="relative">
          <img 
            src={logoUrl} 
            alt={`${companyName} Logo`} 
            className="w-10 h-10 rounded-xl object-cover ring-2 ring-sidebar-accent/30" 
          />
        </div>
        <div className="min-w-0">
          <h1 className="font-bold text-base text-sidebar-foreground truncate">{companyName}</h1>
          <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-wider">Stok Takip</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {visibleMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = getIsActive(item.path);
          const showBadge = item.id === 'alerts' && alertCount > 0;

          return (
            <Link
              key={item.id}
              to={item.path}
              onClick={() => onViewChange(item.id)}
              className={cn(
                'sidebar-link w-full',
                isActive && 'sidebar-link-active'
              )}
            >
              <Icon className="w-[18px] h-[18px] flex-shrink-0" />
              <span className="text-sm">{item.label}</span>
              {showBadge && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold shadow-sm">
                  {alertCount}
                </span>
              )}
            </Link>
          );
        })}

        {/* Üretim Section */}
        <div className="pt-4 pb-1">
          <div className="flex items-center gap-2 px-3 mb-1">
            <Factory className="w-4 h-4 text-sidebar-foreground/50" />
            <span className="text-[11px] font-semibold text-sidebar-foreground/50 uppercase tracking-wider">Üretim</span>
          </div>
          {productionItems.map((item) => {
            const Icon = item.icon;
            const isActive = getIsActive(item.path);
            return (
              <Link
                key={item.id}
                to={item.path}
                onClick={() => onViewChange(item.id)}
                className={cn(
                  'sidebar-link w-full',
                  isActive && 'sidebar-link-active'
                )}
              >
                <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                <span className="text-sm">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-sidebar-border/50">
        <p className="text-[10px] text-sidebar-foreground/40 text-center">
          © 2024 {companyName}
        </p>
      </div>
    </aside>
  );
}
