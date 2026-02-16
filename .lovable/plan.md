

# Native Mobile App Experience Upgrade

## Overview
Transform the mobile experience from a "website with a sidebar" to a true native-feeling warehouse app. The desktop experience stays exactly as-is. All changes are UI/UX only -- no warehouse logic, tables, or stock movement rules are touched.

## Changes

### 1. Bottom Tab Bar for Mobile Navigation
**New file: `src/components/layout/MobileBottomNav.tsx`**

A persistent bottom tab bar visible on all pages (mobile only, hidden on lg+). Five tabs:
- Home (LayoutDashboard) -> `/`
- Products (Package) -> `/products`
- **Scan** (center floating FAB button, larger, accent-colored) -> opens the existing ScanSessionLauncher
- Movements (ArrowLeftRight) -> `/movements`
- Profile (UserCog) -> `/profile`

The active tab is determined from the current URL path. The Scan button is elevated with a circular accent background, like native warehouse apps.

**File: `src/pages/Index.tsx`**
- Remove the mobile hamburger menu toggle and the old mobile sidebar overlay entirely
- Remove the `onMobileMenuToggle` prop from Header on mobile
- Hide the Header's hamburger button on mobile (it's replaced by the bottom nav)
- Add bottom padding (`pb-20`) to main content on mobile so content doesn't hide behind the bottom nav
- Keep the desktop sidebar completely unchanged

**File: `src/components/layout/Header.tsx`**
- On mobile, simplify the header: remove the hamburger menu button since bottom nav replaces it
- Keep all other header actions (search, scan, notifications, etc.)

### 2. Swipe Gestures on Product Cards (Mobile)
**New file: `src/hooks/useSwipeGesture.tsx`**

A lightweight custom hook that tracks touch start/move/end to detect horizontal swipes and long press:
- Swipe right (dx > 80px) -> trigger Stock In (giris)
- Swipe left (dx < -80px) -> trigger Stock Out (cikis)
- Long press (500ms) -> open Quick Count modal
- Returns: `onTouchStart`, `onTouchMove`, `onTouchEnd` handlers + `swipeOffset` for visual feedback

**File: `src/components/products/ProductList.tsx`**
- On mobile cards only: attach swipe handlers
- Show colored reveal behind the card during swipe:
  - Green background with "+" icon when swiping right (Stock In)
  - Red background with "-" icon when swiping left (Stock Out)
- The card translates with the finger, snaps back on release
- On threshold reach, trigger `onStockAction(product, 'giris'|'cikis')`
- Long press triggers a callback for quick count (opens StockActionModal)
- Desktop table rows are unchanged

### 3. Haptic Feedback
**New file: `src/hooks/useHaptics.tsx`**

A simple utility that calls `navigator.vibrate()` where available:
- `lightHaptic()` -> 10ms vibration (success actions, scans)
- `strongHaptic()` -> [30, 50, 30] pattern (errors)
- Falls back to no-op silently on unsupported devices

Integrate into:
- Swipe threshold reached (light)
- Stock action submit success (light)
- Error states (strong)

### 4. Button-Level Loading States (No Full-Page Loaders)
**File: `src/pages/Index.tsx`**
- Replace the full-screen loading spinner with skeleton placeholders
- Show a minimal top progress bar or skeleton cards instead of blocking the whole screen
- Individual action buttons already have `isSubmitting` states (QuickStockInput has this) -- keep those

### 5. Global Native-Feel CSS
**File: `src/index.css`**
- Add `user-select: none` on the app container on mobile (prevent accidental text selection)
- Reduce heavy shadows on mobile with a media query (`@media (max-width: 768px)`)
- Ensure `overscroll-behavior: contain` is applied globally (already partially done)
- Add `.bottom-nav-safe` utility for bottom nav safe area spacing

### 6. Mobile Header Cleanup
**File: `src/pages/Index.tsx`**
- On mobile, remove the redundant sign-out button from the page title area (it will be accessible from Profile tab)
- The page title area on mobile becomes cleaner -- just the title, no email/logout clutter

---

## Technical Details

### Files to Create
1. **`src/components/layout/MobileBottomNav.tsx`** -- Bottom tab bar component
2. **`src/hooks/useSwipeGesture.tsx`** -- Touch swipe + long press detection hook
3. **`src/hooks/useHaptics.tsx`** -- Haptic feedback utility hook

### Files to Modify
1. **`src/pages/Index.tsx`**
   - Import and render `MobileBottomNav` (visible only on `lg:hidden`)
   - Remove mobile sidebar overlay code (the `fixed inset-0 z-50 lg:hidden` div)
   - Add `pb-20 lg:pb-0` to main content for bottom nav clearance
   - Replace full-screen loading state with skeleton UI
   - Remove mobile sign-out button clutter (move to profile page)

2. **`src/components/layout/Header.tsx`**
   - Hide hamburger menu button entirely (bottom nav replaces it)
   - Remove `onMobileMenuToggle` usage

3. **`src/components/products/ProductList.tsx`**
   - Import `useSwipeGesture` and `useHaptics`
   - Wrap mobile cards with swipe gesture handlers
   - Add swipe reveal UI (green/red background behind card)
   - Add long-press detection for quick count

4. **`src/index.css`**
   - Add mobile-specific shadow reduction
   - Add bottom nav safe area utility
   - Add `user-select: none` for the app on mobile

### Bottom Nav Structure
```text
+--------+--------+--------+--------+--------+
|  Home  |Products|  SCAN  |Movement|Profile |
| (icon) | (icon) | (FAB)  | (icon) | (icon) |
+--------+--------+--------+--------+--------+
                   ^
            Floating circle
            accent background
```

### Swipe Gesture Visual
```text
Swipe Right (Stock In):
[=GREEN BG=][  + icon  ][ ----CARD SLIDES RIGHT---- ]

Swipe Left (Stock Out):
[ ----CARD SLIDES LEFT---- ][ - icon  ][==RED BG===]
```

### No Changes To
- Any database tables, RLS policies, or backend logic
- Stock movement creation rules or validation
- Desktop sidebar or desktop layout
- Any Supabase queries or edge functions
- ProductIntelligenceDrawer (already upgraded)
- StockActionModal logic

