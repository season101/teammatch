"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

// Data counts as fresh for 30 seconds (PL-17): going back to a screen just loaded
// reuses it instead of fetching again. Saving something still refetches at once,
// because the mutations invalidate their queries.
const FRESH_FOR_MS = 30_000;

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: FRESH_FOR_MS } },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
