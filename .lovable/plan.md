

## Fix: Scroll in Search Results Triggers Accidental Product Open

### Problem
When scrolling through search results on mobile, lifting your finger at the end of the scroll fires `onTouchEnd`, which calls the action and opens a product. The user only wanted to scroll, not select.

### Root Cause
The `onTouchEnd` handler in `makeHandlers` unconditionally calls `action()` — it doesn't distinguish between a tap (finger down + up in same spot) and a scroll (finger down + drag + up).

### Solution
Track the touch start position via `onTouchStart`, then in `onTouchEnd` compare the distance moved. If the finger moved more than a small threshold (e.g. 10px), treat it as a scroll and do nothing. If it barely moved, treat it as a tap and fire the action.

### Implementation

**File: `src/components/layout/SearchPalette.tsx`**

1. Add a `useRef` to track touch start coordinates.
2. Replace the simple `makeHandlers` with a version that uses `onTouchStart` to record the position and `onTouchEnd` to check distance before firing.

```typescript
const touchStartRef = useRef<{ x: number; y: number } | null>(null);

const makeHandlers = useCallback((action: () => void) => ({
  onMouseDown: (e: React.MouseEvent) => { e.preventDefault(); },
  onClick: (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); action(); },
  onTouchStart: (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  },
  onTouchEnd: (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    if (start) {
      const t = e.changedTouches[0];
      const dx = Math.abs(t.clientX - start.x);
      const dy = Math.abs(t.clientY - start.y);
      // If finger moved more than 10px, it was a scroll — ignore
      if (dx > 10 || dy > 10) {
        touchStartRef.current = null;
        return;
      }
    }
    touchStartRef.current = null;
    e.preventDefault();
    e.stopPropagation();
    action();
  },
}), []);
```

This way:
- **Tap** (finger barely moves): action fires, product opens
- **Scroll** (finger drags 10px+): action is skipped, scroll completes normally

### Files to Change

| File | Change |
|------|--------|
| `src/components/layout/SearchPalette.tsx` | Add `touchStartRef`, update `makeHandlers` to detect scroll vs tap |

### Expected Result
- Scrolling through search results works without accidentally opening a product
- Tapping a result still opens the product as expected
- Desktop click behavior unchanged
