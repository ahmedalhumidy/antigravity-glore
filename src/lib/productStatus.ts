import { Product } from '@/types/stock';

export type ProductCatalogStatus = 'catalog_only' | 'out_of_stock' | 'in_stock';

export function getProductStatus(product: Product): ProductCatalogStatus {
  if (product.mevcutStok > 0) return 'in_stock';
  if (product.toplamGiris === 0) return 'catalog_only';
  return 'out_of_stock';
}

export function getStatusLabel(status: ProductCatalogStatus): string {
  switch (status) {
    case 'catalog_only': return 'Katalog';
    case 'out_of_stock': return 'Stok Yok';
    case 'in_stock': return 'Stokta';
  }
}

export function getStatusColor(status: ProductCatalogStatus): string {
  switch (status) {
    case 'catalog_only': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    case 'out_of_stock': return 'bg-destructive/10 text-destructive border-destructive/20';
    case 'in_stock': return 'bg-success/10 text-success border-success/20';
  }
}

export function getStatusDescription(status: ProductCatalogStatus): string {
  switch (status) {
    case 'catalog_only': return 'Henüz depoya girmedi';
    case 'out_of_stock': return 'Stok tükendi';
    case 'in_stock': return 'Stokta mevcut';
  }
}
