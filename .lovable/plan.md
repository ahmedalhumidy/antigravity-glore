
## Fix: Scroll Broken in Shelf Picker Across All Pages

### Root Cause Identified

The core problem is in `src/components/shelves/ShelfSelector.tsx`. The `ShelfSelector` component uses a **Radix UI Popover + Command** combination for the shelf dropdown. When the user opens the shelf picker inside a Dialog (like StockActionModal or MovementForm), **two portals stack on top of each other**:

1. The Dialog renders in a portal (z-index: 50)
2. The Popover also renders in a portal (z-index: 500)

On mobile, when the Popover opens inside a Dialog, **Radix UI locks the body scroll** to prevent background scrolling. However since both components apply `pointer-events` and scroll-lock at the same time, the scroll lock does not release properly — leaving the entire page frozen after the dropdown closes.

Additionally, `DialogContent` has `overflow-y-auto` which conflicts with Radix's internal scroll locking, preventing the Dialog itself from scrolling when the shelf list is long.

### Exact Problems

**Problem 1 — `ShelfSelector` Popover inside Dialog blocks scroll:**
When `ShelfSelector` (Popover-based) opens inside a Dialog (StockActionModal / MovementForm), Radix applies a body scroll lock that doesn't cleanly release on mobile. The `CommandList` has `max-h-[200px] overflow-y-auto` but the Popover portal competes with the Dialog portal.

**Problem 2 — `ScanSessionShelfPicker` uses a `Select` inside a Dialog:**
The `Select` component from Radix renders its content in a portal. Inside a Dialog, this creates the same double-portal scroll lock issue on mobile.

### Solution

Replace the Popover-based shelf dropdown with a **native-scroll-safe approach** that doesn't create scroll lock conflicts:

**For `ShelfSelector.tsx`** — Add `modal={false}` to the Popover so it doesn't apply body scroll lock when used inside a Dialog. Also add `avoidCollisions={true}` so it positions correctly without fighting the Dialog's scroll container.

**For `ScanSessionShelfPicker.tsx`** — The `SelectContent` already has `style={{ WebkitOverflowScrolling: 'touch' }}` but is missing `position="item-aligned"` and the `z-[600]` to render above the Dialog. Fix by passing explicit className to SelectContent.

**For `DialogContent` in `dialog.tsx`** — The existing `overflow-y-auto` is correct but needs `touch-action: pan-y` and the `-webkit-overflow-scrolling: touch` property to work on iOS Safari inside modals.

### Files to Change

| File | Change |
|------|--------|
| `src/components/shelves/ShelfSelector.tsx` | Add `modal={false}` to Popover, fix z-index on PopoverContent, add touch scroll fix to CommandList |
| `src/components/ui/dialog.tsx` | Add `-webkit-overflow-scrolling: touch` and `touch-action: pan-y` to DialogContent |
| `src/modules/scan-session/components/ScanSessionShelfPicker.tsx` | Fix SelectContent z-index and add `position="popper"` for proper mobile rendering |

### Technical Details

**`ShelfSelector.tsx` fix — `modal={false}` on Popover:**
```tsx
<Popover open={open} onOpenChange={setOpen} modal={false}>
```
`modal={false}` tells Radix NOT to lock body scroll when this Popover opens. This is the correct setting when the Popover is embedded inside a Dialog that already manages scroll locking. Without this, two scroll locks compete and the page freezes.

**`dialog.tsx` fix — iOS scroll:**
```tsx
className={cn(
  "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] max-h-[85vh] overflow-y-auto overscroll-contain gap-4 border bg-background p-6 shadow-lg ...",
  className,
)}
style={{ WebkitOverflowScrolling: 'touch' }}
```

**`ScanSessionShelfPicker.tsx` fix — SelectContent z-index:**
```tsx
<SelectContent 
  className="max-h-[200px] overflow-y-auto z-[600]" 
  style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
>
```

### Expected Result

| Page | Before | After |
|------|--------|-------|
| Products Giriş/Çıkış modal | Scroll freezes after opening shelf picker | Scroll works normally |
| Movement Form | Scroll freezes after opening shelf picker | Scroll works normally |
| Barcode scanner shelf picker | Select dropdown doesn't scroll on mobile | Select scrolls properly |
| Scan Session shelf picker | Body scroll locks after Select opens | Body scroll releases cleanly |
| All pages after closing any modal | Page may remain un-scrollable | Page always scrollable |
