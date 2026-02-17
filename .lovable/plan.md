

## Plan: Fix Scroll Issues in Stock Entry (Movements Page + Main Page)

### Root Cause Analysis

Two separate scroll problems were identified:

1. **Movements Page (MovementForm)**: The product selection dropdown (Popover with CommandList) and shelf selector dropdown open inside Radix Popovers. On mobile, these Popovers can block touch-based scrolling inside their content. The product combobox CommandList has a default `max-h-[300px]` but may not respond to touch scroll properly on some devices.

2. **Main Page (StockActionModal)**: The Dialog uses `fixed` positioning centered on screen with NO `max-height` or `overflow-y: auto`. When the QuickStockInput form expands (showing quantity inputs, shelf selector, notes, action buttons), the content exceeds the mobile viewport height and cannot scroll.

---

### Changes

**1. `src/components/ui/dialog.tsx`** -- Add scrollability to DialogContent
- Add `max-h-[85vh]` and `overflow-y-auto` to DialogContent so tall content scrolls on mobile
- Add `overscroll-behavior: contain` to prevent background scroll bleed
- This fixes StockActionModal, BarcodeResultModal, and all other dialogs globally

**2. `src/components/movements/MovementForm.tsx`** -- Fix product list scroll in Popover
- Add `onOpenAutoFocus={(e) => e.preventDefault()}` to the PopoverContent (already done on ShelfSelector, missing here)
- Add explicit touch-scroll CSS to the CommandList: `overscroll-contain` and `-webkit-overflow-scrolling: touch`

**3. `src/components/ui/command.tsx`** -- Improve touch scroll on CommandList
- Add `overscroll-behavior: contain` and `-webkit-overflow-scrolling: touch` as inline styles on CommandList to ensure mobile touch scrolling works in all comboboxes/selectors

---

### Technical Details

DialogContent change (the key fix):
```text
Current:  fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] ...
Updated:  fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] max-h-[85vh] overflow-y-auto overscroll-contain ...
```

CommandList touch scroll:
```text
Current:  max-h-[300px] overflow-y-auto overflow-x-hidden
Updated:  max-h-[300px] overflow-y-auto overflow-x-hidden overscroll-contain
+ inline style: { WebkitOverflowScrolling: 'touch' }
```

MovementForm PopoverContent:
```text
Add: onOpenAutoFocus={(e) => e.preventDefault()}
```

