import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import type { MyProfile } from "./queries";
import { ResumeField } from "./resume-field";

const PROFILE: MyProfile = {
  id: 7,
  display_name: "Sam Rivera",
  bio: "",
  major: "",
  skills: [],
  avatar_url: null,
  github_url: "",
  linkedin_url: "",
  has_resume: false,
  resume_name: "",
  email: "sam@latech.edu",
  role: "student",
  rules_accepted_at: null,
};
const ADDED = { ...PROFILE, has_resume: true, resume_name: "sam-resume.pdf" };

function mockApi(...replies: { status: number; body: unknown }[]) {
  const requests: Request[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (request: Request) => {
      requests.push(request);
      const { status, body } = replies.shift() ?? { status: 500, body: {} };
      return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  return requests;
}

function renderField(profile: MyProfile) {
  const client = new QueryClient();
  client.setQueryData(["my-profile"], { ...profile, bio: "Saved elsewhere" });
  render(
    <QueryClientProvider client={client}>
      <ResumeField profile={profile} />
    </QueryClientProvider>,
  );
  return client;
}

const pick = (file: File) =>
  fireEvent.change(screen.getByLabelText("Resume file"), {
    target: { files: [file] },
  });
const pdf = (size = 10) =>
  new File([new Uint8Array(size)], "sam-resume.pdf", { type: "application/pdf" });

afterEach(() => vi.unstubAllGlobals());

test("an empty resume offers Add your resume, and a pick uploads it with PUT", async () => {
  const requests = mockApi({ status: 200, body: ADDED });
  const client = renderField(PROFILE);

  expect(screen.getByRole("button", { name: /Add your resume/ })).toHaveTextContent(
    "PDF, up to 5 MB.",
  );
  pick(pdf());

  expect(await screen.findByRole("status")).toHaveTextContent("Resume added.");
  expect(requests[0].method).toBe("PUT");
  expect(requests[0].url).toMatch(/\/api\/v1\/me\/profile\/resume\/$/);
  expect(await requests[0].text()).toContain('form-data; name="resume"');
  // Only the resume fields change in the cache; the rest stays as it was.
  expect(client.getQueryData(["my-profile"])).toMatchObject({
    has_resume: true,
    resume_name: "sam-resume.pdf",
    bio: "Saved elsewhere",
  });
});

test.each([
  ["over 5 MB", pdf(5 * 1024 * 1024 + 1), "That file is over 5 MB. Choose a smaller PDF."],
  ["a Word file", new File(["doc"], "cv.docx", { type: "application/msword" }), "Only PDF files can be uploaded."],
])("%s is refused before anything is sent", (_, file, message) => {
  const requests = mockApi();
  renderField(PROFILE);

  pick(file);

  expect(screen.getByRole("alert")).toHaveTextContent(message);
  expect(requests).toHaveLength(0);
});

test("a PDF the browser labels octet-stream is sent for the server to check", async () => {
  const requests = mockApi({ status: 200, body: ADDED });
  renderField(PROFILE);

  pick(new File([new Uint8Array(10)], "sam-resume.pdf", { type: "application/octet-stream" }));

  expect(await screen.findByRole("status")).toHaveTextContent("Resume added.");
  expect(requests).toHaveLength(1);
});

test("the server's resume_not_pdf message shows", async () => {
  mockApi({
    status: 400,
    body: { detail: "Only PDF files can be uploaded.", code: "resume_not_pdf" },
  });
  renderField(PROFILE);

  pick(pdf());

  expect(await screen.findByRole("alert")).toHaveTextContent("Only PDF files can be uploaded.");
});

test("an added resume shows its name, who can open it, Replace and Remove", async () => {
  const requests = mockApi({ status: 200, body: PROFILE });
  renderField(ADDED);

  const card = screen.getByRole("link", { name: /sam-resume\.pdf/ });
  expect(card).toHaveAttribute("href", "/profiles/7/resume");
  expect(card).not.toHaveAttribute("target"); // the in-app viewer, not a new tab
  expect(card).toHaveTextContent("Only owners you apply to can open it.");
  expect(screen.getByRole("button", { name: "Replace" })).toBeEnabled();

  fireEvent.click(screen.getByRole("button", { name: "Remove" }));

  expect(await screen.findByRole("status")).toHaveTextContent("Resume removed.");
  expect(requests[0].method).toBe("DELETE");
});
