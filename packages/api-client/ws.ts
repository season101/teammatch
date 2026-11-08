// Hand-written to match the WebSocket section of docs/architecture/api.md.
// Change both in the same PR.

export type WsFrame<T extends string, D> = { type: T; data: D };

export type ChatSend = WsFrame<"chat.send", { body: string; client_id: string }>;
export type Ping = WsFrame<"ping", Record<string, never>>;
export type ClientFrame = ChatSend | Ping;

export type ChatMessageEvent = WsFrame<
  "chat.message",
  {
    id: number;
    team: number;
    sender: { id: number; display_name: string };
    body: string;
    created_at: string;
    client_id: string | null;
  }
>;
export type ChatError = WsFrame<
  "chat.error",
  { code: string; message: string; client_id: string | null }
>;
export type Pong = WsFrame<"pong", Record<string, never>>;
export type ServerFrame = ChatMessageEvent | ChatError | Pong;

export type WsCloseCode =
  | 4401 // not logged in
  | 4404; // team not found or not a member
