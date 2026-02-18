
## Fix: Dashboard Showing Wrong Counts & Shelf Cards Showing Empty

### Root Cause Analysis

Three distinct bugs remain after the previous fix:

**Bug 1 — Dashboard "Toplam Ürün" = 50:**
`Dashboard.tsx` line 26: `const totalProducts = products.length;` — uses the local 50-product array, not the real total.

**Bug 2 — Dashboard "Toplam Stok" = 0:**
`Dashboard.tsx` line 27: `const totalStock = products.reduce(...)` — sums stock from only the 50 loaded products. Needs a server-side aggregation query.

**Bug 3 — Shelf cards show "Bu rafta henüz ürün yok" even though the count says "2 ürün":**
`LocationCard.tsx` line 107: `{products.length > 0 ? ... : <empty message>}` — this checks the CLIENT-side products array (only the 50 loaded ones). Even though `serverProductCount` correctly comes from the RPC and shows "2", the card body still uses `products.length` to decide whether to show the empty state. Since those 2 products are not in the 50 loaded ones, `products.length === 0`, so it shows "Bu rafta henüz ürün yok".

---

### Solution

#### Fix 1 & 2 — Dashboard stats via server-side aggregation

Create a new lightweight hook `useDashboardStats` that fetches:
- Total product count
- Total current stock sum  
- Count of low-stock products

This is a single SQL query returning 3 numbers — extremely fast.

```sql
SELECT 
  COUNT(*) as total_products,
  SUM(mevcut_stok) as total_stock,
  COUNT(*) FILTER (WHERE mevcut_stok < min_stok) as low_stock_count
FROM products 
WHERE is_deleted = false
```

This gets wrapped as a new RPC function `get_dashboard_stats` so we bypass the row limit.

`Dashboard.tsx` will accept these as optional override props: if provided, use them for the stat cards; if not, fall back to the local products array (for backwards compatibility).

#### Fix 3 — LocationCard empty state logic

Change the condition in `LocationCard.tsx` from:
```typescript
{products.length > 0 ? <product list> : <empty message>}
```
to:
```typescript
{products.length > 0 
  ? <product list>  
  : serverProductCount && serverProductCount > 0
    ? <"loading notice — products exist but not yet loaded in this session">
    : <"truly empty" message>
}
```

When `serverProductCount > 0` but `products.length === 0`, show a neutral info state like:
- Icon: Package (dimmed)
- Text: "Bu raftaki ürünler yüklendiğinde gösterilecek" (Products in this shelf will appear when loaded)
- This is honest and correct — the products exist in the database, they just aren't in the current 50-item window

Also fix the "Toplam" footer: currently shows `totalStock` calculated from local products (0 if none loaded). Change to show `serverProductCount` count instead when no products are loaded locally.

---

### Files to Change

| File | Change |
|------|--------|
| DB migration | Add `get_dashboard_stats()` RPC |
| `src/hooks/useDashboardStats.tsx` (NEW) | Fetch totals from server |
| `src/components/dashboard/Dashboard.tsx` | Accept `serverStats` prop, use for stat cards |
| `src/pages/Index.tsx` | Use `useDashboardStats`, pass to Dashboard |
| `src/components/locations/LocationCard.tsx` | Fix empty state logic to check `serverProductCount` |

---

### What Each Fix Looks Like

**Dashboard stat cards (after fix):**
- TOPLAM ÜRÜN: 24,785 (from server)
- TOPLAM STOK: real sum (from server)  
- DÜŞÜK STOK: real count (from server)
- Toplam Giriş/Çıkış: from movements (unchanged, correct)

**Shelf card (after fix):**
- Header: "Raf 1 — 2 ürün" (from serverProductCount, already correct)
- Body: "Bu raftaki ürünler yüklendiğinde gösterilecek" (honest loading state)
- Footer: shows the server count "2 ürün" instead of "0 adet"

---

### Technical Details

**New RPC function:**
```sql
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS TABLE(
  total_products bigint,
  total_stock bigint,
  low_stock_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    COUNT(*) as total_products,
    COALESCE(SUM(mevcut_stok), 0) as total_stock,
    COUNT(*) FILTER (WHERE mevcut_stok < min_stok) as low_stock_count
  FROM products 
  WHERE is_deleted = false;
$$;
```

**New hook `useDashboardStats`:**
```typescript
export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_dashboard_stats');
      if (error) throw error;
      return data?.[0] ?? { total_products: 0, total_stock: 0, low_stock_count: 0 };
    },
    staleTime: 1000 * 60 * 2,
  });
};
```

**Dashboard.tsx change:**
```typescript
// Accept server stats as props
interface DashboardProps {
  products: Product[];
  movements: StockMovement[];
  onViewProduct: (id: string) => void;
  serverStats?: { total_products: number; total_stock: number; low_stock_count: number };
}

// Use server stats when available
const totalProducts = serverStats?.total_products ?? products.length;
const totalStock = serverStats?.total_stock ?? products.reduce((sum, p) => sum + p.mevcutStok, 0);
const lowStockCount = serverStats?.low_stock_count ?? products.filter(p => p.mevcutStok < p.minStok).length;
```
