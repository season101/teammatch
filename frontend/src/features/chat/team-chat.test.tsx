import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ServerFrame } from "@teammatch/api-client";
import { afterEach, beforeEach, vi } from "vitest";
import TeamChatPage from "@/app/(app)/teams/[id]/chat/page";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "3" }),
  usePathname: () => "/teams/3/chat",
  useRouter: () => ({ replace }),
}));

// Stands in for the browser's WebSocket. Tests fire open, message and close by hand.
class FakeSocket {
  static all: FakeSocket[] = [];
  sent: unknown[] = [];
  closed = false;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;

  constructor(public url: string) {
    FakeSocket.all.push(this);
  }
  send(data: string) {
    this.sent.push(JSON.parse(data));
  }
  close() {
    this.closed = true;
  }
  open() {
    act(() => this.onopen?.());
  }
  receive(frame: ServerFrame) {
    act(() => this.onmessage?.({ data: JSON.stringify(frame) }));
  }
  drop(code: number) {
    act(() => this.onclose?.({ code }));
  }
}

const socket = () => FakeSocket.all.at(-1)!;

const team = {
  id: 3,
  project: { id: 4, title: "Bulldog Bites" },
  term: { name: "Fall 2026", end_date: "2026-12-12" },
  members: [
    { display_name: "Marco", role: "Owner" },
    { display_name: "Ava", role: "Backend developer" },
    { display_name: "Sam", role: "Mobile developer" },
    { display_name: "Jordan", role: "UI designer" },
  ],
  formed_at: "2026-10-24T18:00:00Z",
  seen_at: null,
};

const marco = { id: 7, display_name: "Marco" };
const ava = { id: 8, display_name: "Ava" };
const me = { id: 1, display_name: "Sam" };

function message(id: number, sender: typeof me, body: string) {
  return { id, team: 3, sender, body, created_at: "2026-10-30T18:00:00Z" };
}

// The API sends history newest first.
const history = [
  message(2, ava, "Works for me."),
  message(1, marco, "Welcome, all. Kickoff Thursday?"),
];

