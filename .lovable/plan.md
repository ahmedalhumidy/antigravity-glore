

# Import Barcode Product Catalog for Production Recognition

## What This Does
When you scan a barcode in the factory (production stages or anywhere in the app), the system currently doesn't recognize these products because they aren't in the database. This plan will import the entire product catalog from your Excel file so every barcode becomes "known" to the system.

## How It Works

1. **Copy the Excel file** into the project as a data source
2. **Build an import page** (`/import-barcode-catalog`) that reads the Excel and loads products into the database
3. **Only import active products** ("Kullanımda") that have valid barcodes -- inactive ones and those without barcodes are skipped
4. **Smart matching**: If a product code already exists in the database, it updates the barcode. If it's new, it creates the product
5. **After import**: Scanning any barcode from this list will instantly recognize the product -- in production stages, global scan, or anywhere else

## What Gets Imported Per Product
- Product code (Urun Kodu)
- Product name (Urun Adi)
- Barcode
- Category from "Ozel Kod" column
- Unit type (ADET/SET)
- Prices (sale price)
- Stock starts at 0 (since goods aren't physically there yet)

## User Experience
- Navigate to the import page
- Click one button to start
- See progress bar and live log
- Summary shows: how many products created, updated, skipped

---

## Technical Details

### File: `public/imports/barcode-catalog.xlsx`
- Copy the uploaded Excel file to this location

### File: `src/pages/ImportBarcodeCatalog.tsx` (new)
- Parse the Excel using the `xlsx` library (already installed)
- Extract columns: Kullanim (col 0), Urun Kodu (col 1), Urun Adi (col 2), Barkod (col 3), Ana Birim (col 8), Satis Fiyati (col 12), Ozel Kod (col 13), Ozel Kod2 (col 14), Son Alis status (col 18)
- Filter: only rows where Kullanim = "Kullanımda" AND Barkod is not "Barkod Yok"
- Upsert into `products` table matching by `urun_kodu`:
  - New products: insert with `mevcut_stok = 0`, `raf_konum = 'Genel'`
  - Existing products: update `barkod` field if different
- Batch insert in groups of 50 for performance

### File: `src/App.tsx`
- Add route `/import-barcode-catalog` pointing to the new page

### No database schema changes needed
- Products table already has all required columns (`urun_kodu`, `urun_adi`, `barkod`, etc.)
- The `findByBarcode()` function in `globalSearch.ts` already searches by `barkod` and `urun_kodu`, so imported products will be automatically recognized everywhere

