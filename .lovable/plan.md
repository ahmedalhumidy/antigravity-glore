

## Plan: Fix Missing Products -- Deduplicate Database and Improve Import

### Root Cause

The barcode catalog import was run multiple times, creating **6,908 duplicate rows** (12,703 total vs 5,795 unique product codes). Some product codes have up to 11 copies. This causes:

1. The product list loads 12,700+ rows when only 5,795 are real -- slow performance and confusion
2. Barcode scanning may behave inconsistently with duplicate entries
3. The import page has no protection against re-importing the same file

### Changes

**1. Database Migration -- Deduplicate Products**

Run a SQL migration that:
- For each duplicated `urun_kodu`, keeps the row with the highest `mevcut_stok` (or latest `updated_at` as tiebreaker)
- Soft-deletes all other duplicate rows (`is_deleted = true`)
- Adds a unique partial index on `urun_kodu` WHERE `is_deleted = false` to prevent future duplicates
- Expected result: ~6,908 duplicate rows marked as deleted

```text
Step 1: Mark duplicates as deleted (keep best row per urun_kodu)
Step 2: CREATE UNIQUE INDEX idx_products_unique_kodu ON products(urun_kodu) WHERE is_deleted = false
```

**2. Update `src/pages/ImportBarcodeCatalog.tsx` -- Upsert + Flexible Columns**

- Replace `INSERT` with `UPSERT` using `ON CONFLICT(urun_kodu)` to update existing products instead of creating duplicates
- Add flexible column detection: scan the header row for column names like "Barkod", "Urun Kodu", "Urun Adi" using normalized matching instead of hardcoded indices
- This ensures any Excel file format works regardless of column order

**3. Update `src/lib/globalSearch.ts` -- Handle edge cases**

- Ensure `findByBarcode` uses `.limit(1)` consistently (already present but verify)
- Add a fallback: if `.maybeSingle()` fails due to multiple rows, retry with `.limit(1).single()`

### Technical Details

Deduplication SQL logic:
```text
WITH ranked AS (
  SELECT id, urun_kodu,
    ROW_NUMBER() OVER (
      PARTITION BY urun_kodu
      ORDER BY mevcut_stok DESC, updated_at DESC
    ) AS rn
  FROM products
  WHERE is_deleted = false
)
UPDATE products SET is_deleted = true, deleted_at = now()
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
```

Flexible column detection:
```text
function findColumnIndex(headers, ...aliases):
  normalize each header (lowercase, remove accents, trim)
  for each alias: try exact match, then startsWith, then includes
  return first match index or -1
```

Import upsert approach:
```text
Instead of: supabase.from('products').insert(batch)
Use: supabase.from('products').upsert(batch, { onConflict: 'urun_kodu', ignoreDuplicates: false })
```

This requires the unique index from step 1 to work.