function page(results: unknown[], next: string | null = null, status = 200) {
  return new Response(JSON.stringify({ next, previous: null, results }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// A plain load gets the history. A catch-up (?after=) gets whatever `missed` returns.
let missed: (url: URL) => Response;
const fetchMock = vi.fn<(request: Request) => Promise<Response>>(async (request) => {
  const url = new URL(request.url);
  return url.searchParams.has("after") ? missed(url) : page(history);
});
const catchUps = () =>
  fetchMock.mock.calls
    .map(([request]) => new URL(request.url))
    .filter((url) => url.searchParams.has("after"))
    .map((url) => url.search);

beforeEach(() => {
  missed = () => page([]);
  FakeSocket.all = [];
  vi.stubGlobal("WebSocket", FakeSocket);
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function renderChat() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  client.setQueryData(["session"], { id: me.id, email: "sam@latech.edu" });
  client.setQueryData(["my-team"], team);
  return render(
    <QueryClientProvider client={client}>
      <TeamChatPage />
    </QueryClientProvider>,
  );
}

const bubbles = () => screen.getAllByRole("listitem").map((item) => item.textContent);
const box = () => screen.getByRole("textbox", { name: "Message Bulldog Bites" });

test("connects to the team's socket on open and closes it on leave", () => {
  const { unmount } = renderChat();

  expect(FakeSocket.all).toHaveLength(1);
  expect(socket().url).toBe(`ws://${location.host}/ws/teams/3/`);
  unmount();
  expect(socket().closed).toBe(true);
});

test("shows the header, the formed line and history oldest first", async () => {
  renderChat();

  expect(screen.getByRole("heading", { name: "Bulldog Bites" })).toBeInTheDocument();
  expect(screen.getByText("4 members")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Back to Teams" })).toHaveAttribute("href", "/teams");
  expect(screen.getByText("Team formed Oct 24. Say hi!")).toBeInTheDocument();
  expect(await screen.findByText("Works for me.")).toBeInTheDocument();
  expect(bubbles()).toEqual(["MarcoWelcome, all. Kickoff Thursday?", "AvaWorks for me."]);
  expect(new URL(fetchMock.mock.calls[0][0].url).pathname).toBe("/api/v1/teams/3/messages/");
});

test("a new message shows up once, even if history already has it", async () => {
  renderChat();
  await screen.findByText("Works for me.");
  socket().open();

  socket().receive({ type: "chat.message", data: { ...history[0], client_id: null } });
  socket().receive({
    type: "chat.message",
    data: { ...message(3, me, "I'll start the map screen tonight."), client_id: "abc" },
  });

  expect(screen.getByRole("log")).toHaveAttribute("aria-live", "polite");
  expect(bubbles()).toEqual([
    "MarcoWelcome, all. Kickoff Thursday?",
    "AvaWorks for me.",
    "You: I'll start the map screen tonight.",
  ]);
  // mine sits on the right with no name; others show who sent it
  expect(screen.getAllByRole("listitem")[2]).toHaveClass("self-end");
  expect(screen.getAllByRole("listitem")[1]).toHaveClass("self-start");
});

test("Enter sends the message and clears the box", () => {
  renderChat();
  expect(box()).toHaveAttribute("maxLength", "2000");
  socket().open();

  fireEvent.change(box(), { target: { value: "  Sounds good  " } });
  fireEvent.keyDown(box(), { key: "Enter" });

  expect(socket().sent).toEqual([
    { type: "chat.send", data: { body: "Sounds good", client_id: expect.any(String) } },
  ]);
  expect(box()).toHaveValue("");
});

test("Shift+Enter and blank messages don't send", () => {
  renderChat();
  socket().open();

  fireEvent.change(box(), { target: { value: "line one" } });
  fireEvent.keyDown(box(), { key: "Enter", shiftKey: true });
  fireEvent.change(box(), { target: { value: "   \n  " } });
  fireEvent.keyDown(box(), { key: "Enter" });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));

  expect(socket().sent).toEqual([]);
});

test("Send stays off until the socket opens", () => {
  renderChat();
  fireEvent.change(box(), { target: { value: "hi" } });

  expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  fireEvent.keyDown(box(), { key: "Enter" });
  expect(socket().sent).toEqual([]);
  expect(box()).toHaveValue("hi");

  socket().open();
  expect(screen.getByRole("button", { name: "Send" })).toBeEnabled();
});

test("a chat.error shows as an alert", () => {
  renderChat();
  socket().open();

  socket().receive({
    type: "chat.error",
    data: { code: "throttled", message: "Slow down a little.", client_id: null },
  });

  expect(screen.getByRole("alert")).toHaveTextContent("Slow down a little.");
});

// The server accepts first, then closes, so the socket opens before the 4404.
test("a 4404 close says I'm not on the team and hides the send box", () => {
  renderChat();
  socket().open();
  socket().drop(4404);

  expect(screen.getByRole("alert")).toHaveTextContent("You're not on this team.");
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Send" })).not.toBeInTheDocument();
});

test("a 4401 close sends me to sign in", () => {
  renderChat();
  socket().drop(4401);

  expect(replace).toHaveBeenCalledWith("/login?next=%2Fteams%2F3%2Fchat");
});

const receive = (data: ReturnType<typeof message>) =>
  socket().receive({ type: "chat.message", data: { ...data, client_id: null } });

// Moves the fake clock and lets the fetches it started finish.
const wait = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

// The next socket opens after exactly `ms`, not before.
async function expectRetryAfter(ms: number) {
  const count = FakeSocket.all.length;
  await wait(ms - 1);
  expect(FakeSocket.all).toHaveLength(count);
  await wait(1);
  expect(FakeSocket.all).toHaveLength(count + 1);
}

test("a dropped socket shows Reconnecting, then reconnects after 1 s", async () => {
  vi.useFakeTimers();
  renderChat();
  socket().open();
  socket().drop(1006);

  expect(screen.getByRole("status")).toHaveTextContent(
    "Reconnecting… New messages will load when you're back.",
  );
  expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  await expectRetryAfter(1000);
  expect(socket().url).toBe(`ws://${location.host}/ws/teams/3/`);

  socket().open();
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Send" })).toBeEnabled();
});

test("retries back off 1, 2, 4 ... 30 s and start over after a good open", async () => {
  vi.useFakeTimers();
  renderChat();

  for (const ms of [1000, 2000, 4000, 8000, 16000, 30000, 30000]) {
    socket().drop(1006);
    await expectRetryAfter(ms);
  }
  socket().open();
  socket().drop(1006);
  await expectRetryAfter(1000);
});

test("each open catches up on missed messages, once each", async () => {
  vi.useFakeTimers();
  renderChat();
  await wait(0);
  socket().open();
  await wait(0);
  receive(message(3, me, "On my way."));
  socket().drop(1006);

  // 4 and 5 came in while we were away, 5 and 6 arrive live right after the reopen
  missed = (url) =>
    url.searchParams.has("cursor")
      ? page([message(4, marco, "Room 120.")])
      : page(
          [message(6, ava, "See you."), message(5, marco, "Bring laptops.")],
          `${url.href}&cursor=p2`,
        );
  await wait(1000);
  socket().open();
  receive(message(5, marco, "Bring laptops."));
  await wait(0);
  receive(message(6, ava, "See you."));

  expect(catchUps()).toEqual(["?after=2", "?after=3", "?after=3&cursor=p2"]);
  expect(bubbles()).toEqual([
    "MarcoWelcome, all. Kickoff Thursday?",
    "AvaWorks for me.",
    "You: On my way.",
    "MarcoRoom 120.",
    "MarcoBring laptops.",
    "AvaSee you.",
  ]);
});

test("with no messages yet, the first open still catches up with after=0", async () => {
  vi.useFakeTimers();
  fetchMock.mockImplementationOnce(async () => page([]));
  missed = () => page([message(1, ava, "First!")]);
  renderChat();
  await wait(0);
  socket().open();
  receive(message(1, ava, "First!"));
  await wait(0);

  expect(catchUps()).toEqual(["?after=0"]);
  expect(bubbles()).toEqual(["AvaFirst!"]);
});

test.each([4401, 4404])("a %i close never retries", async (code) => {
  vi.useFakeTimers();
  renderChat();
  socket().open();
  socket().drop(code);

  await wait(60_000);
  expect(FakeSocket.all).toHaveLength(1);
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

test("leaving while a retry is pending opens no new socket", async () => {
  vi.useFakeTimers();
  const { unmount } = renderChat();
  socket().drop(1006);
  unmount();

  await wait(60_000);
  expect(FakeSocket.all).toHaveLength(1);
});

test("a failed catch-up shows an alert and the chat keeps working", async () => {
  vi.useFakeTimers();
  missed = () => page([], null, 500);
  renderChat();
  socket().open();
  await wait(0);

  expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load missed messages.");
  receive(message(3, ava, "Still here?"));
  expect(bubbles().at(-1)).toBe("AvaStill here?");
  fireEvent.change(box(), { target: { value: "Yes" } });
  fireEvent.keyDown(box(), { key: "Enter" });
  expect(socket().sent).toHaveLength(1);
});

test("the draft survives a reconnect", async () => {
  vi.useFakeTimers();
  renderChat();
  socket().open();
  fireEvent.change(box(), { target: { value: "half a thought" } });
  socket().drop(1006);

  fireEvent.keyDown(box(), { key: "Enter" });
  expect(box()).toHaveValue("half a thought");
  await wait(1000);
  socket().open();
  fireEvent.keyDown(box(), { key: "Enter" });

  expect(socket().sent).toEqual([
    { type: "chat.send", data: { body: "half a thought", client_id: expect.any(String) } },
  ]);
});
