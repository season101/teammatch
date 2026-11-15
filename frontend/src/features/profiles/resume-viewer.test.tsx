import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  return render(
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
  vi.restoreAllMocks();
});

// Gives the column a width, so pages draw: jsdom lays nothing out.
function withWidth() {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      changed: () => void;
      constructor(changed: () => void) {
        this.changed = changed;
      }
      observe() {
        this.changed();
      }
      disconnect() {}
    },
  );
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(632);
}

// Like PDF.js, cancelling a draw rejects its promise.
function cancellableDraw() {
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((_, no) => (reject = no));
  return { promise, cancel: vi.fn(() => reject(new Error("Rendering cancelled"))) };
}

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

test.each([
  ["load", () => FAKE_PDF.getPage.mockRejectedValueOnce(new Error("Bad page"))],
  [
    "draw",
    () =>
      render_.mockImplementationOnce(() => ({
        promise: Promise.reject(new Error("Bad image")),
        cancel: vi.fn(),
      })),
  ],
])("a page that fails to %s shows Download instead of a blank page", async (_, fail) => {
  withWidth();
  mockApi({ status: 200, body: "%PDF-1.7" });
  pdf.openPdf.mockResolvedValue(FAKE_PDF);
  fail();
  renderViewer();

  expect(await screen.findByRole("heading", { name: "This file won't display here" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Download instead" })).toBeInTheDocument();
});

test("a draw cancelled by a newer zoom isn't a failure", async () => {
  withWidth();
  mockApi({ status: 200, body: "%PDF-1.7" });
  pdf.openPdf.mockResolvedValue(FAKE_PDF);
  render_.mockImplementationOnce(cancellableDraw).mockImplementationOnce(cancellableDraw);
  renderViewer();
  await waitFor(() => expect(render_).toHaveBeenCalledTimes(2));

  fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));

  await waitFor(() => expect(render_).toHaveBeenCalledTimes(4));
  expect(screen.getAllByRole("img", { name: /^Page \d of 2$/ })).toHaveLength(2);
  expect(screen.queryByRole("heading", { name: "This file won't display here" })).not.toBeInTheDocument();
});

test("a resume that finishes opening after leaving is destroyed", async () => {
  mockApi({ status: 200, body: "%PDF-1.7" });
  let open!: (doc: typeof FAKE_PDF) => void;
  pdf.openPdf.mockReturnValue(new Promise((resolve) => (open = resolve)));
  const { unmount } = renderViewer();
  await waitFor(() => expect(pdf.openPdf).toHaveBeenCalled());

  unmount();
  open(FAKE_PDF);

  await waitFor(() => expect(FAKE_PDF.loadingTask.destroy).toHaveBeenCalledTimes(1));
});

test("Back returns to the app page it was opened from, never to another site", async () => {
  mockApi({ status: 403 });
  renderViewer();
  const back = await screen.findByRole("button", { name: /Back/ });

  // Came from another site's link: history.length counts its pages, but none are ours.
  window.history.pushState({}, "", "/elsewhere");
  vi.stubGlobal("navigation", { canGoBack: false });
  fireEvent.click(back);
  expect(nav.push).toHaveBeenCalledWith("/applicants");
  expect(nav.back).not.toHaveBeenCalled();

  // Browsers without the Navigation API go to Review too.
  vi.stubGlobal("navigation", undefined);
  fireEvent.click(back);
  expect(nav.push).toHaveBeenCalledTimes(2);

  // Opened from Review or Profile in this tab: back to that applicant or tab.
  vi.stubGlobal("navigation", { canGoBack: true });
  fireEvent.click(back);
  expect(nav.back).toHaveBeenCalledTimes(1);
});
