

# Product Details Module - Inventory Intelligence View

## Overview
Transform the current basic product detail drawer into a comprehensive **Inventory Intelligence View** -- a full-width, tabbed product command center that provides deep analytics, real-time stock tracking, visual barcode rendering, movement charts, and actionable insights all in one place.

---

## What You'll Get

### Tab 1: Overview (Genel Bakis)
- **Hero Header**: Product name, code, category badge, barcode visual rendered live via JsBarcode, and stock status indicator with pulse animation for low-stock items
- **Stock Intelligence Cards**: 4 mini stat cards showing Current Stock (with gauge), Set Stock, Total In, Total Out -- each with percentage change indicators
- **7-Day Movement Sparkline Chart**: A mini area chart showing daily in/out movements for this specific product over the last 7 days (using recharts)
- **Quick Facts Grid**: Shelf location (clickable), barcode, last transaction date, days since last movement, average daily consumption rate

### Tab 2: Movement History (Hareket Gecmisi)
- **Full Timeline**: Enhanced timeline with filtering by date range and movement type (in/out)
- **Movement Summary Bar**: Total in vs total out as a visual ratio bar
- **Each Entry Shows**: Quantity, type (color-coded), date/time, handled by whom, shelf, and notes -- with relative timestamps ("2 saat once")

### Tab 3: Analytics (Analiz)
- **Stock Trend Chart**: Line chart showing stock level changes over the last 30 days (calculated from movements)
- **Consumption Rate**: Average daily/weekly consumption with forecast ("At this rate, stock will reach minimum in ~12 days")
- **Movement Frequency**: Bar chart showing movement count by day of week
- **Top Handlers**: Who performs the most operations on this product

### Tab 4: Activity Log (Aktivite Kaydi)
- Integrates the existing `ProductActivityTimeline` component
- Shows all changes: edits, stock movements, shelf transfers, archive/restore actions
- Each entry shows old vs new values for updates

---

## Quick Actions Bar (Always Visible at Top)
- Stock In (green button)
- Stock Out (red button)
- Print Barcode Label
- Edit Product
- Transfer Shelf
- Share/Export product card as PDF

---

## Technical Details

### New Files to Create
- `src/components/products/ProductIntelligenceDrawer.tsx` -- Main container with tabs
- `src/components/products/ProductOverviewTab.tsx` -- Overview tab content
- `src/components/products/ProductMovementsTab.tsx` -- Enhanced movement history with filters
- `src/components/products/ProductAnalyticsTab.tsx` -- Charts and forecasting
- `src/components/products/ProductStockCards.tsx` -- Mini stat cards with sparklines

### Files to Modify
- `src/pages/Index.tsx` -- Replace `ProductDetailDrawer` with `ProductIntelligenceDrawer`
- `src/components/products/ProductList.tsx` -- Update view handler
- `src/components/products/StockLevelGauge.tsx` -- Add animation and size variants

### Data Queries (No DB Changes Needed)
All analytics are computed from existing `stock_movements` and `product_activity_log` tables:
- 7-day movement sparkline: GROUP BY movement_date for last 7 days
- 30-day stock trend: Running sum calculation from movements
- Consumption rate: Average daily outgoing over last 30 days
- Movement frequency: GROUP BY day-of-week
- Top handlers: GROUP BY handled_by with COUNT

### Libraries Used (All Already Installed)
- `recharts` -- for sparklines, area charts, bar charts
- `date-fns` -- for date formatting and relative time
- `jsbarcode` -- for live barcode rendering
- `jspdf` -- for export/print functionality
- `lucide-react` -- for icons

---

## UI Design Approach
- Uses the existing Sheet (slide-out drawer) but expanded to `sm:max-w-2xl` for more space
- Tabs component from Radix UI (already installed) for navigation between sections
- Consistent with existing design system (same colors, fonts, card styles)
- Fully responsive: tabs stack vertically on mobile
- Smooth animations with CSS transitions
- Dark mode compatible using existing CSS variables

