
-- Step 1: Mark duplicates as deleted (keep best row per urun_kodu)
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

-- Step 2: Create a unique partial index to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_unique_kodu ON products(urun_kodu) WHERE is_deleted = false;
