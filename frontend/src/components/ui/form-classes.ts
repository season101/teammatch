// Shared classes for form fields and notices. Tokens only, so every screen
// follows the app's theme setting. See docs/design/components/form-fields.md.
export const inputClass =
  "mt-1 w-full rounded-input border border-border bg-surface-2 px-3 py-2 text-base text-text placeholder:text-muted hover:border-muted disabled:opacity-50 aria-invalid:border-pass";
export const errorClass = "mt-1 text-sm text-pass";
export const helperClass = "mt-1 text-xs text-muted";
export const noticeClass =
  "rounded-card border border-warning bg-surface-2 p-3 text-sm text-text";
export const successClass =
  "rounded-card border border-success bg-surface-2 p-3 text-sm text-text";
