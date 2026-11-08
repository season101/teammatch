import type { ChatMessageEvent, ChatSend, ServerFrame } from "@teammatch/api-client";
import { useCallback, useEffect, useRef, useState } from "react";

export type SocketStatus =
  | { state: "connecting" }
  | { state: "open" }
  | { state: "closed"; code: number };

// The team's chat socket (F4-08): its status, the messages that came in over it,
// and the last chat.error. Close codes are in ws.ts.
// shortcut: no reconnect yet; F4-09 adds backoff and a ?after= catch-up.
export function useTeamSocket(teamId: number) {
  const socket = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<SocketStatus>({ state: "connecting" });
  const [messages, setMessages] = useState<ChatMessageEvent["data"][]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const scheme = location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${scheme}//${location.host}/ws/teams/${teamId}/`);
    socket.current = ws;
    ws.onopen = () => setStatus({ state: "open" });
    ws.onclose = (event) => setStatus({ state: "closed", code: event.code });
    ws.onmessage = (event) => {
      const frame = JSON.parse(event.data) as ServerFrame;
      if (frame.type === "chat.message") setMessages((list) => [...list, frame.data]);
      if (frame.type === "chat.error") setError(frame.data.message);
    };
    return () => {
      ws.onclose = null;
      ws.close();
    };
  }, [teamId]);

  const send = useCallback((body: string) => {
    const frame: ChatSend = {
      type: "chat.send",
      data: { body, client_id: crypto.randomUUID() },
    };
    setError(null);
    socket.current?.send(JSON.stringify(frame));
  }, []);

  return { status, messages, error, send };
}
