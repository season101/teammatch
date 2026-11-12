import { act, fireEvent, render, screen } from "@testing-library/react";

// The caught prompt lives in the module, so each test loads a fresh copy.
async function renderInstall() {
  vi.resetModules();
  const { watchInstall } = await import("./install");
  const { InstallApp } = await import("./install-app");
  const stop = watchInstall();
  render(<InstallApp />);
  return stop;
}

function standalone(matches: boolean) {
  vi.stubGlobal("matchMedia", () => ({ matches }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test("shows an Install button once the browser offers a prompt, and opens it", async () => {
  const stop = await renderInstall();
  expect(screen.queryByRole("button", { name: "Install" })).not.toBeInTheDocument();

  const prompt = vi.fn().mockResolvedValue(undefined);
  act(() => {
    window.dispatchEvent(Object.assign(new Event("beforeinstallprompt"), { prompt }));
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Install" }));
  });

  expect(prompt).toHaveBeenCalledOnce();
  // The event is spent, so the button goes.
  expect(screen.queryByRole("button", { name: "Install" })).not.toBeInTheDocument();
  stop();
});

test("says Installed after the browser reports the install", async () => {
  const stop = await renderInstall();

  act(() => {
    window.dispatchEvent(new Event("appinstalled"));
  });

  expect(screen.getByText("Installed")).toBeInTheDocument();
  stop();
});

test("gives the Share steps on an iPhone, which has no prompt", async () => {
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
  );
  await renderInstall();

  expect(screen.getByText("In Safari, tap Share, then Add to Home Screen.")).toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

test("says Installed when it is already running from the home screen", async () => {
  standalone(true);
  await renderInstall();

  expect(screen.getByText("Installed")).toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

test("points other browsers at their own menu", async () => {
  standalone(false);
  await renderInstall();

  expect(screen.getByText(/browser's menu/)).toBeInTheDocument();
});
