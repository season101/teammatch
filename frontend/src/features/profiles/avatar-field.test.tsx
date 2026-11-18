import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { AvatarField } from "./avatar-field";
import type { MyProfile } from "./queries";

const PROFILE: MyProfile = {
  id: 7,
  display_name: "Sam Student",
  bio: "",
  major: "",
  skills: [],
  avatar_url: null,
  has_resume: false,
  resume_name: "",
  email: "sam@latech.edu",
  role: "student",
  rules_accepted_at: null,
};
const WITH_PHOTO = { ...PROFILE, avatar_url: "/api/v1/profiles/7/avatar/?v=abc" };

// Each request gets the next reply; the requests are kept to check.
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
  render(
    <QueryClientProvider client={client}>
      <AvatarField profile={profile} />
    </QueryClientProvider>,
  );
  return client;
}

const pick = (file: File) =>
  fireEvent.change(screen.getByLabelText("Photo file"), {
    target: { files: [file] },
  });

afterEach(() => vi.unstubAllGlobals());

test("picking a photo uploads it as multipart and updates my profile", async () => {
  const requests = mockApi({ status: 200, body: WITH_PHOTO });
  const client = renderField(PROFILE);

  expect(screen.getByRole("button", { name: "Upload a photo" })).toBeEnabled();
  pick(new File(["png"], "me.png", { type: "image/png" }));

  expect(await screen.findByRole("status")).toHaveTextContent("Photo updated.");
  expect(requests[0].method).toBe("POST");
  expect(requests[0].url).toMatch(/\/api\/v1\/me\/avatar\/$/);
  expect(requests[0].headers.get("content-type")).toMatch(/^multipart\/form-data; boundary=/);
  // jsdom's File loses its name on the way into Node's Request, so check the raw part.
  const body = await requests[0].text();
  expect(body).toContain('form-data; name="avatar"');
  expect(body).toContain("Content-Type: image/png");
  expect(client.getQueryData(["my-profile"])).toEqual(WITH_PHOTO);
});

test.each([
  ["a GIF", new File(["gif"], "a.gif", { type: "image/gif" })],
  ["over 2 MB", new File([new Uint8Array(2 * 1024 * 1024 + 1)], "big.png", { type: "image/png" })],
])("%s is refused before anything is sent", (_, file) => {
  const requests = mockApi();
  renderField(PROFILE);

  pick(file);

  expect(screen.getByRole("alert")).toHaveTextContent(
    "Choose a JPEG, PNG or WebP image of 2 MB or less.",
  );
  expect(requests).toHaveLength(0);
});

test("the server's invalid_avatar shows the same hint", async () => {
  mockApi({ status: 400, body: { detail: "x", code: "invalid_avatar" } });
  renderField(PROFILE);

  pick(new File(["not really"], "fake.png", { type: "image/png" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Choose a JPEG, PNG or WebP image of 2 MB or less.",
  );
});

test("Remove photo deletes it", async () => {
  const requests = mockApi({ status: 200, body: PROFILE });
  renderField(WITH_PHOTO);

  fireEvent.click(screen.getByRole("button", { name: "Remove photo" }));

  expect(await screen.findByRole("status")).toHaveTextContent("Photo removed.");
  expect(requests[0].method).toBe("DELETE");
});

test("a profile refetch that started before the upload can't bring back the old photo", async () => {
  mockApi({ status: 200, body: WITH_PHOTO });
  const client = renderField(PROFILE);
  let finishOldGet: (profile: MyProfile) => void = () => {};
  void client.prefetchQuery({
    queryKey: ["my-profile"],
    queryFn: () => new Promise<MyProfile>((resolve) => (finishOldGet = resolve)),
  });

  pick(new File(["png"], "me.png", { type: "image/png" }));
  expect(await screen.findByRole("status")).toHaveTextContent("Photo updated.");
  finishOldGet(PROFILE);
  await new Promise((resolve) => setTimeout(resolve, 20));

  expect(client.getQueryData<MyProfile>(["my-profile"])?.avatar_url).toBe(WITH_PHOTO.avatar_url);
});
