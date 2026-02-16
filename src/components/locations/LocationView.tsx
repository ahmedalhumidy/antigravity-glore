import React, { useState } from 'react';
import { MapPin, Package, AlertTriangle, Plus, Trash2, Edit2, RefreshCw, Grid3X3, List } from 'lucide-react';
import { Product } from '@/types/stock';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useShelves } from '@/hooks/useShelves';
import { usePermissions } from '@/hooks/usePermissions';
import { LocationCard } from './LocationCard';
import { ShelfDialogs } from './ShelfDialogs';
import { ShelfGridMap } from './ShelfGridMap';

interface LocationViewProps {
  products: Product[];
  searchQuery: string;
  onViewProduct: (id: string) => void;
}

const PAGE_SIZE = 30;

export function LocationView({ products, searchQuery, onViewProduct }: LocationViewProps) {
  const { shelves, addShelf, updateShelf, deleteShelf, loading, refreshShelves } = useShelves();
  const { hasPermission } = usePermissions();
  const canManageShelves = hasPermission('products.create');
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newShelfName, setNewShelfName] = useState('');
  const [editingShelf, setEditingShelf] = useState<{ id: string; name: string } | null>(null);
  const [deletingShelfId, setDeletingShelfId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Group products by location
  const locationGroups = products.reduce((groups, product) => {
    const location = product.rafKonum;
    if (!groups[location]) {
      groups[location] = [];
    }
    groups[location].push(product);
    return groups;
  }, {} as Record<string, Product[]>);

  // Merge shelves from DB with product locations to show ALL shelves
  const allLocations = new Set<string>();
  
  // Add all shelves from DB
  shelves.forEach(s => allLocations.add(s.name));
  
  // Add all product locations (in case some aren't in shelves table)
  Object.keys(locationGroups).forEach(loc => allLocations.add(loc));

  // Filter locations based on search
  const filteredLocations = Array.from(allLocations)
    .filter(location => {
      const query = searchQuery.toLowerCase();
      const locationProducts = locationGroups[location] || [];
      return (
        location.toLowerCase().includes(query) ||
        locationProducts.some(p => 
          p.urunAdi.toLowerCase().includes(query) ||
          p.urunKodu.toLowerCase().includes(query)
        )
      );
    })
    .sort();

  // Reset visible count when search changes
  React.useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery]);

  const displayedLocations = filteredLocations.slice(0, visibleCount);
  const hasMore = visibleCount < filteredLocations.length;
  const handleAddShelf = async () => {
    if (!newShelfName.trim()) return;
    setIsSubmitting(true);
    await addShelf(newShelfName.trim());
    setNewShelfName('');
    setShowAddDialog(false);
    setIsSubmitting(false);
  };

  const handleEditShelf = async () => {
    if (!editingShelf || !editingShelf.name.trim()) return;
    setIsSubmitting(true);
    await updateShelf(editingShelf.id, editingShelf.name.trim());
    setEditingShelf(null);
    setShowEditDialog(false);
    setIsSubmitting(false);
  };

  const handleDeleteShelf = async () => {
    if (!deletingShelfId) return;
    setIsSubmitting(true);
    await deleteShelf(deletingShelfId);
    setDeletingShelfId(null);
    setShowDeleteDialog(false);
    setIsSubmitting(false);
  };

  const openEditDialog = (id: string, name: string) => {
    setEditingShelf({ id, name });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (id: string) => {
    setDeletingShelfId(id);
    setShowDeleteDialog(true);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    refreshShelves();
    // Small delay to show spinner
    setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header with Refresh + View Toggle + Add Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || loading}
            className="gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", (isRefreshing || loading) && "animate-spin")} />
            Yenile
          </Button>
          <div className="flex items-center bg-muted/50 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={cn('p-1.5 rounded-md transition-all', viewMode === 'list' ? 'bg-background shadow-sm' : 'text-muted-foreground')}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn('p-1.5 rounded-md transition-all', viewMode === 'grid' ? 'bg-background shadow-sm' : 'text-muted-foreground')}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
          </div>
        </div>
        {canManageShelves && (
          <Button onClick={() => setShowAddDialog(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Yeni Raf Ekle
          </Button>
        )}
      </div>

      {/* Counter */}
      {filteredLocations.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {displayedLocations.length} / {filteredLocations.length} konum gösteriliyor
        </p>
      )}

      {/* Grid Map View */}
      {viewMode === 'grid' && shelves.length > 0 && (
        <ShelfGridMap
          shelves={shelves}
          products={products}
          onSelectShelf={(name) => {
            // Scroll to the shelf in list view
            setViewMode('list');
          }}
        />
      )}

      {/* Location Grid (List View) */}
      {viewMode === 'list' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedLocations.map((location, index) => {
              const locationProducts = locationGroups[location] || [];
              const shelf = shelves.find(s => s.name === location);

              return (
                <LocationCard
                  key={location}
                  location={location}
                  products={locationProducts}
                  shelf={shelf}
                  index={index}
                  canManageShelves={canManageShelves}
                  onViewProduct={onViewProduct}
                  onEditShelf={openEditDialog}
                  onDeleteShelf={openDeleteDialog}
                />
              );
            })}

            {filteredLocations.length === 0 && (
              <div className="col-span-full stat-card text-center py-12">
                <MapPin className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Konum bulunamadı</h3>
                <p className="text-muted-foreground mb-4">Arama kriterlerinize uygun konum yok.</p>
                {canManageShelves && (
                  <Button onClick={() => setShowAddDialog(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Yeni Raf Ekle
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
                className="gap-2"
              >
                Daha Fazla Yükle ({filteredLocations.length - visibleCount} kalan)
              </Button>
            </div>
          )}
        </>
      )}

      {/* Dialogs */}
      <ShelfDialogs
        showAddDialog={showAddDialog}
        setShowAddDialog={setShowAddDialog}
        showEditDialog={showEditDialog}
        setShowEditDialog={setShowEditDialog}
        showDeleteDialog={showDeleteDialog}
        setShowDeleteDialog={setShowDeleteDialog}
        newShelfName={newShelfName}
        setNewShelfName={setNewShelfName}
        editingShelf={editingShelf}
        setEditingShelf={(v) => setEditingShelf(v)}
        deletingShelfId={deletingShelfId}
        setDeletingShelfId={setDeletingShelfId}
        isSubmitting={isSubmitting}
        onAddShelf={handleAddShelf}
        onEditShelf={handleEditShelf}
        onDeleteShelf={handleDeleteShelf}
      />
    </div>
  );
}
