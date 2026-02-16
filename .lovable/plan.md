

# Landing Page - Sectioned Home Page (Enterprise Hub)

## Overview
Create a professional, sectioned landing page at a new `/home` route that serves as the public-facing entry point for the GLORE platform. This page will feature a hero section with live stats, CTA buttons, and module cards -- inspired by the reference screenshot. The existing `/` route stays as the protected dashboard.

## Structure (Top to Bottom)

### Section 1: Hero
- Badge pill at top: "Kurumsal Depo Yonetim Platformu"
- Large gradient title: "Depo Yonetim Sistemi" with accent color on first line
- Subtitle describing the platform
- Two live stat badges (total products count, total stock count) pulled from the database
- Three CTA buttons: "Depoya Git" (primary, links to `/`), "Magazaya Git" (outline, links to `/magaza`), "Galeriyi Gor" (outline, links to `/galeri`)

### Section 2: Module Cards Grid (3x2)
Six cards with icons, titles, and descriptions for:
1. **Depo Yonetimi** - WMS, envanter, lokasyonlar
2. **Magaza** - B2C/B2B satis portali
3. **Galeri** - Urun galerisi ve katalog
4. **Urun Katalogu** - Stok durumu, barkod bilgileri
5. **Stok Hareketleri** - Giris, cikis, transfer
6. **Etiket Yazdirma** - Barkod etiketleri

Each card has a colored icon, bold title, and description. Cards are clickable and navigate to their respective sections.

### Section 3: Footer
Simple footer line: "Depo Yonetim Sistemi -- Kurumsal Cozum"

## Design Style
- Dark gradient background (matching the reference screenshot's deep blue/dark theme)
- Glassmorphism cards with subtle borders and backdrop blur
- Gradient text for the main title
- Smooth hover animations on cards
- Fully responsive: 1 column on mobile, 2 on tablet, 3 on desktop

## Technical Details

### Files to Create
1. **`src/pages/LandingPage.tsx`** -- The full landing page component with all sections, self-contained with inline data

### Files to Modify
1. **`src/App.tsx`** -- Add `/home` public route for the landing page
2. Optionally redirect unauthenticated users from `/auth` page to see a link to `/home`

### Routing
- `/home` -- Public landing page (no auth required)
- `/` -- Protected dashboard (unchanged)
- The landing page CTAs link to `/` (dashboard, requires login), `/magaza`, and `/galeri`

### Stats
- Product count and stock count will be fetched from the `products` table using a simple public query (or hardcoded initially and made dynamic later)

### No Changes To
- Dashboard component
- Any warehouse logic
- Bottom navigation
- Sidebar
- Existing protected routes

