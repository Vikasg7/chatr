"use client";

import { useEffect, useState, useRef } from "react";
import { useMessageStore } from "@/stores/msg";
import { useAuthStore } from "@/stores/auth";
import * as api from "@/lib/api";
import * as WS from "@/lib/ws";
import * as format from "@/lib/format";
import { useRouter } from "next/navigation";

export default function ChatPage() {
  const router = useRouter();
  const { messages, addMsg, setMsgs } = useMessageStore();
  const [connected, setConnected] = useState(false);
  const [input, setInput] = useState("");

  const wsRef = useRef<WebSocket | null>(null);
  const { token, setToken, user } = useAuthStore();

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll on new message
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }

    loadInitialMessages();

    if (wsRef.current?.readyState === WebSocket.OPEN)
      return;
    
    setupWS(token);
    
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
      setConnected(false);
    }
  }, [token]);

  async function loadInitialMessages() {
    const data = await api.get("/messages");
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

  function logout() {
    setToken(null);
    router.push("/login");
  }

  function renderMsg(m: typeof messages[number]) {
    const mine = m.sender.id === user?.id;
    return (
      <div
        key={m.id}
        className={`mb-2 flex flex-col ${mine ? "items-end" : "items-start"}`}
      >
        <div
          className={`inline-block p-2 rounded-lg max-w-xs ${
            mine ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800"
          }`}
        >
          {!mine && (
            <div className="font-bold mb-1">{m.sender.name || m.sender.email}</div>
          )}
          <div>{m.text}</div>
          <div className="text-xs mt-1 text-gray-400 italic text-right">
            {format.time(m.createdAt)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="p-4 max-w-xl mx-auto">
      
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Chatr</h1>
        <div>
          <span
            className={`inline-block w-3 h-3 rounded-full mr-2 ${
              connected ? "bg-green-500" : "bg-red-500"
            }`}
          ></span>
          <button
            onClick={logout}
            className="bg-gray-300 text-gray-800 px-3 py-1 rounded"
          >
            Logout
          </button>
        </div>
      </div>
            
      <div ref={scrollRef} className="border h-96 overflow-y-auto mb-4 p-2">
        {messages.map(renderMsg)}
      </div>

      <div className="flex gap-2 mt-3">
        <input
          className="border p-3 flex-1 rounded-lg shadow focus:outline-blue-500"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button
          onClick={send}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg shadow"
        >
          Send
        </button>
      </div>
    </main>
  );
}
