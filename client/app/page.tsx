"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuthStore } from "@/stores/auth";
import * as api from "@/lib/api";
import * as WS from "@/lib/ws";
import { useRouter } from "next/navigation";
import { RoomList } from "./components/RoomList";
import { ChatHeader } from "./components/ChatHeader";
import { MessageList } from "./components/MsgList";
import { MsgInput } from "./components/MsgInput";
import { CreateRoomModal } from "./components/CreateRoomModal";
import { StartDmModal } from "./components/StartDmModal";

interface Message {
  id: number;
  text: string;
  sender: { id: number; name: string | null; email: string };
  createdAt: string;
}

export default function ChatPage() {
  const router = useRouter();

  const [connected, setConnected] = useState(false);
  const [input, setInput] = useState("");
  const [ready, setReady] = useState(false);
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [showStartDmModal, setShowStartDmModal] = useState(false);
  const [rooms, setRooms] = useState<any[]>([]);
  const [dmRooms, setDmRooms] = useState<any[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  
    const wsRef = useRef<WebSocket | null>(null);
    const { token, user, hydrated } = useAuthStore();

  const addMsg = useCallback((msg: Message) => {
    setMessages(prevMessages => 
      [...prevMessages, msg].sort((a, b) => a.id - b.id)
    );
  }, []);

  const setMsgs = useCallback((msgs: Message[] | undefined) => {
    setMessages((msgs ?? []).sort((a, b) => a.id - b.id));
  }, []);

  const loadRoomMessages = useCallback(async (roomId: number) => {
    const msgs = await api.get(`/rooms/${roomId}/messages`);
    setMsgs(msgs);
  }, []);

  const joinRoom = useCallback((roomId: number) => {
    wsRef.current?.send(
      JSON.stringify({
        type: "room:join",
        roomId,
      })
    );
    loadRoomMessages(roomId);
  }, []);

  const selectRoom = useCallback((id: number) => {
    setCurrentRoomId(id);
    joinRoom(id);
  }, []);

  const createRoom = useCallback(async (name: string) => {
    const room = await api.post("/rooms", { name });
    setRooms(prev => [...prev, room]);
    setCurrentRoomId(room.id);
    joinRoom(room.id);
  }, []);

  const startDm = useCallback(async (user: any) => {
    const room = await api.post(`/dm/${user.id}`, { name: user?.name });
    setDmRooms((prev) => {
      const exists = prev.find((r) => r.id === room.id);
      return exists ? prev : [...prev, room];
    });
    setCurrentRoomId(room.id);
    joinRoom(room.id);
  }, []);

  const sendMsg = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN)
      return;
    if (!input.trim())
      return;

    ws.send(JSON.stringify({ type: "message:new", text: input.trim() }));
    setInput("");
  }, []);

  useEffect(() => {
    if (!hydrated)
      return;
    if (token === null)
      return;
    setReady(true);
    loadRooms();
    loadDmRooms();
  }, [token, hydrated]);

  useEffect(() => {
    if (!hydrated)
      return;
    if (!token) {
      router.replace("/login");
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN)
      return;

    setupWS(token);

    return () => {
      wsRef.current?.close();
      wsRef.current = null;
      setConnected(false);
    };
  }, [token, hydrated]);

  async function loadRooms() {
    const res = await api.get("/rooms");
    setRooms(res);

    if (!currentRoomId && res.length > 0) {
      setCurrentRoomId(res[0].id);
      joinRoom(res[0].id);
    }
  }

  async function loadDmRooms() {
    const res = await api.get("/dm");
    setDmRooms(res);
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

  if (!ready)
    return null;

  const currentRoom =
    rooms.find((r: any) => r.id === currentRoomId) || 
    dmRooms.find((r: any) => r.id === currentRoomId) || 
    null;

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
            rooms={rooms}
            currentRoomId={ currentRoomId }
            onSelect={selectRoom}
          />

          {/* Direct Messages section */}
          <div className="mt-4 mb-1 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Direct Messages
            </h2>
            <button
              onClick={() => setShowStartDmModal(true)}
              className="text-slate-300 hover:text-indigo-400 transition text-lg leading-none px-1"
              title="Start a direct message"
            >
            +
            </button>
          </div>

          <RoomList
            rooms={dmRooms}
            currentRoomId={ currentRoomId }
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
          <MessageList messages={messages}/>

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

        {/* DM Modal */}
        <StartDmModal
          open={showStartDmModal}
          onClose={() => setShowStartDmModal(false)}
          onSelectUser={startDm}
        />

      </div>
    </main>
  );
}
