

# Ultra Operational Smart Top Bar (Control Cockpit)

## Overview
Replace the current Header with a 3-zone operational cockpit that acts as a real-time command center. The existing components (SyncStatusChip, HeaderSearch, CommandPalette, GlobalScanModal, QuickCreateMenu, NotificationCenter, ModuleSwitcher, ThemeToggle) will be consolidated and elevated into a smarter, unified bar.

No warehouse logic changes. UI/UX layer only.

## Architecture

### Zone Layout
```text
+------------------+------------------------+------------------+
| LEFT             | CENTER                 | RIGHT            |
| Context Brain    | Universal Command      | Instant Actions  |
| Sync + Context   | Smart Input            | Scan + Radial +  |
|                  |                        | Alerts + Session |
+------------------+------------------------+------------------+
```

On mobile, the bar collapses: LEFT becomes a compact icon row, CENTER becomes the full-width smart input, RIGHT becomes icon buttons. A second row appears only when a product is "locked" (post-scan quick actions).

---

## Detailed Changes

### 1. New Component: `SmartTopBar`
**New file: `src/components/layout/SmartTopBar.tsx`**

Replaces `Header.tsx` as the top bar. Three zones:

**LEFT -- Context Brain**
- Live sync indicator (reuses `useOfflineSync` hook logic): green dot = synced, yellow pulse = pending, red = offline
- Current working context chip: shows the last scanned product name, active shelf, or "Ready" if idle
- Auto-updates after any scan or stock action via a new `useWorkingContext` hook
- Compact on mobile (icon + dot only), expanded on desktop

**CENTER -- Universal Command Input**
- Single input field that replaces both `HeaderSearch` and `CommandPalette`
- Auto-detects intent based on input:
  - Starts with `>` = command mode (shows command list: `> quick count`, `> transfer`, `> new product`, `> last movements`, etc.)
  - Numeric/barcode pattern = barcode lookup (uses existing `findByBarcode`)
  - Text = product/shelf search (uses existing `globalSearch`)
- Results appear in a dropdown with categorized sections (Products, Shelves, Commands)
- On mobile: tapping the input expands it full-width with a cancel button
- Keyboard shortcut: Ctrl+K focuses the input (replaces old CommandDialog)

**RIGHT -- Instant Actions**
- **Scan button**: Opens camera instantly (reuses `BarcodeScanner` component)
- **Radial action menu**: A single button that opens a radial/grid popup with 6 quick actions: Stock In, Stock Out, Count, Transfer, Damage Report, Print Label
- **Alerts badge**: Shows count of low stock + errors; clicking opens a compact actionable alerts popover (not full page)
- **Session indicator**: Shows today's action count (movements today) as a small badge; tapping opens a mini session summary

### 2. New Hook: `useWorkingContext`
**New file: `src/hooks/useWorkingContext.tsx`**

Tracks the current operational context:
- `lastProduct`: the last scanned/viewed product (name + id)
- `lastShelf`: the last active shelf
- `lastAction`: the last action type and timestamp
- `sessionCount`: count of movements created today
- Methods: `setProduct()`, `setShelf()`, `clearContext()`
- Persists in sessionStorage so it survives page navigation
- Exposed globally so scan actions, stock modals, etc. can update it

### 3. Post-Scan Quick Action Strip
**Within `SmartTopBar.tsx`**

When a product is "locked" in the working context (after scan or search selection), a secondary strip appears below the main bar:
```text
| [Product Name] [+Qty] [-Qty] [Count] [Transfer] [X close] |
```
- +Qty opens StockActionModal with type "giris" for that product
- -Qty opens StockActionModal with type "cikis"
- Count opens quick count modal
- Transfer opens TransferShelfModal
- X clears the context and hides the strip
- This strip auto-hides after 30 seconds of inactivity

### 4. Command Mode (> prefix)
**Within the smart input logic**

When user types `>`, the dropdown switches to command mode showing:
- `> quick count` -- navigates to products page with count mode
- `> transfer` -- opens TransferShelfModal
- `> new product` -- opens ProductModal
- `> last movements` -- navigates to /movements
- `> alerts` -- navigates to /alerts
- `> sync` -- triggers manual sync
- `> settings` -- navigates to /settings
- Fuzzy matched as user types

### 5. Long Press Command Palette
**Within `SmartTopBar.tsx`**

Long pressing (500ms) anywhere on the top bar opens the full CommandPalette overlay (reusing the existing `CommandDialog` component from cmdk). This is a hidden power-user feature.

### 6. Radial Quick Action Menu
**New file: `src/components/layout/RadialActionMenu.tsx`**

A popover/dropdown that shows 6 action buttons in a 2x3 grid:
- Stock In (green, PackagePlus icon)
- Stock Out (red, PackageMinus icon)
- Count (blue, ClipboardList icon)
- Transfer (purple, ArrowLeftRight icon)
- Damage (orange, AlertTriangle icon)
- Print Label (gray, Printer icon)

Each button triggers the corresponding modal or navigation. On mobile, this is the primary way to initiate actions without page switching.

### 7. Actionable Alerts Popover
**New file: `src/components/layout/AlertsPopover.tsx`**

A compact popover (not a full page) showing:
- Low stock items (top 5) with a "Restock" button that opens StockActionModal directly
- Recent errors/warnings from notifications
- Pending sync actions count
- Each item is clickable and executes a workflow (e.g., clicking a low stock item immediately opens stock-in for that product)

### 8. Integration in Index.tsx
**File: `src/pages/Index.tsx`**

- Replace `<Header ... />` with `<SmartTopBar ... />`
- Pass same props plus new ones: `onStockAction`, `onViewProduct`
- The SmartTopBar internally manages the working context and modals

### 9. Remove/Deprecate Old Components
The following components are absorbed into SmartTopBar and no longer rendered separately:
- `HeaderSearch` (absorbed into universal input)
- `CommandPalette` (absorbed into command mode + long press)
- `GlobalScanModal` (scan button integrated directly)
- `QuickCreateMenu` (absorbed into radial menu)
- `ModuleSwitcher` (absorbed into command mode navigation)
- `SyncStatusChip` (absorbed into left zone)
- `ThemeToggle` (moved to the More hub / settings)
- `NotificationCenter` (alerts popover replaces it in the bar)

The old files remain but are no longer imported in the header.

---

## Technical Details

### Files to Create
1. `src/components/layout/SmartTopBar.tsx` -- The main 3-zone cockpit component
2. `src/hooks/useWorkingContext.tsx` -- Working context state hook
3. `src/components/layout/RadialActionMenu.tsx` -- Quick action grid menu
4. `src/components/layout/AlertsPopover.tsx` -- Actionable alerts popover

### Files to Modify
1. `src/pages/Index.tsx` -- Replace Header with SmartTopBar, wire props
2. `src/components/layout/Header.tsx` -- Keep file but no longer imported (backward compat)

### Mobile Behavior
- LEFT zone: single row of compact icons (sync dot + context chip)
- CENTER: full-width smart input with glass morphism background
- RIGHT: 3 icon buttons (Scan, Radial, Alerts)
- Post-scan strip: full-width below bar, swipeable to dismiss
- All designed for one-handed thumb reach

### Desktop Behavior
- All three zones visible side by side
- Smart input has placeholder showing keyboard shortcut (Ctrl+K)
- Context brain shows full text labels
- Session count visible as text

### No Changes To
- Any database tables, RLS policies, or backend logic
- Stock movement creation rules or validation
- Bottom navigation bar (MobileBottomNav)
- Sidebar (desktop)
- Any Supabase queries or edge functions
- Product/Movement/Location page components

