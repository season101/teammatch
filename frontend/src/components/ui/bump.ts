import { useState } from "react";

// A count pops once when it goes up (a new offer, a new applicant). Not when it
// first loads and not when it drops. Put the key and the class on the count's element.
export function useBump(count: number | undefined) {
  const [seen, setSeen] = useState(count);
  const [bumps, setBumps] = useState(0);
  if (count !== seen) {
    setSeen(count);
    if (seen !== undefined && count !== undefined && count > seen) setBumps(bumps + 1);
  }
  return { key: bumps, className: bumps ? "motion-safe:animate-bump" : "" };
}
