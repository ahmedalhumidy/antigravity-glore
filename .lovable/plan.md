

## Plan: Virtual Product Catalog Layer + New Barcode File Import

### Overview

The system already supports catalog-only products (12,700+ products, 9,845 with zero stock). The core architecture is sound -- `findByBarcode()` queries the DB directly and the recent fix ensures products are constructed from DB data even if missing from local state.

This plan adds: (A) import of the new Excel file with ~1,100 products, (B) visual product status indicators, (C) status-aware scanner behavior, and (D) stock-out protection in the UI.

---

### Changes

**1. Copy uploaded Excel file to project**
- Copy `Barkodlu_Urun_Listesi-2.xlsx` to `public/imports/barcode-catalog-2.xlsx`
- The existing `ImportBarcodeCatalog` page reads from a hardcoded path

**2. Update `src/pages/ImportBarcodeCatalog.tsx`** -- Support file picker
- Add a file input that lets the user select any Excel file (instead of hardcoded path)
- Keep the existing hardcoded file as a fallback/default option
- The uploaded file has columns: Kullanim, Urun Kodu, Urun Adi, Barkod, Stok, Paket, Uretim, Netlog, Ana Birim, Koli Ici, Ortalama Alis, Satis Fiyati Haric, Satis Fiyati Dahil, Ozel Kod, Ozel Kod2, ...
- Map: column[1]=urun_kodu, column[2]=urun_adi, column[3]=barkod, column[13]=category (Ozel Kod)
- Also import `sale_price` from column[12] (Satis Fiyati Dahil) and `price` from column[11] (Satis Fiyati Haric)

**3. Add product status helper** -- `src/lib/productStatus.ts` (new file)
- Utility function to derive status from product data:
  - `catalog_only`: mevcutStok === 0 AND toplamGiris === 0 (never entered warehouse)
  - `out_of_stock`: mevcutStok === 0 AND toplamGiris > 0 (was in stock, now depleted)
  - `in_stock`: mevcutStok > 0

**4. Update `src/modules/globalScanner/CopilotActionSheet.tsx`** -- Status-aware UI
- Show a status badge at the top:
  - `catalog_only`: amber badge "Henuz depoya girmedi" + primary CTA = "Ilk Stok Girisi"
  - `out_of_stock`: red badge "Stok tukendi" + primary CTA = "Stok Girisi"
  - `in_stock`: green badge "Stokta" (existing behavior)
- When status is `catalog_only` or `out_of_stock`:
  - Hide the "Cikis" secondary button or disable it with tooltip
  - Show quick action buttons: "Ilk stok girisi", "Raf atama", "Atla"

**5. Update `src/components/stock/QuickStockInput.tsx`** -- Stock-out warning
- When mode is `cikis` and product.mevcutStok === 0:
  - Show warning message "Bu urun icin stok bulunmuyor"
  - Disable the submit button

**6. Update `src/components/scanner/BarcodeResultModal.tsx`** -- Status display
- When product is found but has zero stock, show the catalog status badge

**7. Update `src/components/products/ProductList.tsx`** -- Status column/badge
- Add a small status indicator badge next to the product name in the list:
  - Catalog-only products get a subtle "Katalog" tag
  - Out-of-stock products get a "Stok Yok" tag

---

### Technical Details

Product status derivation:
```text
function getProductStatus(product: Product): 'catalog_only' | 'out_of_stock' | 'in_stock' {
  if (product.mevcutStok > 0) return 'in_stock';
  if (product.toplamGiris === 0) return 'catalog_only';
  return 'out_of_stock';
}
```

CopilotActionSheet status-aware CTA logic:
```text
if status === 'catalog_only':
  primaryCTA = "Ilk Stok Girisi" (green, PackagePlus icon)
  show badge: "Henuz depoya girmedi" (amber)
  hide Cikis button

if status === 'out_of_stock':
  primaryCTA = "Stok Girisi" (green)
  show badge: "Stok tukendi" (red)
  disable Cikis button

if status === 'in_stock':
  existing behavior (context-aware CTA)
```

ImportBarcodeCatalog file picker:
```text
- Add <input type="file" accept=".xlsx,.xls" />
- On file select, read via FileReader + XLSX.read
- Fallback: existing fetch('/imports/barcode-catalog.xlsx')
- Same batch processing logic
```

No database schema changes needed -- the existing products table already supports all required fields.

