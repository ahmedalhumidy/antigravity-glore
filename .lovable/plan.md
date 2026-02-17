

## Rebuild: Global Search System with SearchController Context

### What Changes

The current search system has local state scattered in `SmartTopBar.tsx` with broken mobile event handling. This rebuild creates a centralized `SearchController` context that manages all search state and actions, making search work reliably on all devices.

### New Files

**1. `src/contexts/SearchController.tsx`** -- React Context + Provider

State managed:
- `query` -- current search text
- `results` -- search results from database
- `loading` -- search in progress
- `isOpen` -- dropdown visibility
- `selectedProduct` -- product to show in Intelligence Drawer
- `drawerOpen` -- whether the drawer is open

Actions:
- `setQuery(text)` -- updates query, triggers debounced search
- `openDropdown()` / `closeDropdown()` -- control dropdown
- `openProduct(id)` -- fetches product from DB, opens Intelligence Drawer
- `clear()` -- resets everything

The `openProduct` function will fetch the product directly from the database (like `handleViewProduct` does now in Index.tsx), so it works from any page without needing the products array.

### Modified Files

**2. `src/App.tsx`** -- Wrap app with `SearchControllerProvider` (inside `WorkingContextProvider`)

**3. `src/components/layout/SmartTopBar.tsx`** -- Complete rewrite of search section

Remove:
- All local search state (`query`, `results`, `showDropdown`, `searching`, `commandResults`)
- `tappingResultRef` hack
- `onBlur` timer logic
- `globalSearch` import and usage

Replace with:
- `useSearchController()` hook for all search state/actions
- Result buttons use `role="option"` with `onPointerDown` (fires on both mouse and touch)
- `onPointerDown` calls `e.preventDefault()` to prevent blur, then calls `openProduct(id)`
- No blur-based dropdown closing -- instead use a click-outside overlay (already exists at line 488-493) as the only close mechanism
- Remove `onBlur` handler entirely from the input

This is the core mobile fix: `onPointerDown` with `preventDefault()` is the correct cross-browser solution. It fires before `blur` on all platforms including iOS Safari.

**4. `src/pages/Index.tsx`** -- Simplify

Remove:
- `detailDrawerProduct` state (moved to SearchController)
- `handleViewProduct` function (moved to SearchController's `openProduct`)

Keep the `ProductIntelligenceDrawer` rendering but wire it to the SearchController context instead.

Other callers of `onViewProduct` (Dashboard, AlertList, ProductList, etc.) will call `searchController.openProduct(id)` via the context.

**5. `src/components/products/ProductIntelligenceDrawer.tsx`** -- No changes needed, still receives `product` and `open` as props

### How Mobile Fix Works

```text
Current (broken):
  Touch result -> onBlur fires -> setTimeout hides dropdown -> touch never registers

New approach:
  Touch result -> onPointerDown fires FIRST (before blur)
  -> e.preventDefault() stops blur from firing
  -> openProduct(id) runs immediately
  -> dropdown closes programmatically after action
```

`onPointerDown` is the W3C standard that fires on both mouse and touch, before any focus/blur events. This eliminates the race condition entirely without any ref hacks.

### Search Flow

```text
User types in SmartTopBar
  -> SearchController.setQuery(text)
  -> 250ms debounce
  -> RPC search_products(query)
  -> results stored in context
  -> isOpen = true, dropdown renders

User taps/clicks result
  -> onPointerDown fires (before blur)
  -> e.preventDefault() (no blur)
  -> SearchController.openProduct(id)
    -> fetch product from DB
    -> set selectedProduct + drawerOpen = true
    -> clear query + close dropdown
  -> ProductIntelligenceDrawer opens

User clicks overlay or presses Escape
  -> SearchController.closeDropdown()
```

### Technical Details

The SearchController context will contain:
- A `useEffect` with debounce for the search RPC call
- `openProduct` that does the DB fetch + mapping (same logic as current `handleViewProduct` in Index.tsx)
- The `ProductIntelligenceDrawer` will be rendered once in `Index.tsx`, reading from context

Props removed from SmartTopBar:
- `products` (no longer needed for search -- DB is queried directly)
- `onViewProduct` (replaced by context)
- `onProductFound` (barcode flow stays but uses context)

Props kept on SmartTopBar:
- `onAddProduct`, `onStockAction`, `onOpenScan`, `onOpenTransfer`, `onBarcodeNotFound`, `onStockUpdated` (action callbacks unrelated to search)

