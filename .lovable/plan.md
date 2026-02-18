
## Fix: Shelf Picker Scroll on Mobile — Final Root Cause

### What the screenshot shows
The shelf list dropdown is **open and visible**, but the user **cannot scroll within the list** to see more shelf options. Items 1, 10, 100 (checked), 101 (highlighted), 102, 103 are visible — but scrolling within that list is broken on mobile.

### True Root Cause

The `ShelfSelector` uses a **Radix Popover** which renders its content inside a **Portal** (attached to `<body>`). When this Popover is placed inside a **Dialog** (also a Portal):

1. The Dialog has `overflow-y-auto` with `touchAction: pan-y` — it claims all vertical touch events for itself.
2. The Popover content appears visually above the dialog but **touch events are still captured by the dialog's scroll handler** first.
3. The result: dragging up/down inside the shelf list scrolls the **dialog** behind it instead of scrolling the **shelf list itself**.

Setting `modal={false}` on the Popover (done last time) prevents the body scroll lock conflict but does **not** fix the touch event interception by the parent dialog.

### Why Previous Fixes Didn't Work
- `modal={false}` → Fixed body scroll lock, but not touch event routing
- `WebkitOverflowScrolling: touch` on `CommandList` → Helps on standalone elements, but when the touch is intercepted by a parent, it never reaches `CommandList`
- `overscroll-contain` → Same — only works if the element gets the touch events

### The Correct Fix: Inline Dropdown (No Portal)

The only reliable solution for mobile is to **render the shelf list inline** — as an expanding section directly in the DOM, not via a portal. This way:
- No portal z-index stacking
- No touch event routing conflicts
- The dialog scrolls to reveal the expanded list naturally
- Works exactly like a native `<select>` expand behavior

### Implementation

Replace the `Popover + Command` approach in `ShelfSelector.tsx` with an **inline collapsible list**:

```
[Button: "100 — selected shelf"]   ← tap to toggle
[Search input: "Raf ara..."]        ← visible when open
[Scrollable list of shelves]        ← max-h-48, overflow-y-auto, touch-action: pan-y
  ✓ 100
    101
    102
[+ Yeni Raf Ekle]
```

This entire structure is in the normal DOM flow inside the form/dialog. No portals involved.

#### Key styling for the inline list:
```tsx
<div 
  className="max-h-48 overflow-y-auto overscroll-contain border rounded-md bg-popover"
  style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
>
  {/* shelf items */}
</div>
```

`touch-action: pan-y` on the list itself tells the browser: "this element handles vertical pan gestures" — so iOS Safari passes the touch events to this element instead of bubbling them to the dialog.

### Files to Change

| File | Change |
|------|--------|
| `src/components/shelves/ShelfSelector.tsx` | Replace Popover+Command with inline collapsible list |

That's the only file that needs changing. The other files (dialog.tsx, ScanSessionShelfPicker.tsx) are fine as-is.

### What the new ShelfSelector looks like

**Closed state:**
```
[ 📍 100  ▼ ]
```

**Open state (inline, no portal):**
```
[ 📍 100  ▲ ]
┌─────────────────────────┐
│ 🔍 Raf ara...           │
├─────────────────────────┤
│   📍 1                  │  ← scrollable on mobile
│   📍 10                 │
│ ✓ 📍 100                │
│   📍 101                │
│   📍 102                │
│   ...                   │
├─────────────────────────┤
│ + Yeni Raf Ekle         │
└─────────────────────────┘
```

The list has `max-h-48` (192px) with `overflow-y-auto` and `touch-action: pan-y`, making it independently scrollable on touch devices regardless of what parent container it lives in.

### Why This Works

- No Portal → no touch event routing conflict  
- `touch-action: pan-y` on the list → browser gives vertical touches directly to the list element  
- Inline DOM → dialog's `overflow-y-auto` will scroll the dialog to show the expanded list if needed (correct behavior)  
- Search input still filters items in real-time via local `useState`  
- "Yeni Raf Ekle" still opens the add-shelf Dialog as before
