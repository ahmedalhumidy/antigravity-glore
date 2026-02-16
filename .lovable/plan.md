
# Native App Experience Upgrade

## Overview
Transform the Product Intelligence Drawer and overall mobile experience to feel like a true native iOS/Android app. Based on the screenshot, the main issues are: the drawer has conflicting close buttons (default Sheet X + custom X), the quick actions bar is cramped on mobile, tabs get cut off, and the overall feel lacks native-app polish.

## Changes

### 1. Full-Screen Mobile Drawer (Native Feel)
**File: `src/components/products/ProductIntelligenceDrawer.tsx`**
- On mobile, make the drawer take 100% width and 100% height (full-screen takeover like native app detail views)
- Remove the default Sheet `p-6` padding override -- use `p-0` as currently done but ensure the Sheet's built-in close button is hidden (it conflicts with the custom X button)
- Add safe area padding at the bottom for iPhone home indicator
- Make the quick actions bar wrap better on small screens with a horizontal scroll container
- Make the tabs list horizontally scrollable with `overflow-x-auto scrollbar-hide` so "Duzenle" tab is always reachable
- Add a swipe-down-to-close gesture feel by using the Sheet's drag handle on mobile

### 2. Hide Default Sheet Close Button
**File: `src/components/ui/sheet.tsx`**
- The Sheet component renders its own X close button at `absolute right-4 top-4` which overlaps with the custom one in the drawer
- Hide it by default or add a prop to opt out, since the Intelligence Drawer has its own close button

### 3. Polished Quick Actions Bar
**File: `src/components/products/ProductIntelligenceDrawer.tsx`**
- Reorganize the quick actions into a horizontally scrollable pill bar on mobile
- Use icon-only buttons on very small screens with tooltips for labels
- Group Stock In/Out as primary actions (colored), rest as secondary (outline)
- Add haptic-like visual feedback (active:scale-95) for tap interactions

### 4. Native-Style Tab Navigation
**File: `src/components/products/ProductIntelligenceDrawer.tsx`**
- Make the TabsList horizontally scrollable with snap scrolling
- Remove icon labels on mobile to save space (icon-only tabs with active indicator)
- Add a smooth underline animation that slides between tabs

### 5. Touch-Optimized Content Areas
**Files: All tab components**
- Increase touch target sizes (minimum 44px for all interactive elements per Apple HIG)
- Add `active:scale-[0.98]` press feedback on all cards and buttons
- Use momentum scrolling (`-webkit-overflow-scrolling: touch`) where applicable

### 6. Global Mobile Improvements
**File: `src/index.css`**
- Add touch-action manipulation hints for smoother scrolling
- Disable text selection on interactive elements to prevent accidental selection
- Add proper overscroll behavior for nested scroll areas

### 7. Smooth Page Transitions
**File: `src/pages/Index.tsx`**
- Add subtle fade transitions when switching between views (dashboard, products, etc.)
- Ensure the drawer open/close animation is smooth (currently uses Sheet defaults which are fine)

## Technical Details

### Sheet Close Button Fix
The Sheet component at line 60 renders:
```
<SheetPrimitive.Close className="absolute right-4 top-4 ...">
```
This conflicts with the Intelligence Drawer's custom X button. Solution: Add a `hideCloseButton` prop or use a CSS class to hide it when the drawer manages its own close button.

### Mobile Full-Screen Drawer
```
SheetContent className="w-full sm:max-w-2xl h-full" 
// On mobile: inset-0 (full screen)
// On desktop: side panel as before
```

### Scrollable Tabs
```
<TabsList className="w-full overflow-x-auto scrollbar-hide flex-nowrap">
```

### Touch Feedback CSS
```css
.touch-feedback {
  -webkit-tap-highlight-color: transparent;
  transition: transform 100ms ease;
}
.touch-feedback:active {
  transform: scale(0.97);
}
```

### Files to Modify
1. `src/components/ui/sheet.tsx` -- Add `hideCloseButton` prop
2. `src/components/products/ProductIntelligenceDrawer.tsx` -- Full-screen mobile, scrollable actions/tabs, touch feedback
3. `src/components/products/ProductOverviewTab.tsx` -- Larger touch targets, press feedback on cards
4. `src/components/products/ProductStockCards.tsx` -- Larger cards on mobile, press feedback
5. `src/components/products/ProductMovementsTab.tsx` -- Better touch targets for timeline items
6. `src/components/products/ProductAnalyticsTab.tsx` -- Responsive chart heights on mobile
7. `src/components/products/ProductEditTab.tsx` -- Larger input fields, better spacing on mobile
8. `src/index.css` -- Touch utilities, native-feel CSS helpers
9. `src/pages/Index.tsx` -- View transition animations

### No Database Changes Required
All changes are purely UI/UX improvements.
