"use client";

import { useState, type ComponentProps } from "react";

// A password field with an eye button that shows what was typed.
export function PasswordInput(props: Omit<ComponentProps<"input">, "type">) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <input
        {...props}
        type={shown ? "text" : "password"}
        className="min-h-11 w-full rounded-input border border-border-control bg-surface-2 py-2 pr-11 pl-3 text-text placeholder:text-muted hover:border-muted disabled:opacity-50 aria-invalid:border-pass"
      />
      {/* The name leaves out "password" so "Password" still finds only the field. */}
      <button
        type="button"
        aria-label="Show characters"
        aria-pressed={shown}
        onClick={() => setShown(!shown)}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-input text-muted hover:text-text"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
          {shown && <path d="M4 4l16 16" />}
        </svg>
      </button>
    </div>
  );
}
