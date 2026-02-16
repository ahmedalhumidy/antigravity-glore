

# Professional Product List & Intelligence Drawer Upgrade

## What Changes

### 1. Remove 3-Dot Menu -- Make Rows Clickable
- **Desktop Table**: Remove the "Islemler" (Actions) column entirely -- no more 3-dot dropdown or +/- buttons in the table. The entire row becomes clickable to open the Intelligence Drawer directly.
- **Mobile Cards**: Remove the bottom action bar with the 3-dot menu. Tapping anywhere on the card opens the Intelligence Drawer.
- The product list becomes clean and minimal -- just data, no clutter.

### 2. Add Shelf Transfer Button to Intelligence Drawer
- Add a "Raf Transfer" button in the Quick Actions bar at the top of the drawer (alongside Stock In/Out, Print Label, Edit).
- Clicking it opens the existing `TransferShelfModal` with the current product pre-selected.

### 3. Additional Professional Features
- **Hover Effect**: Add a subtle hover highlight + cursor pointer on desktop rows to indicate they're clickable.
- **Keyboard hint**: Show a small "Click to view details" tooltip on first hover for discoverability.
- **Status column upgrade**: The status badge becomes more prominent since it's no longer competing with action buttons.

---

## Technical Details

### Files to Modify

**`src/components/products/ProductList.tsx`**
- Remove the `DropdownMenu` import and all related code (MoreHorizontal, Eye, Edit2, Trash2 menu items)
- Remove the "Islemler" table header column
- Remove the last `<td>` containing action buttons and dropdown from desktop rows
- Make `<tr>` clickable: `onClick={() => onViewProduct(product.id)}` with `cursor-pointer` class
- Remove the mobile card bottom action bar (the `<div>` with Stock In/Out buttons and dropdown)
- Make mobile card clickable: `onClick={() => onViewProduct(product.id)}` with `cursor-pointer`
- Keep checkbox column separate (with `e.stopPropagation()` to prevent opening drawer when selecting)

**`src/components/products/ProductIntelligenceDrawer.tsx`**
- Add `onTransfer` prop (optional callback)
- Add a "Raf Transfer" button with `RefreshCw` icon in the Quick Actions bar
- Import and render `TransferShelfModal` internally, triggered by the transfer button
- Pass `preSelectedProductId={product.id}` to the transfer modal
- Need `products` prop passed through for the transfer modal (or fetch internally)

**`src/pages/Index.tsx`**
- Pass `products` and `refreshProducts` to the `ProductIntelligenceDrawer` for shelf transfer support
