# Colour

TeamMatch is dark first, and light is fully supported. Every colour is a semantic token with a dark and a light value. Components use token names, never hex values. Values are in [tokens.json](../tokens.json) and `frontend/src/app/globals.css`.

## Theme switching
- Dark is the default.
- Light applies when the OS asks for it and the user hasn't chosen, or when `data-theme="light"` is set on `<html>` (or on any element, to theme a subtree).
- `data-theme="dark"` forces dark.
- The user's choice lives in Settings → Theme (System / Dark / Light).

## Tokens

| Token | Dark | Light | Tailwind | Use it for |
|---|---|---|---|---|
| `bg` | `#0B0A10` | `#F8F7FB` | `bg-bg` | The stage behind everything |
| `surface` | `#15131D` | `#FFFFFF` | `bg-surface` | Sidebar, panels, cards, modals |
| `surface-2` | `#1F1C2A` | `#F1EFF6` | `bg-surface-2` | Inputs, list rows, unmatched chips, hover fills |
| `border` | `#2C2839` | `#E3E0EB` | `border-border` | Hairlines and outlines |
| `text` | `#F6F4FB` | `#15131D` | `text-text` | Body and headings |
| `text-muted` | `#A7A2B8` | `#5E5872` | `text-muted` | Labels, helper text, timestamps |
| `primary` | `#7C5CFF` | `#6A47FF` | `text-primary`, `border-primary` | Focus ring, active tab underline, selection borders |
| `primary-strong` | `#6A47FF` | `#6A47FF` | `bg-primary-strong` | Violet fills that carry white text (desktop sidebar header) |
| `on-primary` | `#FFFFFF` | `#FFFFFF` | `text-on-primary` | Text on `primary-strong` |
| `apply` | `#C6F432` | `#C6F432` | `bg-apply` | Apply button, matched chips, match badge, filled seats |
| `on-apply` | `#0B0A10` | `#0B0A10` | `text-on-apply` | Text and icons on `apply` |
| `apply-text` | `#C6F432` | `#3F6600` | `text-apply-text`, `bg-apply-text` | Lime as text, lines, stamps and meters |
| `pass` (alias `danger`) | `#FF5C70` | `#C42339` | `text-pass`, `border-pass`, `text-danger` | Pass button, errors, destructive text |
| `on-danger` | `#0B0A10` | `#FFFFFF` | `text-on-danger` | Text on a `pass` fill (rare: badges only) |
| `info` | `#3CC8FF` | `#0870A6` | `text-info` | Details button, info notices |
| `undo` (alias `warning`) | `#FFC53D` | `#8A6406` | `text-undo`, `text-warning` | Undo button, warnings |
| `success` | `#34D399` | `#0B7A54` | `text-success` | Success icons and notices |
| `cta` | `#FFFFFF` | `#15131D` | `bg-cta` | The primary button |
| `on-cta` | `#0B0A10` | `#FFFFFF` | `text-on-cta` | Text on the primary button |
| `scrim` | `rgb(11 10 16 / .7)` | `rgb(21 19 29 / .5)` | `backdrop:bg-scrim` | The dimmed page behind a modal |
| `spark` | `#7C5CFF → #FF4FD8`, 135° | same | `bg-spark` | Logo and celebrations only |

## Rules
- **Lime is only for yes, apply, filled and progress.** Lime fills always carry `on-apply` text. When lime has to be text, a line or a meter, use `apply-text`, which turns deep green in light mode. Plain lime on white is 1.3:1 and unreadable.
- **One CTA per view.** The `cta` fill is white on dark and ink on light. Secondary actions use `surface-2`. Violet is never a button fill.
- **Violet is an indicator, not body text.** Use `primary` for focus rings, the active tab underline and selected outlines. Links are `text` with an underline.
- **Rose is for pass and problems.** Error text, the Pass ring and destructive text buttons. Never a filled red button.
- **Spark is rare.** Logo, the landing hero accent and "It's a Team!". Nowhere else.
- **Three surface levels at most** on one screen: `bg`, then `surface`, then `surface-2`.
- **Colour is never the only signal.** Status chips carry words, stamps carry words, and the team strip has a text label.

## Project covers
Each project gets a cover colour from this set. It's chosen when the project is created and stays the same in both themes. Every colour gives white text at least 4.5:1, which keeps the lime team-strip segments above 3:1.

| Name | Hex | White text | Lime on it |
|---|---|---|---|
| Raspberry | `#C2275B` | 5.6:1 | 4.4:1 |
| Pine | `#0B5E57` | 7.6:1 | 6.0:1 |
| Cobalt | `#2058C9` | 6.4:1 | 5.0:1 |
| Indigo | `#3E2BB8` | 9.4:1 | 7.3:1 |
| Plum | `#7A2E58` | 8.9:1 | 7.0:1 |
| Rust | `#9A3412` | 7.3:1 | 5.7:1 |

Covers are drawn as a gradient from the colour to a darker shade (`color-mix(in oklab, <cover> 62%, black)`), never a lighter one.

## Contrast
Worst case across `bg`, `surface` and `surface-2` in each theme (WCAG 2.2 ratio):

| Token as text | Dark | Light |
|---|---|---|
| `text` | 15.3 | 16.1 |
| `text-muted` | 6.8 | 5.9 |
| `apply-text` | 13.0 | 5.9 |
| `pass` | 5.6 | 5.1 |
| `info` | 8.7 | 4.7 |
| `undo` | 10.6 | 4.7 |
| `success` | 8.7 | 4.7 |
| `primary` | 3.8 (indicator only) | 4.7 |

Fills: `on-apply` on `apply` is 15.4, `on-cta` on `cta` is 19.7, and `on-primary` on `primary-strong` is 5.3.
