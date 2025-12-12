"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuthStore } from "@/stores/auth";
import GlobalHeader from "./components/GlobalHeader";
import toastLib from "@/lib/toast";
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
  const [formMode, setFormMode] = useState<"login" | "signup">("login");
  const [formLoading, setFormLoading] = useState(false);
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formName, setFormName] = useState("");
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [showStartDmModal, setShowStartDmModal] = useState(false);
  const [rooms, setRooms] = useState<any[]>([]);
  const [dmRooms, setDmRooms] = useState<any[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  
  const wsRef = useRef<WebSocket | null>(null);
  const { token, user, hydrated, setUser, setToken } = useAuthStore();

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
  }, [input]);

  useEffect(() => {
    if (!hydrated) return;
    if (token === null) return;

    // verify token with server before loading app data
    (async () => {
      try {
        const me = await api.get("/auth/me");
        if (me) setUser(me);
        setReady(true);
        await loadRooms();
        await loadDmRooms();
      } catch (err) {
        // api.get will clear auth on 401
        // token invalid -> clear and fall back to landing
      }
    })();
  }, [token, hydrated, setUser]);

  useEffect(() => {
    if (!hydrated) return;
    if (!token) return;

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

  async function submitLogin() {
    if (formLoading) return;
    setFormLoading(true);
    try {
      const res = await api.post("/auth/login", { email: formEmail, password: formPassword });
      if (res && res.token) {
        setToken(res.token);
        setUser(res.user);
        toastLib.showToast("Signed in", "success");
        router.replace("/");
      } else {
        toastLib.showToast(res?.error || "Invalid credentials", "error");
      }
    } catch (err: any) {
      toastLib.errorToToast(err, "Login failed");
    } finally {
      setFormLoading(false);
    }
  }

  async function submitSignup() {
    if (formLoading) return;
    setFormLoading(true);
    try {
      const res = await api.post("/auth/signup", { name: formName, email: formEmail, password: formPassword });
      toastLib.showToast(res?.message || "Signup successful! Please login.", "success");
      // switch to login view and prefill email
      setFormMode("login");
    } catch (err: any) {
      toastLib.errorToToast(err, "Signup failed");
    } finally {
      setFormLoading(false);
    }
  }

  // wait for the auth store to rehydrate before showing the app
  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading…</div>
      </div>
    );
  }

  // If there's no token show the landing / auth forms
  if (!token) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 px-6">
        <div className="w-full max-w-6xl grid grid-cols-2 gap-8 items-center">
          <div className="text-left">
            <h1 className="text-4xl font-bold text-slate-100 mb-4">Chatr</h1>
            <p className="text-slate-300 max-w-lg">A simple, private chat experience. Connect with your team and friends — messages sync in real time.</p>
            <ul className="mt-6 text-sm text-slate-400 space-y-2">
              <li>• Real-time messaging</li>
              <li>• Direct messages and rooms</li>
              <li>• Small, focused UI</li>
            </ul>
          </div>

          <div className="w-full max-w-md mx-auto">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-100">{formMode === "login" ? "Sign in" : "Create account"}</h2>
                <div className="text-sm text-slate-400">
                  {formMode === "login" ? (
                    <button className="underline hover:text-slate-200" onClick={() => setFormMode("signup")}>Create account</button>
                  ) : (
                    <button className="underline hover:text-slate-200" onClick={() => setFormMode("login")}>Sign in</button>
                  )}
                </div>
              </div>

              {formMode === "signup" && (
                <>
                  <label className="block text-xs text-slate-400 mb-1">Full name</label>
                  <input className="w-full rounded-md bg-slate-800/60 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 mb-3 outline-none" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Your name" />
                </>
              )}

              <label className="block text-xs text-slate-400 mb-1">Email</label>
              <input className="w-full rounded-md bg-slate-800/60 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 mb-3 outline-none" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="you@domain.com" />

              <label className="block text-xs text-slate-400 mb-1">Password</label>
              <input type="password" className="w-full rounded-md bg-slate-800/60 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 mb-4 outline-none" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder="••••••••" />

              <div className="flex items-center justify-between gap-3">
                {formMode === "login" ? (
                  <button disabled={formLoading || !formEmail.trim() || !formPassword.trim()} onClick={submitLogin} className="flex-1 rounded-2xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-medium text-slate-50 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">{formLoading ? "Signing in…" : "Sign in"}</button>
                ) : (
                  <button disabled={formLoading || !formEmail.trim() || !formPassword.trim() || !formName.trim()} onClick={submitSignup} className="flex-1 rounded-2xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-medium text-slate-50 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">{formLoading ? "Creating…" : "Create account"}</button>
                )}

              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // If token exists but we haven't finished preparing the app, show loading
  if (token && !ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading…</div>
      </div>
    );
  }

  const currentRoom =
    rooms.find((r: any) => r.id === currentRoomId) || 
    dmRooms.find((r: any) => r.id === currentRoomId) || 
    null;

  return (
    <>
      <GlobalHeader />
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
            currentUserId={user?.id ?? null}
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
            currentUserId={user?.id ?? null}
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
    </>
  );
}
