"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { inputClass, noticeClass } from "@/components/ui/form-classes";
import { BackIcon, SendIcon } from "@/features/shell/icons";
import { useMyTeam, type MyTeam } from "@/features/teams/queries";
import { useTeamMessages, type ChatMessage } from "./queries";
import { useTeamSocket } from "./use-team-socket";

export function TeamChat({ teamId, userId }: { teamId: number; userId: number }) {
  const team = useMyTeam();

  if (team.isPending) {
    return <p className="p-4 text-muted">Loading your team…</p>;
  }
  if (team.isError) {
    return (
      <p role="alert" className="p-4 text-pass">
        Couldn&apos;t load your team. Refresh the page to try again.
      </p>
    );
  }
  // Only my own team's chat opens a socket. The server refuses anyone else too (BR-12).
  if (!team.data || team.data.id !== teamId) {
    return <NotOnTeam />;
  }
  return <ChatRoom team={team.data} userId={userId} />;
}

function NotOnTeam() {
  return (
    <div className="flex flex-col items-start gap-3 p-4">
      <p role="alert">You&apos;re not on this team.</p>
      <Link href="/teams" className={buttonClasses("secondary", "sm")}>
        Back to Teams
      </Link>
    </div>
  );
}

function ChatRoom({ team, userId }: { team: MyTeam; userId: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const history = useTeamMessages(team.id);
  const socket = useTeamSocket(team.id);
  const [draft, setDraft] = useState("");
  const log = useRef<HTMLDivElement>(null);

  // A message can be in both the history and the socket, so merge by id.
  const byId = new Map<number, ChatMessage>();
  for (const message of [...(history.data ?? []), ...socket.messages]) {
    byId.set(message.id, message);
  }
  const messages = [...byId.values()].sort((a, b) => a.id - b.id);
  const newest = messages.at(-1)?.id;

  // shortcut: always jumps to the newest message, even if you scrolled up to read.
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [newest]);

  const closed = socket.status.state === "closed" ? socket.status.code : null;
  useEffect(() => {
    if (closed === 4401) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [closed, pathname, router]);

  if (closed === 4404) {
    return <NotOnTeam />;
  }

  const open = socket.status.state === "open";
  const title = team.project.title;
  // "2026-10-24T18:00:00Z" -> "Oct 24", in the viewer's own time zone.
  const formed = new Date(team.formed_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  function submit() {
    const body = draft.trim();
    if (!body || !open) return;
    socket.send(body);
    setDraft("");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-2 border-b border-border bg-surface p-2">
        <Link
          href="/teams"
          aria-label="Back to Teams"
          className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-surface-2"
        >
          <BackIcon />
        </Link>
        <div className="min-w-0 flex-1 text-center">
          <h1 className="truncate font-bold">{title}</h1>
          <p className="text-xs text-muted">{team.members.length} members</p>
        </div>
        {/* same width as the back link, so the title sits in the middle */}
        <span aria-hidden="true" className="size-11 shrink-0" />
      </header>

      {closed !== null && closed !== 4401 && (
        <p role="alert" className={`${noticeClass} mx-4 mt-4`}>
          Disconnected. Refresh to try again.
        </p>
      )}

      <div
        ref={log}
        role="log"
        aria-live="polite"
        aria-label="Messages"
        tabIndex={0}
        className="flex flex-1 flex-col gap-3 overflow-y-auto p-4"
      >
        <p className="mt-auto text-center text-xs text-muted">
          Team formed {formed}. Say hi!
        </p>
        {history.isError && (
          <p role="alert" className="text-center text-sm text-pass">
            Couldn&apos;t load earlier messages.
          </p>
        )}
        <ol className="flex flex-col gap-3">
          {messages.map((message) =>
            message.sender.id === userId ? (
              <li
                key={message.id}
                className="max-w-[80%] self-end rounded-row bg-cta px-3 py-2 text-sm whitespace-pre-wrap wrap-break-word text-on-cta"
              >
                <span className="sr-only">You: </span>
                {message.body}
              </li>
            ) : (
              <li key={message.id} className="flex max-w-[80%] flex-col items-start gap-1 self-start">
                <span className="text-xs text-muted">
                  {message.sender.display_name || "Unnamed member"}
                </span>
                <p className="rounded-row bg-surface-2 px-3 py-2 text-sm whitespace-pre-wrap wrap-break-word">
                  {message.body}
                </p>
              </li>
            ),
          )}
        </ol>
      </div>

      {socket.error && (
        <p role="alert" className="px-4 pb-2 text-sm text-pass">
          {socket.error}
        </p>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="flex items-end gap-2 border-t border-border bg-surface p-3"
      >
        <label className="min-w-0 flex-1">
          <span className="sr-only">Message {title}</span>
          <textarea
            rows={1}
            maxLength={2000}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              // Enter sends, Shift+Enter is a new line. Not while an IME is composing a word.
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                submit();
              }
            }}
            placeholder={`Message ${title}`}
            className={`${inputClass} block max-h-32 resize-none field-sizing-content`}
          />
        </label>
        <button
          type="submit"
          aria-label="Send"
          disabled={!open}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-cta text-on-cta transition duration-fast hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <SendIcon />
        </button>
      </form>
    </div>
  );
}
