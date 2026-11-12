import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, vi } from "vitest";
import { nextStep, ProfileStep, RulesStep, SkillsStep } from "./welcome";

const nav = vi.hoisted(() => ({ replace: vi.fn(), pathname: "/welcome/rules" }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: nav.replace }),
  usePathname: () => nav.pathname,
}));

const SKILLS = [
  { id: 1, name: "Django", slug: "django" },
  { id: 2, name: "Python", slug: "python" },
];

// A brand new account: nothing agreed, nothing filled in.
const NEW = {
  id: 7,
  display_name: "",
  bio: "",
  major: "",
  skills: [] as typeof SKILLS,
  email: "sam@latech.edu",
  rules_accepted_at: null as string | null,
};
const AGREED = { ...NEW, rules_accepted_at: "2026-11-11T10:00:00Z" };
const NAMED = { ...AGREED, display_name: "Sam", major: "Computer Science" };
const DONE = { ...NAMED, skills: [SKILLS[1]] };

// A small fake of the API. Writes reply with `writeStatus`, and a PATCH that
// works saves into the profile the way the server does.
function mockApi(profile: typeof NEW, { signedIn = true, writeStatus = 200 } = {}) {
  const writes: { path: string; body: unknown }[] = [];
  let saved = profile;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: Request | string) => {
      const json = (body: unknown, status = 200) =>
        new Response(JSON.stringify(body), {
          status,
          headers: { "Content-Type": "application/json" },
        });
      // allauth is called with a plain address, the API client with a Request.
      if (typeof input === "string") {
        return signedIn
          ? json({ status: 200, data: { user: { id: 1, email: NEW.email } } })
          : json({ status: 401 }, 401);
      }
      const path = new URL(input.url).pathname;
      if (input.method === "GET") {
        return json(path === "/api/v1/skills/" ? SKILLS : saved);
      }
      const body = input.method === "PATCH" ? await input.json() : null;
      writes.push({ path, body });
      if (writeStatus !== 200) return json({}, writeStatus);
      if (!body) return new Response(null, { status: 204 });
      const { skill_ids, ...fields } = body;
      saved = { ...saved, ...fields };
      if (skill_ids)
        saved.skills = SKILLS.filter((skill) => skill_ids.includes(skill.id));
      return json(saved);
    }),
  );
  return writes;
}

function renderStep(step: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(<QueryClientProvider client={client}>{step}</QueryClientProvider>);
  return client;
}

afterEach(() => {
  vi.unstubAllGlobals();
  nav.replace.mockReset();
});

test.each([
  ["nothing agreed", NEW, "/welcome/rules"],
  ["agreed, no name or major", AGREED, "/welcome/profile"],
  ["a name but no major", { ...NAMED, major: " " }, "/welcome/profile"],
  ["name and major, no skills", NAMED, "/welcome/skills"],
  ["everything", DONE, "/feed"],
  // The rules come first even when the rest is filled in (accounts from before DD-47).
  ["an older account", { ...DONE, rules_accepted_at: null }, "/welcome/rules"],
])("with %s, setup continues at %s", (_, profile, path) => {
  expect(nextStep(profile)).toBe(path);
});

test("Team rules lists the four rules, and I agree moves on to step 2", async () => {
  const writes = mockApi(NEW);
  const client = renderStep(<RulesStep />);

  expect(
    await screen.findByRole("heading", { name: "Team rules" }),
  ).toBeVisible();
  expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();
  expect(screen.getAllByRole("listitem").map((row) => row.textContent)).toEqual(
    [
      "1Be honest about your skills.",
      "2Show up.",
      "3Respect people's time.",
      "4Speak up early.",
    ],
  );
  expect(nav.replace).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "I agree" }));

  await waitFor(() =>
    expect(nav.replace).toHaveBeenCalledWith("/welcome/profile"),
  );
  expect(writes).toEqual([{ path: "/api/v1/me/rules/accept/", body: null }]);
  expect(
    client.getQueryData<typeof NEW>(["my-profile"])?.rules_accepted_at,
  ).toEqual(expect.any(String));
});

test("an older account with a full profile goes from I agree to the deck", async () => {
  mockApi({ ...DONE, rules_accepted_at: null });
  renderStep(<RulesStep />);

  fireEvent.click(await screen.findByRole("button", { name: "I agree" }));
  await waitFor(() => expect(nav.replace).toHaveBeenCalledWith("/feed"));
});

