import { useQueryClient } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { Providers } from "./providers";

function ReadStaleTime({ onRead }: { onRead: (ms: unknown) => void }) {
  onRead(useQueryClient().getDefaultOptions().queries?.staleTime);
  return null;
}

test("queries stay fresh for 30 seconds, so a screen just loaded isn't fetched again (PL-17)", () => {
  let staleTime: unknown;
  render(
    <Providers>
      <ReadStaleTime onRead={(ms) => (staleTime = ms)} />
    </Providers>,
  );

  expect(staleTime).toBe(30_000);
});
