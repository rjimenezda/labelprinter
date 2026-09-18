/**
 * Editor UI accent colors. Deliberately separate from render/tokens.ts,
 * which governs the print path and must stay pure black/white (see its
 * doc) -- these are for the authoring chrome only (buttons, selection,
 * handles) and never touch anything a label prints.
 *
 * A near-neutral slate rather than a saturated brand blue: gray first,
 * with only the faintest cool undertone.
 */
export const ACCENT = '#4b5563'
export const ACCENT_SOFT = '#6b7280'
