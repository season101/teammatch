import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { ResumeViewer } from "./resume-viewer";

const nav = vi.hoisted(() => ({ back: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => nav }));

// PDF.js itself is a browser-only, lazily loaded module; the viewer's use of it is faked.
const pdf = vi.hoisted(() => ({ openPdf: vi.fn() }));
vi.mock("./open-pdf", () => pdf);

const render_ = vi.fn(() => ({ promise: Promise.resolve(), cancel: vi.fn() }));
const FAKE_PDF = {
  numPages: 2,
  loadingTask: { destroy: vi.fn() },
  getPage: vi.fn(async () => ({
    getViewport: ({ scale }: { scale: number }) => ({ width: 600 * scale, height: 800 * scale }),
    render: render_,
  })),
};

// The resume answers with `resume`; the profile with Sam's name.
function mockApi(resume: { status: number; body?: BodyInit }) {
  const urls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: Request | string) => {
      const url = typeof input === "string" ? input : input.url;
      urls.push(url);
      if (url.includes("/resume/")) return new Response(resume.body ?? "{}", { status: resume.status });
      const body = url.includes("/me/profile/") ? { id: 99 } : { id: 3, display_name: "Sam Rivera" };
      return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
    }),
  );
  return urls;
}

function renderViewer() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ResumeViewer profileId={3} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  // jsdom has neither; the viewer only needs them to exist.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

test("draws each page in one column with a page count, zoom and Download", async () => {
  mockApi({ status: 200, body: "%PDF-1.7" });
  pdf.openPdf.mockResolvedValue(FAKE_PDF);
  renderViewer();

  expect(await screen.findByRole("heading", { name: "Sam Rivera's resume" })).toBeInTheDocument();
  expect(await screen.findByRole("status")).toHaveTextContent("1 of 2");
  expect(screen.getAllByRole("img", { name: /^Page \d of 2$/ })).toHaveLength(2);
  expect(pdf.openPdf).toHaveBeenCalledTimes(1);

  expect(screen.getByText("100%")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
  expect(screen.getByText("125%")).toBeInTheDocument();
  for (let i = 0; i < 5; i++) fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
  expect(screen.getByText("50%")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Zoom out" })).toBeDisabled();

  expect(screen.getByRole("link", { name: "Download" })).toHaveAttribute(
    "href",
    "/api/v1/profiles/3/resume/?download=1",
  );
});

test.each([403, 404])("a %i shows You can't open this resume, and PDF.js never runs", async (status) => {
  mockApi({ status });
  renderViewer();

  expect(await screen.findByRole("heading", { name: "You can't open this resume" })).toBeInTheDocument();
  expect(await screen.findByText("Only owners of projects Sam applied to can read it.")).toBeInTheDocument();
  expect(pdf.openPdf).not.toHaveBeenCalled();
  expect(screen.queryByRole("link", { name: /Download/ })).not.toBeInTheDocument();
});

test("a file PDF.js can't read shows Download instead, still through the permission check", async () => {
  mockApi({ status: 200, body: "%PDF-broken" });
  pdf.openPdf.mockRejectedValue(new Error("Invalid PDF structure."));
  renderViewer();

  expect(await screen.findByRole("heading", { name: "This file won't display here" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Download instead" })).toHaveAttribute(
    "href",
    "/api/v1/profiles/3/resume/?download=1",
  );
});

test("Back returns to where the viewer was opened from", async () => {
  mockApi({ status: 403 });
  renderViewer();

  fireEvent.click(await screen.findByRole("button", { name: /Back/ }));
  // jsdom starts with one history entry, so there's nothing to go back to: go to Review.
  expect(nav.push).toHaveBeenCalledWith("/applicants");

  window.history.pushState({}, "", "/applicants");
  fireEvent.click(screen.getByRole("button", { name: /Back/ }));
  expect(nav.back).toHaveBeenCalled();
});
