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
import { WorkingContextProvider } from "@/hooks/useWorkingContext";
import { PWAUpdateNotification } from "@/components/pwa/PWAUpdateNotification";
import { OfflineIndicator } from "@/components/pwa/OfflineIndicator";
import { QuoteCartProvider } from "@/modules/magaza/context/QuoteCartContext";
import { ThemeProvider } from "next-themes";

// Lazy load pages
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Install = lazy(() => import("./pages/Install"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ImportInventory = lazy(() => import("./pages/ImportInventory"));
const ImportBarcodeCatalog = lazy(() => import("./pages/ImportBarcodeCatalog"));
const LandingPage = lazy(() => import("./pages/LandingPage"));

// Magaza (public storefront)
const MagazaPage = lazy(() => import("./modules/magaza/pages/MagazaPage"));
const ProductDetailPage = lazy(() => import("./modules/magaza/pages/ProductDetailPage"));
const QuoteCartPage = lazy(() => import("./modules/magaza/pages/QuoteCartPage"));
const GaleriPage = lazy(() => import("./modules/magaza/pages/GaleriPage"));
const GaleriDetailPage = lazy(() => import("./modules/magaza/pages/GaleriDetailPage"));

// Shared storefront layout
import { StorefrontLayout } from "./modules/magaza/components/StorefrontLayout";

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
       {/* Admin magaza routes */}
       <Route path="/admin/magaza" element={<ProtectedRoute><Index /></ProtectedRoute>} />
       <Route path="/admin/magaza/urunler" element={<ProtectedRoute><Index /></ProtectedRoute>} />
       <Route path="/admin/magaza/teklifler" element={<ProtectedRoute><Index /></ProtectedRoute>} />
       <Route path="/admin/magaza/kampanyalar" element={<ProtectedRoute><Index /></ProtectedRoute>} />
       <Route path="/admin/galeri" element={<ProtectedRoute><Index /></ProtectedRoute>} />
       <Route path="/uretim/baski" element={<ProtectedRoute><Index /></ProtectedRoute>} />
       <Route path="/uretim/kesim" element={<ProtectedRoute><Index /></ProtectedRoute>} />
       <Route path="/uretim/firinlar" element={<ProtectedRoute><Index /></ProtectedRoute>} />
       <Route path="/uretim/zimpara" element={<ProtectedRoute><Index /></ProtectedRoute>} />
       <Route path="/uretim/dekor" element={<ProtectedRoute><Index /></ProtectedRoute>} />
       <Route path="/uretim/tunel-firin" element={<ProtectedRoute><Index /></ProtectedRoute>} />
       <Route path="/uretim/paketleme" element={<ProtectedRoute><Index /></ProtectedRoute>} />
       <Route path="/uretim/dabo" element={<ProtectedRoute><Index /></ProtectedRoute>} />
       <Route path="/more" element={<ProtectedRoute><Index /></ProtectedRoute>} />
       {/* Public Magaza routes — shared layout */}
       <Route element={<QuoteCartProvider><StorefrontLayout /></QuoteCartProvider>}>
         <Route path="/magaza" element={<MagazaPage />} />
         <Route path="/galeri" element={<GaleriPage />} />
       </Route>
       <Route path="/magaza/urun/:slug" element={<QuoteCartProvider><ProductDetailPage /></QuoteCartProvider>} />
       <Route path="/magaza/sepet" element={<QuoteCartProvider><QuoteCartPage /></QuoteCartProvider>} />
       <Route path="/galeri/urun/:slug" element={<QuoteCartProvider><GaleriDetailPage /></QuoteCartProvider>} />
       <Route path="/import-inventory" element={<ProtectedRoute><ImportInventory /></ProtectedRoute>} />
       <Route path="/import-barcode-catalog" element={<ProtectedRoute><ImportBarcodeCatalog /></ProtectedRoute>} />
       <Route path="/install" element={<Install />} />
       <Route path="/home" element={<LandingPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>
);

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
             <PermissionsProvider>
              <FeatureFlagsProvider>
                <SystemSettingsProvider>
                  <WorkingContextProvider>
                    <AppRoutes />
                    <PWAUpdateNotification />
                    <OfflineIndicator />
                  </WorkingContextProvider>
                </SystemSettingsProvider>
              </FeatureFlagsProvider>
             </PermissionsProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
