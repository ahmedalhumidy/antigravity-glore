import { useLocation, useNavigate } from 'react-router-dom';
import { ViewMode } from '@/types/stock';
import { useCallback, useMemo } from 'react';

const viewRoutes: Record<ViewMode, string> = {
  dashboard: '/',
  products: '/products',
  movements: '/movements',
  locations: '/locations',
  alerts: '/alerts',
  users: '/users',
  logs: '/logs',
  reports: '/reports',
  profile: '/profile',
  settings: '/settings',
  archive: '/archive',
  'control-center': '/control-center',
  'admin-magaza': '/admin/magaza',
  'admin-magaza-urunler': '/admin/magaza/urunler',
  'admin-magaza-teklifler': '/admin/magaza/teklifler',
  'admin-magaza-kampanyalar': '/admin/magaza/kampanyalar',
  'admin-galeri': '/admin/galeri',
  more: '/more',
  'uretim-baski': '/uretim/baski',
  'uretim-kesim': '/uretim/kesim',
  'uretim-firinlar': '/uretim/firinlar',
  'uretim-zimpara': '/uretim/zimpara',
  'uretim-dekor': '/uretim/dekor',
  'uretim-tunel-firin': '/uretim/tunel-firin',
  'uretim-paketleme': '/uretim/paketleme',
  'uretim-dabo': '/uretim/dabo',
};

const routeToView: Record<string, ViewMode> = {
  '/': 'dashboard',
  '/products': 'products',
  '/movements': 'movements',
  '/locations': 'locations',
  '/alerts': 'alerts',
  '/users': 'users',
  '/logs': 'logs',
  '/reports': 'reports',
  '/profile': 'profile',
  '/settings': 'settings',
  '/archive': 'archive',
  '/control-center': 'control-center',
  '/admin/magaza': 'admin-magaza',
  '/admin/magaza/urunler': 'admin-magaza-urunler',
  '/admin/magaza/teklifler': 'admin-magaza-teklifler',
  '/admin/magaza/kampanyalar': 'admin-magaza-kampanyalar',
  '/admin/galeri': 'admin-galeri',
  '/more': 'more',
  '/uretim/baski': 'uretim-baski',
  '/uretim/kesim': 'uretim-kesim',
  '/uretim/firinlar': 'uretim-firinlar',
  '/uretim/zimpara': 'uretim-zimpara',
  '/uretim/dekor': 'uretim-dekor',
  '/uretim/tunel-firin': 'uretim-tunel-firin',
  '/uretim/paketleme': 'uretim-paketleme',
  '/uretim/dabo': 'uretim-dabo',
};

export function useCurrentView() {
  const location = useLocation();
  const navigate = useNavigate();

  const currentView = useMemo<ViewMode>(() => {
    return routeToView[location.pathname] || 'dashboard';
  }, [location.pathname]);

  const setCurrentView = useCallback((view: ViewMode) => {
    const route = viewRoutes[view];
    navigate(route, { replace: false });
  }, [navigate]);

  return { currentView, setCurrentView };
}
