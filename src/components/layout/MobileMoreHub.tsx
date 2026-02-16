import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MapPin, AlertTriangle, BarChart3, Archive, Users, FileText,
  Settings, LayoutGrid, Store, Image, UserCog, LogOut, ChevronRight, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface HubRow {
  icon: React.ElementType;
  label: string;
  path: string;
  badge?: number;
  destructive?: boolean;
}

function HubSection({ title, rows, onNavigate }: { title?: string; rows: HubRow[]; onNavigate: (path: string) => void }) {
  return (
    <div className="mb-4">
      {title && (
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-4 mb-1.5">
          {title}
        </p>
      )}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {rows.map((row, i) => {
          const Icon = row.icon;
          const isLast = i === rows.length - 1;

          return (
            <button
              key={row.path + row.label}
              onClick={() => onNavigate(row.path)}
              className={cn(
                'flex items-center w-full h-[52px] px-4 gap-3 active:bg-muted/60 transition-colors touch-feedback',
                !isLast && 'border-b border-border',
                row.destructive && 'text-destructive'
              )}
            >
              <Icon className={cn('w-5 h-5 shrink-0', row.destructive ? 'text-destructive' : 'text-muted-foreground')} />
              <span className={cn('flex-1 text-left text-sm font-medium', row.destructive && 'text-destructive')}>
                {row.label}
              </span>
              {row.badge !== undefined && row.badge > 0 && (
                <span className="bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                  {row.badge}
                </span>
              )}
              {!row.destructive && <ChevronRight className="w-4 h-4 text-muted-foreground/50" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface MobileMoreHubProps {
  open: boolean;
  onClose: () => void;
  alertCount: number;
}

export function MobileMoreHub({ open, onClose, alertCount }: MobileMoreHubProps) {
  const { user, signOut } = useAuth();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';
  const avatarUrl = user?.user_metadata?.avatar_url || '';
  const initials = displayName.slice(0, 2).toUpperCase();

  const handleNavigate = (path: string) => {
    onClose();
    navigate(path);
  };

  const handleSignOut = async () => {
    onClose();
    await signOut();
    toast.success('Çıkış yapıldı');
  };

  const quickLinks: HubRow[] = [
    { icon: MapPin, label: 'Konumlar', path: '/locations' },
    { icon: AlertTriangle, label: 'Uyarılar', path: '/alerts', badge: alertCount },
    { icon: BarChart3, label: 'Raporlar', path: '/reports' },
    { icon: Archive, label: 'Arşiv', path: '/archive' },
  ];

  const adminLinks: HubRow[] = [
    { icon: Users, label: 'Kullanıcılar', path: '/users' },
    { icon: FileText, label: 'Denetim Günlüğü', path: '/logs' },
    { icon: Settings, label: 'Sistem Ayarları', path: '/settings' },
    { icon: LayoutGrid, label: 'Kontrol Merkezi', path: '/control-center' },
    { icon: Store, label: 'Mağaza Yönetimi', path: '/admin/magaza' },
    { icon: Image, label: 'Galeri Yönetimi', path: '/admin/galeri' },
  ];

  const showAdmin = hasPermission('users.manage') || hasPermission('settings.manage');

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent
        side="bottom"
        hideCloseButton
        className="h-[85vh] p-0 rounded-t-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-border shrink-0">
          <h2 className="text-base font-bold text-foreground">Menü</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Scrollable Content */}
        <ScrollArea className="flex-1 px-4 pt-4">
          <div className="pb-8">
            {/* User Card */}
            <button
              onClick={() => handleNavigate('/profile')}
              className="w-full mb-4 bg-card rounded-xl border border-border p-4 flex items-center gap-3 active:bg-muted/60 transition-colors touch-feedback"
            >
              <Avatar className="h-12 w-12">
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
            </button>

            {/* Quick Links */}
            <HubSection title="Hızlı Erişim" rows={quickLinks} onNavigate={handleNavigate} />

            {/* Admin Section */}
            {showAdmin && <HubSection title="Yönetim" rows={adminLinks} onNavigate={handleNavigate} />}

            {/* Account */}
            <HubSection rows={[
              { icon: UserCog, label: 'Profil Ayarları', path: '/profile' },
            ]} onNavigate={handleNavigate} />

            {/* Sign Out */}
            <div className="mt-2">
              <button
                onClick={handleSignOut}
                className="w-full h-[52px] bg-card rounded-xl border border-border flex items-center justify-center gap-2 active:bg-destructive/10 transition-colors touch-feedback"
              >
                <LogOut className="w-5 h-5 text-destructive" />
                <span className="text-sm font-semibold text-destructive">Çıkış Yap</span>
              </button>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
