"use client";

import { useEffect, useState, useRef } from "react";
import { useMessageStore } from "@/stores/msg";
import { useAuthStore } from "@/stores/auth";
import { useRoomStore } from "@/stores/room";
import * as api from "@/lib/api";
import * as WS from "@/lib/ws";
import { useRouter } from "next/navigation";
import { RoomList } from "./components/RoomList";
import { ChatHeader } from "./components/ChatHeader";
import { MessageList } from "./components/MsgList";
import { MsgInput } from "./components/MsgInput";
import { CreateRoomModal } from "./components/CreateRoomModal";

export default function ChatPage() {
  const router = useRouter();
  const { addMsg, setMsgs } = useMessageStore();
  const [connected, setConnected] = useState(false);
  const [input, setInput] = useState("");
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const { token, user, hydrated } = useAuthStore();
  const { rooms, setRooms, currentRoomId, setCurrentRoom } = useRoomStore();

  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!hydrated)
      return;
    if (token === null)
      return;
    setReady(true);
    loadRooms();
  }, [token, hydrated]);


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
    };
  }, [token, hydrated]);

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
    wsRef.current?.send(
      JSON.stringify({
        type: "room:join",
        roomId,
      })
    );
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

  function sendMsg() {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN)
      return;
    if (!input.trim())
      return;

    ws.send(JSON.stringify({ type: "message:new", text: input.trim() }));
    setInput("");
  }


  function selectRoom(id: number) {
    setCurrentRoom(id);
    joinRoom(id);
  }

  async function createRoom(name: string) {
    const room = await api.post("/rooms", { name });
    setRooms([...rooms, room]);
    setCurrentRoom(room.id);
    joinRoom(room.id);
  }

  if (!ready)
    return null;

  const currentRoom = rooms.find((r: any) => r.id === currentRoomId);

  return (
    <main className="flex h-[calc(100vh-70px)] overflow-hidden flex-col">

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-slate-800 bg-slate-950/90 px-4 py-4 flex flex-col">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
              Rooms
            </h2>
            <button
              onClick={() => setShowCreateRoomModal(true)}
              className="text-slate-300 hover:text-indigo-400 transition text-xl leading-none"
              title="Create Room"
            >
              +
            </button>        
          </div>

          <RoomList
            onSelect={selectRoom}
          />

          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-500 mt-auto">
            Connected as <span className="font-medium">{user?.email}</span>
          </div>
        </aside>

        {/* Chat area */}
        <section className="flex-1 flex flex-col">
          {/* Chat header */}
          <ChatHeader 
            connected={connected} 
            roomName={currentRoom ? currentRoom.name : "Select a room"}
            subtitle={currentRoom
              ? "Messages are synced in real time for this room."
              : "Choose a room from the sidebar to start chatting."}
          />

          {/* Messages */}
          <MessageList />

          {/* Input bar */}
          <MsgInput
            value={input}
            onChange={setInput}
            onSend={sendMsg}
            disabled={!connected || !currentRoom}
          />
 
        </section>

        {/* Create Room Modal */}
        <CreateRoomModal
          open={showCreateRoomModal}
          onClose={() => setShowCreateRoomModal(false)}
          onCreate={(name) => createRoom(name)}
        />

      </div>
    </main>
  );
}
