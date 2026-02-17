

# Fix: Search Results Click Not Working

## Root Cause (Confirmed by Testing)
I searched for "Parla", results appeared correctly, I clicked "Parla Çay Seti 6 Lı" -- nothing happened. No console logs from `handleResultClick`, search text stayed "Parla" (should be cleared). The `onClick` handler on result buttons simply never executes.

This is a **classic dropdown focus/click race condition**:
1. User clicks a result button
2. `mousedown` fires on the button
3. Input `blur` fires (input loses focus)
4. React re-renders -- the dropdown may get removed or repositioned
5. `click` event fires but the target button no longer exists in the DOM

## Solution: Use `onMouseDown` Instead of `onClick`

The standard fix for dropdown menus is to use `onMouseDown` with `e.preventDefault()`:
- `mousedown` fires BEFORE `blur`, so the handler executes while the dropdown is still in the DOM
- `preventDefault()` on mousedown prevents the input from losing focus, keeping the dropdown stable

### File: `src/components/layout/SmartTopBar.tsx`

**Change 1 -- Result buttons: Replace `onClick` with `onMouseDown`**

For ALL result buttons (product results, shelf results, and command results), change:
```
onClick={() => handleResultClick(r)}
```
to:
```
onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleResultClick(r); }}
```

This applies to:
- Product result buttons (around line 348)
- Shelf result buttons (around line 376)
- Command result buttons (around line 329)

**Change 2 -- Add `onBlur` handler to close dropdown when clicking OUTSIDE**

Currently there's no mechanism to close the dropdown when clicking outside (other than the result buttons closing it). Add an `onBlur` handler on the input that closes the dropdown with a small delay, but only if the click target is NOT inside the dropdown:

```typescript
// Add a ref for the dropdown container
const dropdownRef = useRef<HTMLDivElement>(null);

// Input onBlur handler
onBlur={(e) => {
  // If clicking inside dropdown, don't close (mousedown preventDefault handles this)
  // If clicking outside, close after a short delay
  setTimeout(() => {
    if (!dropdownRef.current?.contains(document.activeElement)) {
      setShowDropdown(false);
    }
  }, 150);
}}
```

### File: `src/components/layout/HeaderSearch.tsx`

Apply the same `onMouseDown` fix to the result buttons in `HeaderSearch`:
- Product result buttons (around line 155)
- Shelf result buttons (around line 175)

Replace `onClick={() => handleSelect(r)}` with `onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleSelect(r); }}`

## Why This Works

```text
Before (broken):
  mousedown -> blur -> [dropdown unmounts] -> click [target gone, handler lost]

After (fixed):
  mousedown [handler fires immediately, preventDefault stops blur] -> no blur -> done
```

## Testing Plan
After implementing, I will:
1. Search for "Parla" and click a result -- should open ProductIntelligenceDrawer
2. Search for a shelf name -- should navigate to locations
3. Test on mobile viewport (390x844)
4. Verify clicking outside the dropdown closes it

## No database changes needed
This is purely a frontend event handling fix.

