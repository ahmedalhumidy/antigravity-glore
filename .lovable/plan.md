

## Rebuild: Top Bar Search + Shelf Export Filter

Two issues need fixing:

### Issue 1: Search results in top bar don't open the Intelligence Drawer on mobile

**Root cause:** The current fix sets `tappingResultRef = true` and then immediately calls `handleResultClick()` which resets it to `false` -- all in the same synchronous `onMouseDown` handler. This makes the ref useless. Additionally, on iOS Safari, `onMouseDown` doesn't always fire reliably for touch events inside scrollable containers.

**Fix:**
- Remove `tappingResultRef.current = false` from inside `handleResultClick` and `executeCommand` -- the ref should stay `true` until after the blur timer fires
- Add `onTouchStart` handlers alongside `onMouseDown` for iOS Safari compatibility
- Reset the ref with a small delay (e.g. 300ms `setTimeout`) after the action completes
- Alternative simpler approach: skip the ref entirely and use `onMouseDown` with `e.preventDefault()` properly -- the key insight is that `e.preventDefault()` on `onMouseDown` should prevent `onBlur` from firing at all. If that's already being done and still failing on iOS, add `onTouchStart` with the same logic

**File:** `src/components/layout/SmartTopBar.tsx`

Changes:
- On each result button: keep `onMouseDown` with `e.preventDefault()` but also add `onTouchEnd` as a fallback that calls `handleResultClick(r)` directly
- In `handleResultClick` and `executeCommand`: remove the `tappingResultRef.current = false` line (not needed since these functions already close the dropdown explicitly)
- Simplify the `onBlur` handler -- since `e.preventDefault()` on mousedown should prevent blur, add a guard that checks if the dropdown is still logically needed

### Issue 2: "Raf" (Shelf filter) button not visible next to Excel export

**Root cause:** The code exists in `ProductList.tsx` (lines 245-281) but may not be rendering due to the `shelves` array being empty (loading state) or a build sync issue.

**Fix:**
- Add a loading check -- show the Raf button even when shelves are loading (with a spinner or disabled state)
- Add a `ScrollArea` inside the popover for better mobile UX with many shelves
- Add a search/filter within the shelf list for users with many shelves
- Ensure the Popover renders correctly on mobile by setting `modal={true}` on the Popover component

**File:** `src/components/products/ProductList.tsx`

Changes:
- Add `modal={true}` to `<Popover>` to ensure it works on mobile
- Keep the Raf button visible always, show "Yükleniyor..." inside popover if shelves are still loading
- Add a search input inside the shelf popover for filtering shelves by name

### Technical Summary

```text
SmartTopBar.tsx:
  - Add onTouchEnd to all result buttons as iOS fallback
  - Remove premature tappingResultRef reset from handleResultClick/executeCommand
  - Ensure e.preventDefault() on onMouseDown prevents blur properly

ProductList.tsx:
  - Add modal={true} to shelf filter Popover
  - Add search input inside shelf popover
  - Handle loading state for shelves list
```

