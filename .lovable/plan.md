

# Fix: Product Search -- View Product Details on Click

## Problem
Two bugs preventing search from working:

1. **Wrong action**: Clicking a search result calls `onProductFound` which opens the **edit modal** (ProductModal). The user expects to see the product's details, location, and stock info -- which is the **ProductIntelligenceDrawer**.

2. **Local cache miss**: Both `handleViewProduct` and `handleScanProductFound` rely on `products.find()` which fails for products not loaded in the paginated local array (24,000+ products).

## Solution

### 1. SmartTopBar.tsx -- Use `onViewProduct` instead of `onProductFound`

In `handleResultClick`, when a product search result is clicked:
- Instead of calling `onProductFound(product)` (which opens the edit modal)
- Call `onViewProduct(result.id)` to open the detail drawer
- Keep the DB fallback fetch but pass the result to `onViewProduct`

### 2. Index.tsx -- Fix `handleViewProduct` with DB fallback

Current code:
```text
const handleViewProduct = (id: string) => {
    const product = products.find(p => p.id === id);
    if (product) setDetailDrawerProduct(product);
    // silently fails if not found
};
```

Updated: make it async with a database fallback:
```text
const handleViewProduct = async (id: string) => {
    let product = products.find(p => p.id === id);
    if (!product) {
        // Fetch from DB for products not in local cache
        const { data } = await supabase
            .from('products').select('*')
            .eq('id', id).maybeSingle();
        if (data) product = mapDataToProduct(data);
    }
    if (product) setDetailDrawerProduct(product);
};
```

### 3. HeaderSearch.tsx -- Same fix

Change `handleSelect` to call the view action instead of `onProductFound`, and add the same DB fallback pattern.

## Files to Modify

1. **src/pages/Index.tsx** -- Make `handleViewProduct` async with DB fallback
2. **src/components/layout/SmartTopBar.tsx** -- Change `handleResultClick` to use `onViewProduct` for search results
3. **src/components/layout/HeaderSearch.tsx** -- Same pattern: use view action instead of product found

## Result
- Clicking a search result opens the ProductIntelligenceDrawer showing product name, code, barcode, stock levels, shelf location, and recent movements
- Works for all 24,000+ products regardless of local cache state
- Shelf search results still navigate to locations page

## No database changes needed

