
## Show All 24,785 Products — Fast & Without Crashing

### The Core Problem

There are **24,785 products** in the database. Currently:
- The app tries to fetch up to 5,000 products into device memory on startup
- The UI then slices those 5,000 into pages of 50 for display
- Products beyond 5,000 are simply never accessible

Loading 24,785 products into memory at once would crash iPhone Safari — this approach fundamentally cannot work. The solution is **server-side pagination**: fetch only the 50 rows that are visible, fetch the next 50 when the user scrolls/clicks "Load More."

---

### Solution: Server-Side Pagination

#### Architecture Change

```text
CURRENT (broken for large datasets):
  DB → fetch 5,000 rows → memory → slice 50 → display

NEW (fast + shows all):
  DB → fetch 50 rows → display
       ↓ user clicks "Load More"
  DB → fetch next 50 rows → append → display
       ↓ user types in search
  DB → search_products RPC → results → display
```

#### What Changes

**1. `useProducts` hook — initial fetch only 50 rows**
- Fetch only the first 50 products on startup (fast, no crash)
- Expose `totalCount` (from a `COUNT` query) so the UI can show "Showing 50 of 24,785"
- Expose a `loadMore()` function that fetches the next page from the server
- Keep `addProduct`, `updateProduct`, `deleteProduct` exactly as they are
- Keep `refreshProducts` working the same way

**2. `ProductList` component — wire Load More to server**
- Remove the local `visibleCount` / `slice` logic
- The "Load More" button calls `loadMore()` from the hook instead of incrementing a local counter
- The existing server-search (`useProductSearch` RPC) already works correctly — no changes needed there
- Show "Showing X of Y" using the real total count from the server

**3. No change to other pages**
- Dashboard, Movements, Alerts, Locations — all use `products` from `useProducts`. Since they work with the loaded subset, their behavior stays the same. They do not need all 24,785 products at once; they use the loaded set for their calculations (low stock count, recent movements, etc.)

---

### Technical Details

#### `useProducts` Hook Changes

```typescript
const PAGE_SIZE = 50;

// Initial load: fast, only 50 rows
const { data } = await supabase
  .from('products')
  .select('*', { count: 'exact' }) // get total count in same query
  .eq('is_deleted', false)
  .order('created_at', { ascending: false })
  .range(0, PAGE_SIZE - 1);

// Returns: products (50 items), totalCount (24785), hasMore (true), loadMore()
```

The `count: 'exact'` option returns the total row count alongside the data in a single request — no extra query needed.

#### `loadMore()` Function

```typescript
const loadMore = async () => {
  const nextPage = currentPage + 1;
  const from = nextPage * PAGE_SIZE;
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  
  setProducts(prev => [...prev, ...mappedData]);
  setCurrentPage(nextPage);
};
```

#### Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useProducts.tsx` | Fetch 50 rows initially, add `loadMore()`, `totalCount`, `hasMore` |
| `src/components/products/ProductList.tsx` | Remove local slice logic, use `loadMore()` + `totalCount` from hook props |

#### Files NOT changed
- `src/pages/Index.tsx` — passes products down as before
- `src/hooks/useProductSearch.tsx` — server search already works perfectly
- All other pages (Dashboard, Movements, etc.)

---

### Expected Result

| Metric | Before | After |
|--------|--------|-------|
| Initial load time | Slow (5,000 rows) | Fast (50 rows) |
| Products accessible | 5,000 | All 24,785 |
| Memory usage | High (~50MB) | Low (~1MB initially) |
| Safari crash risk | High | Eliminated |
| Search | Works (RPC) | Works (RPC, unchanged) |

The app will start up significantly faster. Users can scroll through all products by clicking "Load More", and search still queries all 24,785 products via the server-side RPC.
