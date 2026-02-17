
# Warehouse Copilot -- Global Barcode Scanner System

## Overview
Build a new "Warehouse Copilot" module that replaces the existing simple `GlobalScanModal` in the header with an intelligent, context-aware scanning system. The existing bottom nav "Tara" button remains untouched.

## Architecture

New module: `src/modules/globalScanner/`

```text
src/modules/globalScanner/
  types.ts                    -- Types for batch queue, copilot state
  GlobalScannerProvider.tsx   -- Context provider (scanner state, batch queue)
  GlobalScannerButton.tsx     -- Header button (tap = open scanner, long-press = quick actions)
  GlobalScannerModal.tsx      -- Full-screen scanner modal (camera + manual input + batch toggle)
  CopilotActionSheet.tsx      -- Bottom sheet after product found (smart recommendations)
  BatchQueuePanel.tsx         -- Batch mode list with +/- controls and bulk apply
  QuickCreateProductSheet.tsx -- Product not found: quick create form
  index.ts                    -- Module exports
```

## Detailed Component Design

### 1. GlobalScannerButton (replaces old GlobalScanModal in Header)
- Renders a header button with `ScanLine` icon + "Tara" label (small text below icon on desktop)
- **Tap**: Opens `GlobalScannerModal`
- **Long-press** (500ms): Opens a dropdown with quick actions: Stok Girisi, Stok Cikisi, Raf Tasi, Toplu Tarama (Batch Mode)
- Uses `useHaptics()` for vibration feedback on long-press

### 2. GlobalScannerModal (full-screen on mobile, large dialog on desktop)
- Three input modes via tabs: **Kamera** (camera), **Manuel** (manual text input), **Toplu** (batch mode toggle)
- Camera: reuses existing `BarcodeScanner` component with `continuous={true}` for batch mode
- Flash toggle + camera switch (already in BarcodeScanner)
- Manual input: text field with Enter to search
- Debounce: 1.5s cooldown between same barcode scans
- Haptic feedback (`useHaptics().strongHaptic()`) on successful scan
- When a barcode is scanned:
  - Calls `findByBarcode()` from `globalSearch.ts`
  - If product found: closes scanner, opens `CopilotActionSheet`
  - If not found: opens `QuickCreateProductSheet`
  - If shelf found: navigate to `/locations` and toast
- In batch mode: adds to queue instead of opening action sheet

### 3. CopilotActionSheet (bottom drawer/sheet)
- Shows after a product is identified
- **Product Identity**: name, code, barcode badge
- **Stock Summary**: current stock (adet + set), shelf location
- **Last 3 Movements**: fetched from `stock_movements` table (type, qty, date)
- **Smart Primary CTA** based on current route (uses `useLocation()`):
  - `/movements` or production pages -> "Stok Girisi" (green button)
  - `/products` -> "Urunu Goruntule"
  - `/locations` -> "Rafa Tasi"
  - `/` (dashboard) -> "Urunu Goruntule"
  - Default -> "Stok Girisi"
- **Secondary Actions** grid: View Product, Stock In, Stock Out, Move Shelf, Edit Product, Open Movements
- Actions use existing `stockService.createMovement()` and `stockService.transferShelf()` -- no duplication
- Uses vaul `Drawer` component for mobile-native feel

### 4. BatchQueuePanel
- Shown inside `GlobalScannerModal` when batch mode is active
- Each scan adds an item to the queue with: product name, code, quantity (default 1), +/- controls
- Duplicate barcodes increment quantity instead of adding new row
- Unknown barcodes shown with warning badge
- Top: select batch action type (Stok Girisi / Stok Cikisi / Raf Tasi)
- Shelf selector when action is Stok Girisi/Cikisi or Raf Tasi
- "Uygula" (Apply) button validates each item then executes via `stockService.createMovement()` in sequence
- Negative stock warning confirmation before applying Cikis
- Progress indicator during batch apply

### 5. QuickCreateProductSheet
- Opens when barcode not recognized
- Barcode prefilled (read-only)
- Product code: auto-generated suggestion (prefix + timestamp) or manual
- Product name: required input
- Shelf selector (reuses `ShelfSelector` component)
- Category input (optional)
- Save creates product via `useProducts().addProduct()` with `mevcutStok: 0`
- After save, automatically opens `CopilotActionSheet` for the new product

### 6. GlobalScannerProvider (React Context)
- Wraps the app (added in `Index.tsx` or `App.tsx`)
- State: scanner open/closed, batch mode on/off, batch queue, selected product for copilot
- Methods: openScanner, closeSanner, addToQueue, removeFromQueue, clearQueue, openCopilot
- Manages scan logging to `scan_logs` table

## Integration Points

### Header.tsx Changes
- Remove `GlobalScanModal` import
- Add `GlobalScannerButton` in its place
- GlobalScannerButton is self-contained (manages its own modal via context)

### Existing Services Reused (NO duplication)
- `stockService.createMovement()` -- for stock in/out
- `stockService.transferShelf()` -- for shelf moves
- `findByBarcode()` from `globalSearch.ts` -- barcode lookup
- `BarcodeScanner` component -- camera scanning
- `ShelfSelector` component -- shelf picking
- `useHaptics()` -- vibration feedback
- `useShelves()` -- shelf data
- `addToOfflineQueue()` -- offline support (already in stockService)

### Scan Logging
- Every scan logged to existing `scan_logs` table with: barcode, result type, user, timestamp, current page path

## Safety Features
- Debounce: 1.5s cooldown on same barcode (prevents rapid duplicate scans)
- Negative stock confirmation dialog before applying Cikis that would go below 0
- Shelf required for movements (enforced in UI)
- Offline: stockService already queues to offline sync queue when offline
- All actions logged via existing audit/scan_logs infrastructure

## Files to Create
1. `src/modules/globalScanner/types.ts`
2. `src/modules/globalScanner/GlobalScannerProvider.tsx`
3. `src/modules/globalScanner/GlobalScannerButton.tsx`
4. `src/modules/globalScanner/GlobalScannerModal.tsx`
5. `src/modules/globalScanner/CopilotActionSheet.tsx`
6. `src/modules/globalScanner/BatchQueuePanel.tsx`
7. `src/modules/globalScanner/QuickCreateProductSheet.tsx`
8. `src/modules/globalScanner/index.ts`

## Files to Modify
1. `src/components/layout/Header.tsx` -- swap GlobalScanModal for GlobalScannerButton
2. `src/pages/Index.tsx` -- wrap with GlobalScannerProvider

## No Database Changes Required
All existing tables (products, stock_movements, shelves, scan_logs, product_activity_log) already support the needed operations.
