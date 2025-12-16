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
import { InviteUserModal } from "./components/InviteUserModal";
import Onboarding from "./components/Onboarding";
import { motion } from 'framer-motion';

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
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [rooms, setRooms] = useState<any[]>([]);
  const [dmRooms, setDmRooms] = useState<any[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Set<number>>(new Set());
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  const inviteUser = useCallback(async (email: string) => {
    if (!currentRoomId) return;
    try {
      await api.post(`/rooms/${currentRoomId}/invite`, { email });
      toastLib.showToast("User invited!", "success");
    } catch (e: any) {
      toastLib.showToast(e.message || "Failed to invite", "error");
    }
  }, [currentRoomId]);

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
      } else if (data.type === "status:list") {
        setOnlineUsers(new Set(data.users));
      } else if (data.type === "status:online") {
        setOnlineUsers(prev => {
          const next = new Set(prev);
          next.add(data.userId);
          return next;
        });
      } else if (data.type === "status:offline") {
        setOnlineUsers(prev => {
          const next = new Set(prev);
          next.delete(data.userId);
          return next;
        });
      }
    };

    ws.onclose = () => setConnected(false);
  }

  const handleTyping = useCallback((isTyping: boolean) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    if (isTyping) {
      if (!typingTimeoutRef.current) {
        ws.send(JSON.stringify({ type: "typing:start" }));
      }

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      typingTimeoutRef.current = setTimeout(() => {
        ws.send(JSON.stringify({ type: "typing:stop" }));
        typingTimeoutRef.current = null;
      }, 2000);
    } else {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
      ws.send(JSON.stringify({ type: "typing:stop" }));
    }
  }, []);

  const getTypingText = () => {
    if (typingUsers.size === 0) return null;
    const ids = Array.from(typingUsers);
    if (ids.length === 1) return "Someone is typing...";
    if (ids.length === 2) return "Two people are typing...";
    return "Several people are typing...";
  };

  async function submitLogin(creds?: { email: string; password: string }) {
    if (formLoading) return;
    setFormLoading(true);
    const email = creds?.email ?? formEmail;
    const password = creds?.password ?? formPassword;

    try {
      const res = await api.post("/auth/login", { email, password });
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
          <div className="text-left relative">
            <div className="absolute -left-10 -top-10 w-56 h-56 rounded-full bg-gradient-to-br from-indigo-700/30 to-blue-400/20 blur-3xl opacity-40 pointer-events-none" />
            <motion.h1 initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.36 }} className="text-5xl font-extrabold text-slate-100 mb-4">Chatr</motion.h1>
            <motion.p initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4, delay: 0.06 }} className="text-slate-300 prose-constrained mb-6">A simple, private chat experience. Connect with your team and friends — messages sync in real time.</motion.p>

            <div className="flex items-center gap-4">
              <motion.ul initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }} className="text-sm text-slate-400 space-y-2">
                <motion.li variants={{ hidden: { y: 6, opacity: 0 }, show: { y: 0, opacity: 1 } }}>• Real-time messaging</motion.li>
                <motion.li variants={{ hidden: { y: 6, opacity: 0 }, show: { y: 0, opacity: 1 } }}>• Direct messages and rooms</motion.li>
                <motion.li variants={{ hidden: { y: 6, opacity: 0 }, show: { y: 0, opacity: 1 } }}>• Small, focused UI</motion.li>
              </motion.ul>

              <div className="ml-6 flex items-center gap-4">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="opacity-90" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M3 8a5 5 0 015-5h8a5 5 0 015 5v6a5 5 0 01-5 5H9l-4 3V8z" stroke="url(#g)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  <defs>
                    <linearGradient id="g" x1="0" x2="1">
                      <stop offset="0" stopColor="#6366F1" />
                      <stop offset="1" stopColor="#06B6D4" />
                    </linearGradient>
                  </defs>
                </svg>

                <div>
                  <button
                    onClick={() => {
                      setFormMode("login");
                      // prefill visually and auto-submit demo credentials
                      setFormEmail("demo@chatr.local");
                      setFormPassword("password");
                      // call submitLogin with explicit creds to avoid waiting on state
                      submitLogin({ email: "demo@chatr.local", password: "password" });
                    }}
                    className="rounded-full bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow transform-gpu transition-transform duration-150 hover:-translate-y-0.5 active:scale-95"
                  >
                    Try demo
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full max-w-md mx-auto">
            <div className="card transform-gpu transition-transform duration-150 hover:scale-[1.01]">
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
                  <button disabled={formLoading || !formEmail.trim() || !formPassword.trim()} onClick={() => submitLogin()} className="flex-1 rounded-2xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-medium text-slate-50 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">{formLoading ? "Signing in…" : "Sign in"}</button>
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
      <Onboarding />
      <main className="flex h-[calc(100vh-70px)] overflow-hidden flex-col">

        {/* Main layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <aside className="w-64 border-r border-slate-800 bg-slate-950/90 px-4 py-4 flex flex-col">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="sidebar-heading">
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
              currentRoomId={currentRoomId}
              onSelect={selectRoom}
              currentUserId={user?.id ?? null}
              onlineUsers={onlineUsers}
            />

            {/* Direct Messages section */}
            <div className="mt-4 mb-1 flex items-center justify-between">
              <h2 className="sidebar-heading">
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
              currentRoomId={currentRoomId}
              onSelect={selectRoom}
              currentUserId={user?.id ?? null}
              onlineUsers={onlineUsers}
            />

            <div className="pt-3 border-t border-slate-800 meta-small mt-auto">
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
              onInvite={currentRoom?.ownerId === user?.id ? () => setShowInviteModal(true) : undefined}
              typingText={getTypingText()}
            />

            {/* Messages */}
            <MessageList messages={messages} />

            {/* Input bar */}
            <MsgInput
              value={input}
              onChange={setInput}
              onSend={sendMsg}
              onTyping={handleTyping}
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

          {/* Invite User Modal */}
          <InviteUserModal
            open={showInviteModal}
            onClose={() => setShowInviteModal(false)}
            onInvite={inviteUser}
          />

        </div>
      </main>
    </>
  );
}
