

## Fix: Top Bar Search Results Not Opening Product Intelligence Drawer

### Problem
When you tap a search result in the top bar on mobile, nothing happens. The results appear correctly, but tapping them doesn't open the Product Intelligence Drawer.

**Root cause:** The search input's `onBlur` event fires a 200ms timer that hides the dropdown. On mobile Safari, touch events are slower than mouse events, so the dropdown disappears before the tap registers on the result button.

### Solution

**File: `src/components/layout/SmartTopBar.tsx`**

1. Add a `mouseDownRef` (ref flag) that tracks whether a result is being tapped/clicked
2. In `onBlur`, check this flag before hiding the dropdown -- if a result is being pressed, skip hiding
3. Reset the flag after the result action completes
4. This ensures the dropdown stays visible long enough for the click/tap to register

### Technical Details

```text
Current flow (broken on mobile):
  User taps result
  --> onBlur fires (input loses focus)
  --> setTimeout(hide dropdown, 200ms)
  --> Touch event delayed on mobile (~300ms)
  --> Dropdown already gone, onMouseDown never fires

Fixed flow:
  User taps result
  --> onMouseDown sets ref flag = true (fires immediately)
  --> onBlur fires, sees flag is true, skips hiding
  --> handleResultClick runs, clears flag, hides dropdown
```

Changes:
- Add `tappingResultRef = useRef(false)` 
- On each result button's `onMouseDown`: set `tappingResultRef.current = true`
- In `onBlur` handler: if `tappingResultRef.current` is true, don't hide dropdown
- In `handleResultClick` and `executeCommand`: reset `tappingResultRef.current = false`
- Same fix for command result buttons

This is a minimal, targeted fix (about 10 lines changed) that preserves all existing behavior while fixing the mobile touch race condition.

