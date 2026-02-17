

## Plan: Add Search Bar to Shelves Page + Restore Dark Mode Toggle

### Problem 1: Missing Search Bar on Shelves Page
The LocationView component receives a `searchQuery` prop from the parent, but the SmartTopBar uses the global `SearchController` context (not the local `searchQuery` state). This means typing in the top bar doesn't filter shelves. The shelves page needs its own local search input to filter shelves/products within shelves.

### Problem 2: Dark Mode Toggle Missing
The old `Header.tsx` component included `<ThemeToggle />` in the top bar. When the header was replaced with `SmartTopBar`, the ThemeToggle was not carried over. It needs to be added back.

---

### Changes

**1. `src/components/locations/LocationView.tsx`**
- Add a local search input with a `Search` icon at the top of the page, next to the existing Refresh/View Toggle buttons
- Replace the external `searchQuery` prop usage with a local `localSearch` state
- Filter shelves based on this local search (shelf name, product name, product code)

**2. `src/components/layout/SmartTopBar.tsx`**
- Import and render `<ThemeToggle />` in the RIGHT actions area (between AlertsPopover and the session count indicator)
- This restores the sun/moon toggle for switching between light and dark themes

---

### Technical Details

LocationView search bar layout:
```text
[Search Input_______________] [Refresh] [List|Grid] [+ Yeni Raf]
```

SmartTopBar right section order:
```text
[Scanner] [RadialMenu] [Alerts] [ThemeToggle] [SessionCount]
```

