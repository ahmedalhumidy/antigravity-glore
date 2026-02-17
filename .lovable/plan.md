

## Plan: Fix Barcode Scanner Not Finding Imported Products

### Root Cause

The problem is a **local array mismatch**. Here's what happens:

1. `findByBarcode()` queries the database directly and correctly finds the product (even catalog-imported ones with stock=0)
2. BUT then the code does `products.find(p => p.id === result.id)` on a local array passed as a prop
3. This local `products` array is loaded once at app start by `useProducts()` -- if the catalog was imported in a different session, or the array wasn't refreshed, the product won't be found locally
4. When `products.find()` returns `undefined`, the code **silently does nothing** -- no error, no feedback, no action

This affects both scanners:
- `GlobalScannerModal` (Warehouse Copilot) - lines 107-108
- `GlobalScanModal` (header scan) - lines 48-50

### Solution

Stop relying on the local `products` array for barcode lookups. When `findByBarcode()` returns a product from the database, construct a `Product` object directly from the DB result data instead of searching the local array.

### Changes

**1. `src/lib/globalSearch.ts`** -- Return full product data from `findByBarcode`
- Change the DB query to select all needed fields: `id, urun_adi, urun_kodu, barkod, raf_konum, mevcut_stok, set_stok, min_stok, acilis_stok, toplam_giris, toplam_cikis, uyari, son_islem_tarihi, notes, category`
- Return the full row in `data` so callers can construct a Product object without needing the local array

**2. `src/modules/globalScanner/GlobalScannerModal.tsx`** -- Use DB data as fallback
- In `handleBarcodeScan`: try `products.find()` first (for performance), but if not found, construct a `Product` object from `result.data`
- This ensures catalog-imported products are always recognized

**3. `src/components/layout/GlobalScanModal.tsx`** -- Same fallback fix
- Same pattern: try local array first, fallback to constructing from `result.data`
- Remove the silent failure -- the product will always be available

### Technical Details

`findByBarcode` query change:
```text
Current:  .select('id, urun_adi, urun_kodu, barkod')
Updated:  .select('id, urun_adi, urun_kodu, barkod, raf_konum, mevcut_stok, set_stok, min_stok, acilis_stok, toplam_giris, toplam_cikis, uyari, son_islem_tarihi, notes, category')
```

Product construction fallback (both scanner files):
```text
const product = products.find(p => p.id === result.id) || {
  id: result.data.id,
  urunKodu: result.data.urun_kodu,
  urunAdi: result.data.urun_adi,
  rafKonum: result.data.raf_konum || 'Genel',
  barkod: result.data.barkod || undefined,
  acilisStok: result.data.acilis_stok || 0,
  toplamGiris: result.data.toplam_giris || 0,
  toplamCikis: result.data.toplam_cikis || 0,
  mevcutStok: result.data.mevcut_stok || 0,
  setStok: result.data.set_stok || 0,
  minStok: result.data.min_stok || 0,
  uyari: result.data.uyari || false,
  category: result.data.category || undefined,
};
```

This ensures that any product in the database -- including zero-stock catalog imports -- will always be found and actionable by the scanner.

