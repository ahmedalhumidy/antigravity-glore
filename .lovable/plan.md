

## Plan: Convert Mobile Search from Bottom Sheet to Anchored Dropdown

### What Changes
The mobile search results currently appear as a bottom sheet (sliding up from the bottom). This will be changed to show results as a dropdown directly under the top search bar -- identical behavior to desktop, just touch-optimized.

### Single File Change

**`src/components/layout/SearchPalette.tsx`**

Remove the mobile-specific bottom sheet branch entirely. Both mobile and desktop will use the same anchored dropdown approach:

- Remove the `isMobile` conditional that renders the bottom sheet
- Remove all drag-to-close logic (touchStart/touchMove/touchEnd handlers, dragOffset state)
- Remove the `useIsMobile` import (no longer needed)
- Use one unified rendering path: a portal with a backdrop + a dropdown anchored to the `anchorRef`
- The dropdown position is calculated from `anchorRef.getBoundingClientRect()` for both mobile and desktop
- On mobile, the dropdown stretches full width with small margins (8px each side)

Dropdown styling:
- `max-height: 60vh` with internal scroll (`overflow-y: auto`, `overscroll-behavior: contain`)
- Rounded corners, shadow, solid `bg-popover` background
- Fade-in animation only (no slide-from-bottom)
- Touch targets remain 44px minimum height
- Backdrop is a fixed full-screen transparent layer for click-outside-to-close

### Technical Details

The position calculation runs in a `useEffect` whenever the palette is visible:
```text
const rect = anchorRef.current.getBoundingClientRect();
top = rect.bottom + 4px
left = rect.left (desktop) or 8px (mobile via clamping)
width = rect.width (desktop) or calc(100vw - 16px) (mobile)
```

Z-index layering stays unchanged:
- Backdrop: `Z.paletteBackdrop` (400)
- Dropdown: `Z.palette` (410)
- Toasts remain above at `Z.toast` (500)

Removed code:
- `dragStartY` ref, `dragOffset` state
- `handleTouchStart`, `handleTouchMove`, `handleTouchEnd` functions
- The entire mobile bottom-sheet portal block (lines 207-254)
- `useIsMobile` import
