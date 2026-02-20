

## Fix: Name Search Not Showing All Relevant Products

### Problem
When searching by product name, some products don't appear in results. Searching by code works fine because codes are unique. The root cause is in the `search_products` database function:

- It returns max 50 results, sorted alphabetically (ORDER BY urun_adi)
- Common name terms like "kase" (bowl) match 100+ products
- Only the first 50 alphabetically are returned
- The user's specific product may fall outside this window

### Solution
Improve the `search_products` function with **relevance-based ranking** instead of simple alphabetical sort:

1. **Exact code match** first (highest priority)
2. **Prefix match** on name or code (starts with the query)
3. **Contains match** (substring) last

This ensures that even with 50 results max, the most relevant ones appear first. Also increase the limit slightly to 80.

### Database Migration

Replace the `search_products` function with a smarter version:

```sql
CREATE OR REPLACE FUNCTION public.search_products(query text)
RETURNS SETOF public.products
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT *
  FROM public.products
  WHERE is_deleted = false
    AND search_text ILIKE '%' || lower(public.immutable_unaccent(query)) || '%'
  ORDER BY
    CASE
      WHEN lower(urun_kodu) = lower(query) THEN 0
      WHEN lower(barkod) = lower(query) THEN 0
      WHEN lower(public.immutable_unaccent(urun_adi)) ILIKE lower(public.immutable_unaccent(query)) || '%' THEN 1
      WHEN lower(urun_kodu) ILIKE lower(query) || '%' THEN 1
      ELSE 2
    END,
    urun_adi
  LIMIT 80;
$$;
```

**Ranking logic:**
- Priority 0: Exact match on code or barcode
- Priority 1: Name or code starts with query
- Priority 2: Contains query (substring match)

### Files to Change

| File | Change |
|------|--------|
| Database migration | Update `search_products` function with relevance ranking and increased limit |

No frontend code changes needed -- the existing UI will automatically display the better-sorted results.

