

# Replace "Daha Fazla" Tab with Slide-Up Menu Drawer

## Overview
Change the last bottom nav tab from navigating to a separate `/more` page to opening a native-style slide-up drawer (Sheet) containing all the menu items. This matches the reference screenshot where tapping "Menu" (hamburger icon) opens a full-height drawer overlay with grouped navigation rows.

## Changes

### 1. Update Bottom Nav Tab
**File: `src/components/layout/MobileBottomNav.tsx`**
- Replace the last tab's icon from `Grid2X2` to `Menu` (hamburger icon from lucide)
- Change label from "Daha Fazla" to "Menü"
- Instead of navigating to `/more`, use a special `__menu__` path marker (like the scan button) that calls an `onMenuPress` callback
- Add `onMenuPress` to the component props

### 2. Convert MobileMoreHub into a Slide-Up Drawer
**File: `src/components/layout/MobileMoreHub.tsx`**
- Wrap the existing hub content inside a Sheet (slide-up from bottom)
- Add props: `open: boolean`, `onClose: () => void`
- Add a drawer header with app name/logo and a close (X) button, similar to the reference screenshot
- Keep all existing sections (User Card, Quick Links, Admin, Sign Out) exactly as they are
- When any row is tapped, also close the drawer after navigating
- Make the drawer full-height with scroll

### 3. Wire It Up in Index.tsx
**File: `src/pages/Index.tsx`**
- Add a `menuOpen` state (`useState(false)`)
- Pass `onMenuPress={() => setMenuOpen(true)}` to `MobileBottomNav`
- Render `MobileMoreHub` as a drawer with `open={menuOpen}` and `onClose={() => setMenuOpen(false)}`
- Remove the `currentView === "more"` page rendering block (no longer a standalone page)
- Pass `alertCount` to the drawer as before

### 4. Clean Up (Optional)
- The `/more` route in `App.tsx` and `useCurrentView.tsx` can remain for backward compatibility (it won't break anything), or be removed if preferred

## Technical Details

### Files to Modify
1. **`src/components/layout/MobileBottomNav.tsx`** -- Change last tab to Menu button with callback
2. **`src/components/layout/MobileMoreHub.tsx`** -- Wrap in Sheet drawer, add open/close props, close on navigate
3. **`src/pages/Index.tsx`** -- Add menuOpen state, wire drawer, remove "more" page view

### Drawer Behavior
- Opens from bottom as a Sheet (using existing `src/components/ui/sheet.tsx`)
- Full height with scroll, native feel
- Closes on: tapping X, swiping down, tapping any menu row (after navigation)
- Bottom nav "Menu" tab highlights when drawer is open

