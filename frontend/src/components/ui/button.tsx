import type { ComponentProps } from "react";

const variants = {
  // White pill on dark, ink pill on light. Violet is never a button fill.
  cta: "bg-cta text-on-cta hover:opacity-90",
  secondary: "border border-border bg-surface-2 text-text hover:bg-surface",
  ghost: "text-text underline-offset-4 hover:underline",
  // Text only: destructive actions sit behind a gate whose CTA is the safe choice.
  danger: "text-danger hover:bg-surface-2",
};

const sizes = {
  sm: "min-h-9 px-4 text-sm",
  md: "min-h-11 px-5 text-base",
  lg: "min-h-13 px-7 text-lg",
};

// Links that look like buttons use this; button.md says navigation is a link.
export function buttonClasses(
  variant: keyof typeof variants = "cta",
  size: keyof typeof sizes = "md",
  // A wide button dims on press instead of scaling: 4% of a full-width pill is a jump at the edges.
  wide = false,
) {
  const press = wide ? "active:opacity-80" : "motion-safe:active:scale-[0.96]";
  return `inline-flex items-center justify-center gap-2 rounded-pill font-semibold transition duration-fast ease-standard disabled:cursor-not-allowed disabled:opacity-50 ${press} ${variants[variant]} ${sizes[size]}`;
}

type Props = ComponentProps<"button"> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
};

export function Button({
  variant = "cta",
  size = "md",
  type = "button",
  className = "",
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={`${buttonClasses(variant, size, /(^|\s)(w-full|flex-1)(\s|$)/.test(className))} ${className}`}
      {...props}
    />
  );
}
