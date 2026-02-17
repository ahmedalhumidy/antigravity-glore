

## Plan: Fix Shelf Scroll, Radial Menu Buttons (Cikis, Etiket, Sayim)

### Problem Analysis

4 issues identified from the screenshot and user report:

1. **Shelf selector scroll not working in stock entry modal** - The ShelfSelector Popover renders via portal with `z-50`, but the Dialog also uses `z-50`. On mobile, the popover can appear behind or be unresponsive. Fix: bump the ShelfSelector's PopoverContent z-index above the modal.

2. **Cikis (stock out) button does nothing** - In RadialActionMenu, the `onStockOut` handler only works when a product is "locked" in context (`lockedProduct`). Without a locked product, clicking does nothing. Fix: navigate to movements page as fallback.

3. **Etiket (label/print) button does nothing** - Handler is `navigate('/')` which just goes to home (already there). Fix: show a toast message indicating no product is selected, or navigate to the products page for label printing.

4. **Sayim (count) button does nothing** - Same problem as Etiket. Fix: navigate to a relevant page or show guidance.

---

### Changes

**1. `src/components/ui/popover.tsx`**
- Change PopoverContent z-index from `z-50` to `z-[500]` to ensure it always renders above dialogs and modals on mobile

**2. `src/components/layout/SmartTopBar.tsx`**
- Update RadialActionMenu handlers:
  - `onStockOut`: If no locked product, navigate to movements page (so user can pick a product for stock out)
  - `onCount`: Navigate to movements page or show a toast "Sayim icin urun tarayin"
  - `onDamage`: Show toast guidance
  - `onPrintLabel`: Navigate to products page or show toast "Etiket icin urun secin"

### Technical Details

PopoverContent z-index change:
```
Current:  z-50
Updated:  z-[500]
```

RadialActionMenu handler updates in SmartTopBar:
```
onStockOut: lockedProduct ? onStockAction(lockedProduct, 'cikis') : setCurrentView('movements') + toast
onCount: toast.info('Sayim icin bir urun tarayin')
onPrintLabel: toast.info('Etiket icin bir urun secin')  
onDamage: toast.info('Hasar bildirimi icin bir urun tarayin')
```

Since SmartTopBar doesn't have access to `setCurrentView`, the fallback actions will use `navigate` or show toast messages guiding the user.
