import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { PermissionsProvider } from "@/hooks/usePermissions";
import { FeatureFlagsProvider } from "@/hooks/useFeatureFlags";
import { SystemSettingsProvider } from "@/hooks/useSystemSettings";
import { PWAUpdateNotification } from "@/components/pwa/PWAUpdateNotification";
import { OfflineIndicator } from "@/components/pwa/OfflineIndicator";
 import { CartProvider } from "@/contexts/CartContext";

// Lazy load pages
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Install = lazy(() => import("./pages/Install"));
const NotFound = lazy(() => import("./pages/NotFound"));
const StoreFront = lazy(() => import("./pages/StoreFront"));
const StoreProducts = lazy(() => import("./pages/StoreProducts"));
const MerchantDashboard = lazy(() => import("./pages/merchant/MerchantDashboard"));
const MerchantProducts = lazy(() => import("./pages/merchant/MerchantProducts"));
const CreateStore = lazy(() => import("./pages/merchant/CreateStore"));
// Store Module (additive)
const ProductDetailPage = lazy(() => import("./modules/storefront/components/ProductDetailPage"));
const CheckoutPage = lazy(() => import("./modules/storefront/components/CheckoutPage"));
const CustomerAccountPage = lazy(() => import("./modules/storefront/components/CustomerAccountPage"));
const CustomerOrdersPage = lazy(() => import("./modules/storefront/components/CustomerOrdersPage"));
const WishlistPage = lazy(() => import("./modules/storefront/components/WishlistPage"));
const StoreAdminPage = lazy(() => import("./modules/store-admin/components/StoreAdminPage"));
const AgentPortalPage = lazy(() => import("./modules/agent-portal/components/AgentPortalPage"));
const ImportInventory = lazy(() => import("./pages/ImportInventory"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    },
  },
});

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <PageLoader />;
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <PageLoader />;
  }
  
  if (user) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

const AppRoutes = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route path="/auth" element={
        <PublicRoute>
          <Auth />
        </PublicRoute>
      } />
      <Route path="/" element={
        <ProtectedRoute>
          <Index />
        </ProtectedRoute>
      } />
      <Route path="/products" element={
        <ProtectedRoute>
          <Index />
        </ProtectedRoute>
      } />
      <Route path="/movements" element={
        <ProtectedRoute>
          <Index />
        </ProtectedRoute>
      } />
      <Route path="/locations" element={
        <ProtectedRoute>
          <Index />
        </ProtectedRoute>
      } />
      <Route path="/alerts" element={
        <ProtectedRoute>
          <Index />
        </ProtectedRoute>
      } />
      <Route path="/users" element={
        <ProtectedRoute>
          <Index />
        </ProtectedRoute>
      } />
      <Route path="/logs" element={
        <ProtectedRoute>
          <Index />
        </ProtectedRoute>
      } />
      <Route path="/reports" element={
        <ProtectedRoute>
          <Index />
        </ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute>
          <Index />
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute>
          <Index />
        </ProtectedRoute>
      } />
      <Route path="/archive" element={
        <ProtectedRoute>
          <Index />
        </ProtectedRoute>
      } />
      <Route path="/control-center" element={
        <ProtectedRoute>
          <Index />
        </ProtectedRoute>
      } />
       {/* Store Routes - Public */}
       <Route path="/store" element={<StoreFront />} />
       <Route path="/store/products" element={<StoreProducts />} />
       <Route path="/store/products/:id" element={<ProductDetailPage />} />
       {/* Store Routes - Protected */}
       <Route path="/store/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
       <Route path="/store/account" element={<ProtectedRoute><CustomerAccountPage /></ProtectedRoute>} />
       <Route path="/store/orders" element={<ProtectedRoute><CustomerOrdersPage /></ProtectedRoute>} />
       <Route path="/store/wishlist" element={<ProtectedRoute><WishlistPage /></ProtectedRoute>} />
       {/* Merchant Routes */}
       <Route path="/merchant" element={<ProtectedRoute><MerchantDashboard /></ProtectedRoute>} />
       <Route path="/merchant/products" element={<ProtectedRoute><MerchantProducts /></ProtectedRoute>} />
       <Route path="/merchant/create-store" element={<ProtectedRoute><CreateStore /></ProtectedRoute>} />
       {/* Store Admin & Agent */}
       <Route path="/admin/store-center" element={<ProtectedRoute><StoreAdminPage /></ProtectedRoute>} />
       <Route path="/agent" element={<ProtectedRoute><AgentPortalPage /></ProtectedRoute>} />
       <Route path="/import-inventory" element={<ProtectedRoute><ImportInventory /></ProtectedRoute>} />
       <Route path="/install" element={<Install />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
           <PermissionsProvider>
            <FeatureFlagsProvider>
              <SystemSettingsProvider>
                 <CartProvider>
                   <AppRoutes />
                   <PWAUpdateNotification />
                   <OfflineIndicator />
                 </CartProvider>
              </SystemSettingsProvider>
            </FeatureFlagsProvider>
           </PermissionsProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
