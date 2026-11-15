import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

// Tabs remember the last choice in sessionStorage; every test starts without one.
afterEach(() => sessionStorage.clear());
