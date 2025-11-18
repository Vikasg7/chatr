"use client";

import { useEffect, useState, useRef } from "react";
import { useMessageStore } from "@/stores/msg";
import { useAuthStore } from "@/stores/auth";
import * as api from "@/lib/api";
import * as WS from "@/lib/ws";
import { useRouter } from "next/navigation";

export default function ChatPage() {
  const router = useRouter();
  const { messages, addMsg, setMsgs } = useMessageStore();
  const [connected, setConnected] = useState(false);
  const [input, setInput] = useState("");

  const wsRef = useRef<WebSocket | null>(null);
  const { token, setToken} = useAuthStore();

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
            
      <div className="border h-96 overflow-y-auto mb-4 p-2">
        {messages.map((msg) => (
          <div key={msg.id} className="mb-2">
            <div className="text-sm text-gray-600">
              {msg.sender.name || msg.sender.email} -{" "}
              {new Date(msg.createdAt).toLocaleTimeString()}
            </div>
            <div>{msg.text}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          className="border p-2 flex-grow"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
        />
        <button
          onClick={send}
          className="bg-blue-600 text-white p-2 rounded"
        >
          Send
        </button>
      </div>
    </main>
  );
}