test("when I agree fails, it says so and stays on the rules", async () => {
  mockApi(NEW, { writeStatus: 500 });
  renderStep(<RulesStep />);

  fireEvent.click(await screen.findByRole("button", { name: "I agree" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Couldn't save that",
  );
  expect(screen.getByRole("button", { name: "I agree" })).toBeEnabled();
  expect(nav.replace).not.toHaveBeenCalled();
});

test.each([
  ["Team rules", <RulesStep key="r" />, AGREED, "/welcome/profile"],
  ["Team rules", <RulesStep key="r" />, DONE, "/feed"],
  ["Confirm your info", <ProfileStep key="p" />, NEW, "/welcome/rules"],
  ["Confirm your info", <ProfileStep key="p" />, NAMED, "/welcome/skills"],
  ["What can you do?", <SkillsStep key="s" />, AGREED, "/welcome/profile"],
  ["What can you do?", <SkillsStep key="s" />, DONE, "/feed"],
])("%s skips itself (case %#)", async (title, step, profile, path) => {
  mockApi(profile);
  renderStep(step);

  await waitFor(() => expect(nav.replace).toHaveBeenCalledWith(path));
  expect(screen.queryByRole("heading", { name: title })).toBeNull();
});

test("a signed-out visitor is sent to sign in", async () => {
  mockApi(NEW, { signedIn: false });
  renderStep(<RulesStep />);

  await waitFor(() =>
    expect(nav.replace).toHaveBeenCalledWith("/login?next=%2Fwelcome%2Frules"),
  );
  expect(screen.queryByRole("heading", { name: "Team rules" })).toBeNull();
});

test("Confirm your info needs a name and a major, then moves on to step 3", async () => {
  const writes = mockApi(AGREED);
  renderStep(<ProfileStep />);

  const name = await screen.findByLabelText("Name");
  const cta = screen.getByRole("button", { name: "Continue" });
  expect(screen.getByText("Step 2 of 4")).toBeInTheDocument();
  expect(name).toHaveAccessibleDescription(
    "Your name is shown to project owners.",
  );
  expect(screen.getByLabelText(/^Bio/)).toHaveAccessibleDescription(
    "You can add this later from your profile.",
  );
  expect(cta).toBeDisabled();

  fireEvent.change(name, { target: { value: " Sam Student " } });
  expect(cta).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Major"), { target: { value: "  " } });
  expect(cta).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Major"), {
    target: { value: "Computer Science" },
  });
  expect(cta).toBeEnabled();

  fireEvent.click(cta);

  await waitFor(() =>
    expect(nav.replace).toHaveBeenCalledWith("/welcome/skills"),
  );
  expect(writes).toEqual([
    {
      path: "/api/v1/me/profile/",
      body: { display_name: "Sam Student", major: "Computer Science", bio: "" },
    },
  ]);
});

test("Confirm your info starts from what's already saved", async () => {
  mockApi({ ...AGREED, display_name: "Sam Student" });
  renderStep(<ProfileStep />);

  expect(await screen.findByLabelText("Name")).toHaveValue("Sam Student");
  expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
});

test("the skills step counts picks, moves the meter, and saving opens the deck", async () => {
  const writes = mockApi(NAMED);
  renderStep(<SkillsStep />);

  const meter = await screen.findByRole("meter", { name: "Profile strength" });
  expect(screen.getByText("Step 3 of 4")).toBeInTheDocument();
  expect(meter).toHaveAttribute("aria-valuenow", "20");
  expect(
    screen.getByRole("button", { name: "Continue · 0 skills" }),
  ).toBeDisabled();

  fireEvent.click(screen.getByRole("button", { name: "+ Python" }));
  expect(meter).toHaveAttribute("aria-valuenow", "60");
  expect(
    screen.getByRole("button", { name: "Continue · 1 skill" }),
  ).toBeEnabled();

  fireEvent.click(screen.getByRole("button", { name: "+ Django" }));
  fireEvent.click(screen.getByRole("button", { name: "Remove Django" }));
  fireEvent.click(screen.getByRole("button", { name: "Continue · 1 skill" }));

  await waitFor(() => expect(nav.replace).toHaveBeenCalledWith("/feed"));
  expect(writes).toEqual([
    { path: "/api/v1/me/profile/", body: { skill_ids: [2] } },
  ]);
});
