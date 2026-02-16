import { useState, lazy, Suspense } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { ProductList } from "@/components/products/ProductList";
import { ProductModal } from "@/components/products/ProductModal";
import { StockActionModal } from "@/components/products/StockActionModal";
import { MovementPage } from "@/components/movements/MovementPage";
import { LocationView } from "@/components/locations/LocationView";
import { AlertList } from "@/components/alerts/AlertList";
import { Product, ViewMode } from "@/types/stock";
import { useProducts } from "@/hooks/useProducts";
import { useMovements } from "@/hooks/useMovements";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentView } from "@/hooks/useCurrentView";
import { cn } from "@/lib/utils";
import { X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Lazy load heavy pages
const UserManagement = lazy(() =>
  import("@/components/users/UserManagement").then((m) => ({ default: m.UserManagement })),
);
const AuditLogList = lazy(() => import("@/components/users/AuditLogList").then((m) => ({ default: m.AuditLogList })));
const ReportsPage = lazy(() => import("@/components/reports/ReportsPage").then((m) => ({ default: m.ReportsPage })));
const ProfileSettings = lazy(() =>
  import("@/components/profile/ProfileSettings").then((m) => ({ default: m.ProfileSettings })),
);
const SystemSettingsPage = lazy(() =>
  import("@/components/settings/SystemSettingsPage").then((m) => ({ default: m.SystemSettingsPage })),
);
const ArchiveManagement = lazy(() =>
  import("@/components/archive/ArchiveManagement").then((m) => ({ default: m.ArchiveManagement })),
);
const ControlCenterPage = lazy(() =>
  import("@/modules/control-center/ControlCenterPage").then((m) => ({ default: m.ControlCenterPage })),
);
const AdminMagazaPage = lazy(() => import("@/modules/magaza/pages/AdminMagazaPage"));
const AdminGaleriPage = lazy(() => import("@/modules/magaza/pages/AdminGaleriPage"));
const AdminQuotesPage = lazy(() => import("@/modules/magaza/pages/AdminQuotesPage"));
const AdminPromotionsPage = lazy(() => import("@/modules/magaza/pages/AdminPromotionsPage"));

// Loading component for lazy loaded pages
function LazyPageLoader() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

const Index = () => {
  const { signOut, user } = useAuth();
  const {
    products,
    loading: productsLoading,
    addProduct,
    updateProduct,
    deleteProduct,
    refreshProducts,
  } = useProducts();
  const { movements, loading: movementsLoading, addMovement, refreshMovements } = useMovements(products);

  const { currentView, setCurrentView } = useCurrentView();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Modals
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockActionModalOpen, setStockActionModalOpen] = useState(false);
  const [stockActionType, setStockActionType] = useState<"giris" | "cikis">("giris");
  const [pendingBarcode, setPendingBarcode] = useState<string | undefined>();

  const lowStockCount = products.filter((p) => p.mevcutStok < p.minStok).length;

  const handleAddProduct = () => {
    setSelectedProduct(null);
    setProductModalOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setProductModalOpen(true);
  };

  const handleSaveProduct = async (productData: Omit<Product, "id"> | Product) => {
    if ("id" in productData) {
      await updateProduct(productData);
    } else {
      await addProduct(productData);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    await deleteProduct(id);
  };

  const handleStockAction = (product: Product, type: "giris" | "cikis") => {
    setSelectedProduct(product);
    setStockActionType(type);
    setStockActionModalOpen(true);
  };

  const handleStockActionConfirm = async (quantity: number, setQuantity: number, note: string, shelfId?: string) => {
    if (!selectedProduct) return;

    await addMovement({
      productId: selectedProduct.id,
      type: stockActionType,
      quantity,
      setQuantity,
      date: new Date().toISOString().split("T")[0],
      time: new Date().toTimeString().slice(0, 5),
      note: note || undefined,
      shelfId,
    });

    // Refresh products to get updated stock
    refreshProducts();
  };

  const handleAddMovement = async (data: {
    productId: string;
    type: "giris" | "cikis";
    quantity: number;
    setQuantity?: number;
    date: string;
    time: string;
    note?: string;
    shelfId?: string;
  }) => {
    await addMovement(data);
    refreshProducts();
  };

  const handleViewProduct = (id: string) => {
    const product = products.find((p) => p.id === id);
    if (product) {
      setSelectedProduct(product);
      setProductModalOpen(true);
    }
  };

  const handleScanProductFound = (product: Product) => {
    setSelectedProduct(product);
    setProductModalOpen(true);
  };

  const handleScanBarcodeNotFound = (barcode: string) => {
    setSelectedProduct(null);
    setPendingBarcode(barcode);
    setProductModalOpen(true);
  };

  const handleAddNewProductFromMovement = (barcode: string) => {
    setSelectedProduct(null);
    setPendingBarcode(barcode);
    setProductModalOpen(true);
    toast.info("Yeni ürün ekleyin", {
      description: `Barkod: ${barcode} - Lütfen ürün bilgilerini doldurun`,
    });
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success("Çıkış yapıldı");
  };

  const viewTitles: Record<ViewMode, string> = {
    dashboard: "Kontrol Paneli",
    products: "Ürün Yönetimi",
    movements: "Stok Hareketleri",
    locations: "Konum Yönetimi",
    alerts: "Stok Uyarıları",
    users: "Kullanıcı Yönetimi",
    logs: "Denetim Günlüğü",
    reports: "Raporlar ve Analiz",
    profile: "Profil Ayarları",
    settings: "Sistem Ayarları",
    archive: "Arşiv Yönetimi",
    'control-center': "Kontrol Merkezi",
    'admin-magaza': "Mağaza Yönetimi",
    'admin-magaza-urunler': "Mağaza Ürünleri",
    'admin-magaza-teklifler': "Teklif Talepleri",
    'admin-magaza-kampanyalar': "Kampanyalar",
    'admin-galeri': "Galeri Yönetimi",
  };

  const isLoading = productsLoading || movementsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Veriler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Sidebar */}
      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden transition-opacity duration-300",
          mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
      >
        <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
        <div
          className={cn(
            "relative h-full w-64 transition-transform duration-300",
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <Sidebar
            currentView={currentView}
            onViewChange={(view) => {
              setCurrentView(view);
              setMobileMenuOpen(false);
            }}
            alertCount={lowStockCount}
          />
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-lg bg-sidebar-accent text-sidebar-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar currentView={currentView} onViewChange={setCurrentView} alertCount={lowStockCount} />
      </div>

      {/* Main Content */}
      <div className="lg:ml-64 pb-[env(safe-area-inset-bottom)] px-2 sm:px-4">
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onAddProduct={handleAddProduct}
          alertCount={lowStockCount}
          onMobileMenuToggle={() => setMobileMenuOpen(true)}
          products={products}
          onProductFound={handleScanProductFound}
          onBarcodeNotFound={handleScanBarcodeNotFound}
          onStockUpdated={refreshProducts}
        />

        <main className="p-3 md:p-6 pb-safe">
          {/* Page Title with Sign Out - Hidden on dashboard to avoid duplication */}
          {currentView !== "dashboard" && (
            <div className="mb-4 md:mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-lg md:text-2xl font-bold text-foreground">{viewTitles[currentView]}</h1>
                <p className="text-xs md:text-sm text-muted-foreground mt-0.5">{user?.email}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut} className="h-8 md:h-9 text-xs md:text-sm">
                <LogOut className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5" />
                <span className="hidden sm:inline">Çıkış</span>
              </Button>
            </div>
          )}

          {/* Dashboard has its own header, just show sign out */}
          {currentView === "dashboard" && (
            <div className="flex justify-end mb-3 md:mb-4">
              <Button variant="outline" size="sm" onClick={handleSignOut} className="h-8 md:h-9 text-xs md:text-sm">
                <LogOut className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5" />
                <span className="hidden sm:inline">Çıkış</span>
              </Button>
            </div>
          )}

          {/* Content */}
          {currentView === "dashboard" && (
            <Dashboard products={products} movements={movements} onViewProduct={handleViewProduct} />
          )}

          {currentView === "products" && (
            <ProductList
              products={products}
              searchQuery={searchQuery}
              onEditProduct={handleEditProduct}
              onDeleteProduct={handleDeleteProduct}
              onViewProduct={handleViewProduct}
              onStockAction={handleStockAction}
            />
          )}

          {currentView === "movements" && (
            <MovementPage
              products={products}
              movements={movements}
              searchQuery={searchQuery}
              onAddMovement={handleAddMovement}
              onAddNewProduct={handleAddNewProductFromMovement}
              onStockUpdated={refreshProducts}
            />
          )}

          {currentView === "locations" && (
            <LocationView products={products} searchQuery={searchQuery} onViewProduct={handleViewProduct} />
          )}

          {currentView === "alerts" && (
            <AlertList
              products={products}
              searchQuery={searchQuery}
              onStockAction={handleStockAction}
              onViewProduct={handleViewProduct}
            />
          )}

          {currentView === "users" && (
            <Suspense fallback={<LazyPageLoader />}>
              <UserManagement />
            </Suspense>
          )}

          {currentView === "logs" && (
            <Suspense fallback={<LazyPageLoader />}>
              <AuditLogList />
            </Suspense>
          )}

          {currentView === "reports" && (
            <Suspense fallback={<LazyPageLoader />}>
              <ReportsPage products={products} movements={movements} />
            </Suspense>
          )}

          {currentView === "profile" && (
            <Suspense fallback={<LazyPageLoader />}>
              <ProfileSettings />
            </Suspense>
          )}

          {currentView === "settings" && (
            <Suspense fallback={<LazyPageLoader />}>
              <SystemSettingsPage />
            </Suspense>
          )}

          {currentView === "archive" && (
            <Suspense fallback={<LazyPageLoader />}>
              <ArchiveManagement />
            </Suspense>
          )}

          {currentView === "control-center" && (
            <Suspense fallback={<LazyPageLoader />}>
              <ControlCenterPage />
            </Suspense>
          )}

          {(currentView === "admin-magaza" || currentView === "admin-magaza-urunler") && (
            <Suspense fallback={<LazyPageLoader />}>
              <AdminMagazaPage />
            </Suspense>
          )}

          {currentView === "admin-magaza-teklifler" && (
            <Suspense fallback={<LazyPageLoader />}>
              <AdminQuotesPage />
            </Suspense>
          )}

          {currentView === "admin-magaza-kampanyalar" && (
            <Suspense fallback={<LazyPageLoader />}>
              <AdminPromotionsPage />
            </Suspense>
          )}

          {currentView === "admin-galeri" && (
            <Suspense fallback={<LazyPageLoader />}>
              <AdminGaleriPage />
            </Suspense>
          )}
        </main>
      </div>

      {/* Modals */}
      <ProductModal
        isOpen={productModalOpen}
        onClose={() => {
          setProductModalOpen(false);
          setSelectedProduct(null);
          setPendingBarcode(undefined);
        }}
        onSave={handleSaveProduct}
        product={selectedProduct}
        initialBarcode={pendingBarcode}
        onStockUpdated={refreshProducts}
      />

      <StockActionModal
        isOpen={stockActionModalOpen}
        onClose={() => {
          setStockActionModalOpen(false);
          setSelectedProduct(null);
        }}
        onSuccess={() => {
          refreshProducts();
        }}
        product={selectedProduct}
        actionType={stockActionType}
      />
    </div>
  );
};

export default Index;
