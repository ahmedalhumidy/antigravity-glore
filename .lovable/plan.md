

# Replace Profile Tab with Native Control Panel Hub

## What Changes

### 1. Bottom Nav: Replace "Profil" with "Daha Fazla" (More) Hub
**File: `src/components/layout/MobileBottomNav.tsx`**

Replace the last tab from Profile (single page) to a **"Daha Fazla"** (More) tab using the `Menu` or `Grid2X2` icon. This tab navigates to a new `/more` route that acts as a native-style hub page -- like the "More" tab in professional iOS/Android apps.

Updated tabs:
- Home (Ana Sayfa) -> `/`
- Products (Urunler) -> `/products`
- Scan (Tara) -> FAB center button
- Movements (Hareketler) -> `/movements`
- **Daha Fazla** (More) -> `/more` (replaces Profil)

### 2. New Native "More" Hub Page
**New file: `src/components/layout/MobileMoreHub.tsx`**

A professional, native-feeling hub page that groups all secondary features into sections with large touch-friendly rows (like iOS Settings app). Sections:

**User Section (top)**
- User avatar + name + email with a subtle card background
- Tap to go to Profile Settings

**Quick Links Section**
- Konumlar (Locations)
- Uyarilar (Alerts) with badge count
- Raporlar (Reports)
- Arsiv (Archive)

**Admin Section** (permission-gated)
- Kullanicilar (Users)
- Denetim Gunlugu (Audit Logs)
- Sistem Ayarlari (Settings)
- Kontrol Merkezi (Control Center)
- Magaza Yonetimi (Store Management)
- Galeri Yonetimi (Gallery Management)

**Account Section (bottom)**
- Profil Ayarlari (Profile Settings)
- Cikis Yap (Sign Out) -- red destructive style

Each row has the icon on the left, label, and a chevron-right arrow. Tapping navigates to the corresponding route. The whole page scrolls naturally and feels like a native settings/hub page.

### 3. Route and View Registration
**File: `src/hooks/useCurrentView.tsx`**
- Add `'more'` to the ViewMode type and route map (`/more` -> `more`)

**File: `src/types/stock.ts`**
- Add `'more'` to the `ViewMode` union type

**File: `src/App.tsx`**
- Add `/more` route pointing to `<Index />`

**File: `src/pages/Index.tsx`**
- Add the `more` view case that renders `<MobileMoreHub />`
- Add `'more'` to viewTitles
- Pass necessary props (alertCount, onSignOut, user) to the hub

### Files to Create
- `src/components/layout/MobileMoreHub.tsx` -- The native hub page

### Files to Modify
- `src/components/layout/MobileBottomNav.tsx` -- Change last tab from Profile to "Daha Fazla"
- `src/types/stock.ts` -- Add `'more'` to ViewMode
- `src/hooks/useCurrentView.tsx` -- Add `/more` route mapping
- `src/App.tsx` -- Add `/more` protected route
- `src/pages/Index.tsx` -- Render MobileMoreHub for the `more` view

### Technical Details

**MobileMoreHub Layout:**
- Native iOS Settings-style rows with 52px height, icon + label + chevron
- Grouped in sections with subtle section headers (text-xs uppercase muted)
- User card at top with avatar, name, email
- Admin section hidden for non-admin users via `usePermissions`
- Sign out button at bottom as a red destructive row
- All navigation uses `useNavigate` to push to the correct route
- Alert badge count passed as prop and shown on the Alerts row

**No changes to:**
- Any backend logic or database
- Desktop sidebar (unchanged)
- Existing page components
- Stock movement rules
