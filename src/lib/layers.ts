/**
 * Global Z-Index Layer System
 * Single source of truth — use these constants everywhere.
 * Never use arbitrary z-index values in components.
 */
export const Z = {
  page: 0,
  header: 50,
  stickyBar: 60,       // post-scan strip, sub-headers
  dropdown: 200,       // regular dropdowns, popovers
  drawer: 300,         // ProductIntelligenceDrawer, sheets
  paletteBackdrop: 400,
  palette: 410,        // search palette / command palette
  modal: 450,          // modals, alert dialogs
  toast: 500,          // sonner, toasts
  debug: 9999,         // debug overlay
} as const;

export type LayerKey = keyof typeof Z;
