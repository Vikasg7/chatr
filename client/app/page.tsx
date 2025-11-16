"use client";

import { useEffect, useState, useRef } from "react";
import { useMessageStore } from "@/stores/msg";
import * as api from "@/lib/api";
import * as WS from "@/lib/ws";

export default function ChatPage() {
  const { messages, addMsg, setMsgs } = useMessageStore();
  const [token, setToken] = useState("");
  const [connected, setConnected] = useState(false);
  const [input, setInput] = useState("");

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const t = prompt("Enter your JWT token:");
    if (!t) return;
    setToken(t);

    loadInitialMessages(t);
    setupWS(t);
  }, []);

  async function loadInitialMessages(t: string) {
    const data = await api.get("/messages", t);
    setMsgs(data.messages);
  }

  function setupWS(t: string) {
    const ws = WS.create(t);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "message:new") {
        addMsg(data.message);
      }
    };

    ws.onclose = () => setConnected(false);
  }

  function send() {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN)
      return;

    ws.send(JSON.stringify({ type: "message:new", text: input }));
    setInput("");
  }

  return (
    <main className="p-4 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">
        ConverseSpace Chat {connected ? "🟢" : "🔴"}
      </h1>

      <div className="border p-3 rounded h-[400px] overflow-y-auto mb-4 bg-gray-50">
        {(messages ?? []).map((m) => (
          <div key={m.id} className="mb-2">
            <b>{m.sender.name || m.sender.email}:</b> {m.text}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          className="border p-2 flex-1"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Say something…"
        />
        <button
          onClick={send}
          className="bg-blue-600 text-white px-4 rounded"
        >
          Send
        </button>
      </div>
    </main>
  );
}
