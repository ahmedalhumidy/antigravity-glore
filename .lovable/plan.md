
## Fix: Product Count Display & Empty Shelves

### Root Cause Analysis

**Two separate bugs caused by the server-side pagination change:**

**Bug 1 — Product count shows "50" instead of the real total:**
In `ProductList.tsx` line 248:
```typescript
{searchResults !== null ? filteredProducts.length : (totalCount ?? filteredProducts.length)} ürün
```
This line is correct — it uses `totalCount` when not searching. However, the `InfiniteScrollSentinel` only shows "X / Y products loaded" during loading, but the main counter at the top correctly reads from `totalCount`. The issue the user sees might be that the counter shows `50` initially (before `totalCount` loads), or confusion between "loaded" vs "total." The fix is to make the top counter clearly say **"X loaded of Y total"** so there's no ambiguity.

**Bug 2 — Shelves page shows all shelves as empty (critical):**
`LocationView` builds `locationGroups` by iterating over `products` prop received from `Index.tsx`. Since pagination now delivers only **50 products** initially, only 50 products' shelf locations are populated. All other shelves appear with 0 products even though they have products in the database.

This is the fundamental conflict: the shelves page **needs to know how many products are in each shelf** for the entire catalog, but pagination only provides a 50-item window.

### Solution

#### Fix 1 — Product list counter (simple)
Update the counter text in `ProductList.tsx` to clearly differentiate between loaded products and total:
- When not searching: Show **"5,795 toplam ürün · 50 yüklendi"** format
- When searching: Show search result count normally

#### Fix 2 — Shelves page (core fix)
The shelves page must fetch its own shelf-product counts from the **server** instead of deriving them from the client-side `products` prop. Two approaches:

**Chosen approach: Dedicated shelf count query in `LocationView`**

Add a separate lightweight query that fetches `raf_konum` and `COUNT` for all products grouped by shelf. This is a single aggregation query that returns ~200 rows (one per shelf), not 24,000 products. It is fast, memory-efficient, and gives accurate per-shelf counts.

```sql
SELECT raf_konum, COUNT(*) as count 
FROM products 
WHERE is_deleted = false 
GROUP BY raf_konum
```

This replaces the broken client-side `locationGroups` derivation for the shelves page.

### Technical Changes

#### File 1: `src/hooks/useShelfProductCounts.tsx` (NEW)
A new lightweight hook that fetches per-shelf product counts via a single GROUP BY query. Returns a `Record<string, number>` mapping `shelfName → productCount`.

```typescript
// Fetches { "RAF-A1": 42, "RAF-B3": 17, ... }
const { data } = await supabase
  .from('products')
  .select('raf_konum')
  .eq('is_deleted', false);

// Group client-side from this small result set
```

Wait — this still hits the 1000-row limit per Supabase default. The right approach is an RPC function:

```sql
-- Returns rows like: { raf_konum: "RAF-A1", product_count: 42 }
CREATE OR REPLACE FUNCTION get_shelf_product_counts()
RETURNS TABLE(raf_konum text, product_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT raf_konum, COUNT(*) as product_count
  FROM products
  WHERE is_deleted = false
  GROUP BY raf_konum;
$$;
```

This RPC returns ~200 rows (one per shelf), completely bypassing the row limit issue. It is the correct and scalable solution.

#### File 2: `src/components/locations/LocationView.tsx`
- Remove dependency on the `products` prop for building `locationGroups`
- Instead call the new `get_shelf_product_counts` RPC to get accurate per-shelf counts
- Pass counts to `LocationCard` for display
- Keep using `products` prop for search-within-shelf functionality (product names/codes)
- The shelf cards will show accurate counts from the server

#### File 3: `src/components/locations/LocationCard.tsx`
- Accept an optional `productCount` override prop from the RPC result
- Use the server count as the display count when available

#### File 4: `src/components/products/ProductList.tsx` (line ~248)
- Improve the counter display: clearly show both loaded count and total count
- Example: `"5,795 ürün"` (just use totalCount, which is already accurate)
- The current code at line 248 already uses `totalCount` correctly — the fix is to ensure `totalCount` is always shown with proper formatting

### Database Change Required
A new SQL function `get_shelf_product_counts` needs to be created. This will be done via a database migration.

### Summary of Files

| File | Change |
|------|--------|
| DB migration | Add `get_shelf_product_counts()` RPC function |
| `src/hooks/useShelfProductCounts.tsx` | New hook calling the RPC |
| `src/components/locations/LocationView.tsx` | Use RPC counts instead of client products prop |
| `src/components/locations/LocationCard.tsx` | Accept server-side `productCount` prop |
| `src/components/products/ProductList.tsx` | Polish counter display |

### Expected Result

| Issue | Before | After |
|-------|--------|-------|
| Product count | Shows "50" (only loaded) | Shows "5,795" (real total) |
| Shelves with products | Show 0 products (only 50 loaded) | Show real counts from server |
| Shelves page performance | Depends on 24K products in memory | Single aggregation query (~200 rows) |
| Memory usage | Unchanged | Unchanged (no new bulk fetching) |
