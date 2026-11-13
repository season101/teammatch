import { useQueryClient } from "@tanstack/react-query";
import type { ChatSend, ServerFrame } from "@teammatch/api-client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { teamMessagesQuery, type ChatMessage } from "./queries";

export type SocketStatus =
  | { state: "connecting" }
  | { state: "open" }
  | { state: "reconnecting" }
  | { state: "closed"; code: number };

// A message I sent that the server hasn't echoed back yet.
export type Outgoing = { client_id: string; body: string; failed: boolean };

// The team's chat socket (F4-08, F4-09): its status, the messages that came in over it
// or in a catch-up after it opened, and the last error. Close codes are in ws.ts.
// Any other close retries after 1 s, 2 s, 4 s... up to 30 s.
export function useTeamSocket(teamId: number) {
  const queryClient = useQueryClient();
  const socket = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<SocketStatus>({ state: "connecting" });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Shown in the log at once, and dropped when the echo with the same client_id lands.
  const [sending, setSending] = useState<Outgoing[]>([]);

  useEffect(() => {
    const scheme = location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${scheme}//${location.host}/ws/teams/${teamId}/`;
    let ws: WebSocket;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let delay = 1000;
    let newest = 0;
    let live = true;

    function add(list: ChatMessage[]) {
      if (!live || !list.length) return;
      for (const message of list) newest = Math.max(newest, message.id);
      setMessages((all) => [...all, ...list]);
      // A catch-up message has no client_id, so a failed one of mine that did get
      // through is matched by its text.
      setSending((waiting) => {
        const left = [...waiting];
        for (const message of list) {
          const id = "client_id" in message ? message.client_id : null;
          const at = left.findIndex((out) =>
            id ? out.client_id === id : out.failed && out.body === message.body,
          );
          if (at >= 0) left.splice(at, 1);
        }
        return left.length === waiting.length ? waiting : left;
      });
    }

    // Everything after the newest message we have, page by page. Waits for the
    // history load, so a message sent before the first join isn't lost either.
    // With no messages yet it asks for after=0, which is just that gap.
    async function catchUp(seen: number) {
      const history = await queryClient.ensureQueryData(teamMessagesQuery(teamId));
      const after = Math.max(seen, history[0]?.id ?? 0);
      let cursor: string | undefined;
      do {
        const { data } = await api.GET("/api/v1/teams/{id}/messages/", {
          params: { path: { id: teamId }, query: { after, cursor } },
        });
        if (!data) throw new Error("catch-up failed");
        add(data.results);
        const next = data.next ? new URL(data.next).searchParams.get("cursor") : null;
        cursor = next ?? undefined;
      } while (cursor);
    }

    function connect() {
      ws = new WebSocket(url);
      socket.current = ws;
      ws.onopen = () => {
        delay = 1000;
        setStatus({ state: "open" });
        // read newest now, before live messages on this socket move it past the gap
        catchUp(newest).catch(() => {
          if (live) setError("Couldn't load missed messages. Refresh to see them.");
        });
      };
      ws.onclose = (event) => {
        if (event.code === 4401 || event.code === 4404) {
          setStatus({ state: "closed", code: event.code });
          return;
        }
        setStatus({ state: "reconnecting" });
        // No echo is coming on this socket. Keep the text so it can be sent again.
        setSending((waiting) => waiting.map((out) => ({ ...out, failed: true })));
        retry = setTimeout(connect, delay);
        delay = Math.min(delay * 2, 30_000);
      };
      ws.onmessage = (event) => {
        const frame = JSON.parse(event.data) as ServerFrame;
        if (frame.type === "chat.message") add([frame.data]);
        if (frame.type === "chat.error") {
          setError(frame.data.message);
          // An error without a client_id (throttled) could be about any of them.
          const id = frame.data.client_id;
          setSending((waiting) =>
            waiting.map((out) => (!id || out.client_id === id ? { ...out, failed: true } : out)),
          );
        }
      };
    }

    connect();
    return () => {
      live = false;
      clearTimeout(retry);
      ws.onclose = null;
      ws.close();
    };
  }, [queryClient, teamId]);

  // retry: the client_id of a failed message to send again in place.
  const send = useCallback((body: string, retry?: string) => {
    const frame: ChatSend = {
      type: "chat.send",
      data: { body, client_id: crypto.randomUUID() },
    };
    setError(null);
    setSending((waiting) => [
      ...waiting.filter((out) => out.client_id !== retry),
      { ...frame.data, failed: false },
    ]);
    socket.current?.send(JSON.stringify(frame));
  }, []);

  return { status, messages, error, send, sending };
}
