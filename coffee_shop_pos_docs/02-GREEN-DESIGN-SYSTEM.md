# 02 — Green Design System

## 1. Visual direction

Use the approved Coffee Plus green reference as the primary visual guide.

The intended feeling is:
- Fresh, welcoming and contemporary.
- Professional enough for commercial café operations.
- Clean and operational rather than decorative.
- Warm through coffee photography, not through a brown interface theme.

**Do not use brown as the primary UI color.** Coffee imagery may naturally contain brown tones.

## 2. Color tokens

| Token | Hex | Usage |
|---|---|---|
| `brand-900` | `#075C35` | Deep green sidebar, strong brand areas |
| `brand-800` | `#08723B` | Dark green hover / secondary emphasis |
| `brand-700` | `#07883F` | Primary brand and selected controls |
| `brand-500` | `#20B45A` | Primary action accents |
| `brand-100` | `#EAF6EE` | Soft green backgrounds and selected states |
| `brand-50` | `#F3FAF5` | Very light green surfaces |
| `surface` | `#FFFFFF` | Cards, dialogs, panels |
| `page` | `#F5F7F5` | Main application background |
| `text-primary` | `#252B27` | Main text |
| `text-secondary` | `#68736C` | Supporting text |
| `border` | `#DCE5DE` | Dividers and outlines |
| `success` | `#168447` | Successful states |
| `warning` | `#B7791F` | Warnings and pending attention |
| `danger` | `#C43D3D` | Destructive actions and errors |
| `info` | `#2674B8` | Informational states |

Use semantic tokens in code rather than repeating raw hex values throughout components.

## 3. Color usage rules

- Sidebar: `brand-900` or a subtle deep-green gradient if supported by the existing design system.
- Active navigation item: `brand-700`, with a clear active indicator.
- Main primary buttons: `brand-700` or `brand-500`, with white text.
- Secondary buttons: white or neutral surface with border.
- Selected category: green background and white text, or pale-green background with dark-green text.
- Selected modifier: green outline / fill with a visible selected state.
- Total panel: pale green surface with strong green total.
- Destructive actions: danger color, never green.
- Warning statuses: warning color, never green.
- Avoid using green for every element. Preserve hierarchy and whitespace.

## 4. Typography

Use the existing project's typography if it is already established and suitable. Otherwise use a clean sans-serif family such as Inter or the platform's system sans-serif stack.

Suggested hierarchy:
- Page title: 24–28 px, semibold.
- Section title: 18–20 px, semibold.
- Card title: 15–17 px, semibold.
- Body: 14–16 px.
- Supporting labels: 12–13 px.
- POS product name: 14–16 px, semibold.
- POS price: 14–16 px, bold.
- Primary checkout total: 24–30 px, bold.

Use tabular numerals for prices, quantities and totals where available.

## 5. Spacing and sizing

Use a consistent 4 px base spacing scale:
- 4 px: tight icon/text spacing.
- 8 px: compact control spacing.
- 12 px: form and card spacing.
- 16 px: standard component padding.
- 20–24 px: section spacing.
- 28–32 px: major layout separation.

Suggested dimensions:
- Sidebar: 200–224 px on desktop.
- Header: 64–76 px.
- POS cart panel: 340–400 px.
- Product card image: consistent aspect ratio, preferably 4:3 or 5:4.
- Buttons: 40–48 px minimum height.
- Touch targets: aim for at least 44 × 44 px.

These are design targets, not reasons to break the existing responsive layout.

## 6. Layout rules

### Management screens
- Persistent left navigation.
- Top header with page title, branch context, user/cashier and relevant actions.
- Main content area on a light neutral background.
- White cards with subtle borders.
- Consistent page padding.

### POS screen
- Use a focused three-area layout:
  1. Product browsing and category area.
  2. Fixed or sticky current-order/cart panel.
  3. Top header for branch, search, date/status and cashier context.
- Do not let the cart disappear while browsing products on desktop.
- On tablet, use a collapsible cart drawer or a clearly visible cart summary action.
- Product cards should prioritize image, name and price.
- Do not overcrowd the product grid.

### Modals and drawers
- Use a modal for product customization and checkout when screen space permits.
- Keep important actions visible without excessive scrolling.
- On smaller screens, use a full-height drawer or full-screen dialog.
- Provide a clear close/cancel action.
- Warn before discarding meaningful unsaved input.

## 7. Component styling

### Buttons
- Primary: solid brand green, white text.
- Secondary: white surface, neutral border.
- Tertiary: text or ghost style.
- Destructive: danger color.
- Disabled: visibly disabled, not merely lower opacity if contrast becomes poor.

### Cards
- White surface.
- Subtle border.
- Small-to-medium radius.
- Minimal shadow; avoid heavy floating effects.
- Consistent image treatment.

### Inputs
- Clear label above or alongside field.
- Visible focus ring.
- Helpful validation message.
- Consistent height and border.
- Do not rely on placeholder text as the only label.

### Tables
- Readable row height.
- Clear column labels.
- Numeric values right-aligned.
- Status badges with both text and color.
- Search and filters near the top.

### Status badges
- New / Pending: info or warning.
- Preparing: blue or amber.
- Ready / Paid / Completed: green.
- Cancelled / Failed: red.
- Held: neutral or warning.
- Never communicate status using color alone.

## 8. Photography and icons

- Use consistent, appetizing café product photography.
- Use real product images or stable local assets; avoid random mismatched image URLs.
- Product image crops should be consistent.
- Use a consistent icon family already present in the project.
- Do not mix emoji icons with a professional icon system in the production UI.
- Ensure images have useful fallback placeholders.

## 9. Responsive behavior

### Desktop
- Full sidebar.
- Multi-column product grid.
- Persistent cart panel.
- Modals centered.

### Tablet
- Narrow or collapsible sidebar.
- Two- or three-column product grid depending on width.
- Cart drawer or persistent compact cart.
- Touch-friendly modifier controls.

### Narrow screens
- Do not force the desktop three-column layout.
- Use a dedicated stacked workflow if mobile support is required.
- Prioritize order entry and checkout.

## 10. Visual quality checklist

- Green is the primary UI identity, not brown.
- Text contrast is readable.
- Active navigation is obvious.
- Buttons have hover, focus, pressed and disabled states.
- Cards align consistently.
- Product photos share a consistent treatment.
- Dialogs fit within the viewport.
- No horizontal overflow at supported sizes.
- Totals and prices are easy to scan.
- All screens feel like one application.
