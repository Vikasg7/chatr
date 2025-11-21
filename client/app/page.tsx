"use client";

import { useEffect, useState, useRef } from "react";
import { useMessageStore } from "@/stores/msg";
import { useAuthStore } from "@/stores/auth";
import { useRoomStore } from "@/stores/room";
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
  const { token, setToken, user, hydrated } = useAuthStore();
  const { rooms, setRooms, currentRoomId, setCurrentRoom } = useRoomStore();

  const scrollRef = useRef<HTMLDivElement>(null);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!hydrated)
      return;
    if (token === null)
      return;
    setReady(true);
    loadRooms();
  }, [token]);

  useEffect(() => {
    // Auto-scroll on new message
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!hydrated)
      return;
    if (!token) {
      router.replace("/login");
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

  async function loadRooms() {
    const res = await api.get("/rooms");
    setRooms(res);

    if (!currentRoomId && res.length > 0) {
      setCurrentRoom(res[0].id);
      joinRoom(res[0].id);
    }
  }
    
  function joinRoom(roomId: number) {
    wsRef.current?.send(JSON.stringify({
      type: "room:join",
      roomId,
    }));
    loadRoomMessages(roomId);
  }

  async function loadRoomMessages(roomId: number) {
    const msgs = await api.get(`/rooms/${roomId}/messages`);
    setMsgs(msgs);
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

  // ❗ Important Fix: Avoid flashing “login page then chat”
  if (!ready)
    return null;

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

      <div className="flex h-screen">
        <div className="w-64 bg-gray-900 text-white p-4 flex flex-col gap-2">
          <h2 className="text-xl font-bold mb-4">Rooms</h2>

          {rooms.map((r: any) => (
            <button
              key={r.id}
              onClick={() => {
                setCurrentRoom(r.id);
                joinRoom(r.id);
              }}
              className={`p-2 rounded ${
                currentRoomId === r.id ? "bg-blue-600" : "bg-gray-700"
              }`}
            >
              {r.name}
            </button>
          ))}
        </div>

        <div className="flex-1 p-4">
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
        </div>

      </div>  
          
    </main>
  );
}
