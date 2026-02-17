# Fix "numeric field overflow" Errors in Barcode Catalog Import

## Problem

The import completed but 419 products failed with "numeric field overflow" on the `sale_price` column. The price parsing logic incorrectly handles Turkish number formatting (e.g., `1.500,00` becomes `150000` instead of `1500.00`).

## Root Cause

Line 94 in `ImportBarcodeCatalog.tsx`:

```javascript
parseFloat(String(row[12] || '0').replace(/[.,]/g, (m) => m === ',' ? '.' : ''))
```

This removes ALL dots (thousand separators) and converts commas to dots. But for values like `1.234.567,89`, it produces `1234567.89` which may overflow, and for malformed entries it can produce astronomically large numbers.

## Fix

### File: `src/pages/ImportBarcodeCatalog.tsx`

1. **Fix price parsing** -- properly handle Turkish number format by:
  - First removing dots (thousand separators)
  - Then replacing comma with dot (decimal separator)
  - Capping the value to a safe maximum (e.g., 999999.99) to prevent overflow
2. **Add error recovery per-row** -- wrap individual row processing in try/catch so one bad row doesn't fail the entire batch

### Technical Change (line 94):

```javascript
// Before (broken):
parseFloat(String(row[12] || '0').replace(/[.,]/g, (m) => m === ',' ? '.' : ''))

// After (correct Turkish number parsing):
const rawPrice = String(row[12] || '0').replace(/\./g, '').replace(',', '.');
const parsed = parseFloat(rawPrice) || 0;
const satisFiyati = parsed > 999999 ? 0 : parsed;
```

3. **Add a "re-run" capability** -- after fixing, user can simply click the import button again. Existing products will be matched by `urun_kodu` and skipped (or barcode-updated), so only the 419 failed ones will be retried as new inserts. I dont need the price 