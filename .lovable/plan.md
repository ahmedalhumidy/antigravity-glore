

## Fix: Search Results Dropdown Not Scrollable on Mobile

### Root Cause

In `src/components/layout/SearchPalette.tsx`, the `makeHandlers` function (lines 37-42) applies `e.preventDefault()` on **all** pointer/touch events for every result button:

```typescript
const makeHandlers = useCallback((action: () => void) => ({
  onPointerDownCapture: (e) => { e.preventDefault(); ... },  // BLOCKS SCROLL
  onPointerDown: (e) => { e.preventDefault(); ... },          // BLOCKS SCROLL
  onClick: (e) => { e.preventDefault(); ... },
  onTouchEnd: (e) => { e.preventDefault(); ... },
}), []);
```

When the user touches a result item and drags to scroll, `onPointerDownCapture` fires first with `preventDefault()`, which tells the browser: "don't do your default behavior (scrolling)." The scroll gesture is killed before it begins.

These aggressive handlers were originally added to prevent the search input from losing focus (blur) when tapping results — a valid concern. But they went too far by also blocking pointer-down, which is the gesture that initiates scrolling.

### Solution

Split the event handling: allow pointer-down to pass through (enabling scroll), but still prevent blur on the final selection events (click/touchend).

**Change `makeHandlers` to:**
```typescript
const makeHandlers = useCallback((action: () => void) => ({
  onMouseDown: (e: React.MouseEvent) => { e.preventDefault(); },
  onClick: (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); action(); },
  onTouchEnd: (e: React.TouchEvent) => { e.preventDefault(); e.stopPropagation(); action(); },
}), []);
```

- `onMouseDown` with `preventDefault` keeps the desktop blur-prevention (input stays focused).
- `onClick` fires the action on desktop.
- `onTouchEnd` fires the action on mobile (after the tap completes, not during a scroll gesture).
- Removing `onPointerDownCapture` and `onPointerDown` with `preventDefault` allows the browser to handle scroll gestures naturally.

Also add `touchAction: 'pan-y'` to the scrollable container to explicitly tell the browser this area handles vertical scrolling.

### Files to Change

| File | Change |
|------|--------|
| `src/components/layout/SearchPalette.tsx` | Fix `makeHandlers` to not block scroll gestures; add `touchAction: 'pan-y'` to scroll container |

### Technical Details

**SearchPalette.tsx line 37-42 — Replace makeHandlers:**

Remove `onPointerDownCapture` and `onPointerDown` (which block scroll). Keep `onMouseDown` for desktop blur prevention, `onClick` for desktop selection, and `onTouchEnd` for mobile selection.

**SearchPalette.tsx line 60-61 — Enhance scroll container:**

Add `touchAction: 'pan-y'` to the scrollable results div to explicitly declare this element handles vertical panning:
```typescript
style={{ maxHeight: '60vh', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
```

### Why This Works

- `onTouchEnd` only fires after a **tap** (touch down + touch up in same spot). If the user drags to scroll, `touchEnd` fires at a different position and the browser handles it as a scroll — the action callback won't execute during a scroll gesture.
- `onMouseDown` with `preventDefault` still prevents input blur on desktop (the original purpose of the hardened handlers).
- The scroll container with `touchAction: 'pan-y'` tells the browser to prioritize vertical scrolling within this element.

### Expected Result

- Search results list scrolls smoothly on mobile
- Tapping a result still opens the product detail drawer
- Desktop keyboard navigation and mouse clicks still work
- Input field stays focused when interacting with results (no blur issues)

