

# Fix Swipe Gestures on Product Cards (Mobile)

## Problems Identified

1. **Swipe icons not clearly visible**: The Giris/Cikis icons and text are hidden behind the card during swipe. The background layer uses low-opacity colors (`bg-success/20`, `bg-destructive/20`) that blend into the dark theme, making them nearly invisible.

2. **Swipe opens a modal instead of acting directly**: When the swipe threshold is reached, `onStockAction` is called which sets state to open `StockActionModal` -- a full modal dialog. The user expects the swipe to reveal inline action buttons (like iOS-style swipe actions) that stay visible until tapped, rather than immediately launching a modal.

## Solution

### 1. Redesign Swipe Reveal Layer (ProductList.tsx - SwipeableProductCard)

Make the background action indicators much more prominent:
- Increase background opacity: `bg-success` and `bg-destructive` at higher visibility
- Make icons larger (w-8 h-8) with bold white color for contrast
- Show label text ("Giris" / "Cikis") in white bold, always visible during swipe
- Position icons to stay anchored at the edges so they "peek out" as the card slides

### 2. Change Swipe Behavior to Inline Actions (not Modal)

Instead of immediately calling `onStockAction` (which opens a modal), the swipe will:
- When swiped past threshold: **lock the card** in the swiped position, revealing action buttons
- The revealed buttons (Giris / Cikis) are tappable and THEN trigger `onStockAction`
- Tapping elsewhere or swiping back resets the card to its original position
- This gives the user a clear "peek and confirm" interaction pattern

## Technical Details

### File: `src/hooks/useSwipeGesture.tsx`
- Add a `locked` state that holds the card offset at a fixed position (e.g., 80px) after threshold is passed
- Add a `resetSwipe()` function to allow external reset
- When locked, the card stays translated and the action area is fully visible

### File: `src/components/products/ProductList.tsx` (SwipeableProductCard)
- Redesign the background reveal layer:
  - Left side (swipe right): solid green background with large white Plus icon and "Giris" text
  - Right side (swipe left): solid red background with large white Minus icon and "Cikis" text
- When card is locked in swiped position, the revealed area becomes a clickable button
- Clicking the revealed action button calls `onStockAction` and resets the swipe
- Clicking the card itself (when not swiping) still navigates to product detail

### Visual Improvements
- Background: `bg-success` / `bg-destructive` (fully opaque, not transparent)
- Icons: white, large (w-7 h-7), with text label below or beside
- Smooth spring-like animation when locking into position
- Card slightly scales down during active swipe for tactile feedback

