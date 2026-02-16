

# Professional Product Edit Experience (Akilli Duzenleme)

## Current Problem
When you click "Duzenle" in the Intelligence Drawer, it closes the drawer and opens a basic dialog with stock in/out controls mixed in. This breaks the flow and feels disconnected.

## Solution: Inline Edit Tab in the Intelligence Drawer
Instead of a separate modal, add a 5th tab called "Duzenle" directly inside the Intelligence Drawer. This keeps the user in context with all product intelligence visible.

### What Changes

**1. New "Duzenle" Tab in ProductIntelligenceDrawer**
- Add a 5th tab with a pencil icon alongside Overview, Movements, Analytics, Activity
- Remove the "Duzenle" button from the quick actions bar (no longer needed)
- Remove the stock in/out buttons from the edit form (they already exist in the drawer's quick actions bar)

**2. Professional Edit Form (ProductEditTab.tsx)**
A clean, intelligent edit form with these sections:

- **Product Identity Section**: Product Code + Barcode side by side with live barcode preview that updates as you type
- **Product Name**: Full-width input with character counter
- **Shelf Location**: The existing ShelfSelector component
- **Stock Configuration**: Only Min Stock threshold (current stock is managed via stock movements, not manual edits)
- **Category**: Dropdown selector for product category
- **Notes**: Textarea with character limit indicator
- **Custom Fields**: The existing CustomFieldsSection for dynamic fields
- **Change Summary**: Before saving, show a visual diff of what changed (old value -> new value) so the user confirms intentionally
- **Unsaved Changes Warning**: If user switches tabs with unsaved edits, show a confirmation prompt
- **Delete/Archive Button**: A subtle danger zone at the bottom with confirmation dialog

**3. Remove Separate ProductModal for Editing**
- ProductModal will only be used for "Yeni Urun Ekle" (adding new products)
- The "Duzenle" button in the drawer's quick actions bar is removed since the tab handles it
- The `onEdit` prop is removed from ProductIntelligenceDrawer

### Files to Create
- `src/components/products/ProductEditTab.tsx` -- The intelligent inline edit form

### Files to Modify
- `src/components/products/ProductIntelligenceDrawer.tsx` -- Add Duzenle tab, remove onEdit prop and Duzenle button
- `src/pages/Index.tsx` -- Remove the onEdit handler from the drawer, keep ProductModal only for new products
- `src/components/products/ProductModal.tsx` -- Remove the QuickStockInput section (stock in/out) since it is only used for new products now

### Technical Details

**Change Detection Logic:**
```text
Compare formData vs original product values
-> Show colored diff cards: "Urun Adi: Vida M8 -> Vida M10"
-> Only enable Save button when changes exist
```

**Form Validation:**
- Product Code: required, trimmed
- Product Name: required, max 200 chars
- Min Stock: >= 0
- Barcode: optional, validated format

**Save Flow:**
1. User edits fields in the tab
2. Change summary appears at bottom showing diffs
3. User clicks "Kaydet" (Save)
4. Product updates via existing updateProduct hook
5. Success toast + drawer stays open on Overview tab with refreshed data

**Archive Flow:**
1. Small "Arsivle" button at bottom with AlertDialog confirmation
2. On confirm, calls deleteProduct (soft delete)
3. Drawer closes, product list refreshes

