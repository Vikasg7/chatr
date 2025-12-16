"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth";
import GlobalHeader from "./components/GlobalHeader";
import * as api from "@/lib/api";
import { RoomList } from "./components/RoomList";
import { ChatHeader } from "./components/ChatHeader";
import { MessageList } from "./components/MsgList";
import { MsgInput } from "./components/MsgInput";
import { CreateRoomModal } from "./components/CreateRoomModal";
import { StartDmModal } from "./components/StartDmModal";
import { InviteUserModal } from "./components/InviteUserModal";
import Onboarding from "./components/Onboarding";
import { CallInterface } from "./components/CallInterface";
import { motion } from 'framer-motion';

// Hooks
import { useWebRTC } from "@/hooks/useWebRTC";
import { useChat } from "@/hooks/useChat";
import { useAuthForm } from "@/hooks/useAuthForm";

export default function ChatPage() {
  const { token, user, hydrated, setUser } = useAuthStore();
  const [ready, setReady] = useState(false);

  // Auth Form Logic
  const auth = useAuthForm();

  // Chat Logic
  const chat = useChat(token, user);

  // WebRTC Logic
  const rtc = useWebRTC(chat.wsRef, user?.id);

  // Wire up signaling
  useEffect(() => {
    chat.setSignalHandler(rtc.handleSignal);
  }, [chat, rtc.handleSignal]);

  // Auth Verification
  useEffect(() => {
    if (!hydrated) return;
    if (token === null) return;
    (async () => {
      try {
        const me = await api.get("/auth/me");
        if (me) setUser(me);
        setReady(true);
      } catch (err) { }
    })();
  }, [token, hydrated, setUser]);

  // Input State
  const [input, setInput] = useState("");

  const sendMsg = (attachment?: { url: string; type: string }) => {
    chat.sendMsg(input, attachment);
    setInput("");
  };

  // Layout State
  const [showSidebar, setShowSidebar] = useState(false);
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [showStartDmModal, setShowStartDmModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const currentRoom =
    chat.rooms.find((r: any) => r.id === chat.currentRoomId) ||
    chat.dmRooms.find((r: any) => r.id === chat.currentRoomId) ||
    null;

  const getTypingText = () => {
    if (chat.typingUsers.size === 0) return null;
    const ids = Array.from(chat.typingUsers);
    if (ids.length === 1) return "Someone is typing...";
    if (ids.length === 2) return "Two people are typing...";
    return "Several people are typing...";
  };

  // Loading Screen
  if (!hydrated || (token && !ready)) {
    return <div className="min-h-screen flex items-center justify-center"><div>Loading…</div></div>;
  }

  // Auth Screen
  if (!token) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 px-6">
        <div className="w-full max-w-6xl grid grid-cols-2 gap-8 items-center">
          <div className="text-left relative">
            <div className="absolute -left-10 -top-10 w-56 h-56 rounded-full bg-gradient-to-br from-indigo-700/30 to-blue-400/20 blur-3xl opacity-40 pointer-events-none" />
            <motion.h1 initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.36 }} className="text-5xl font-extrabold text-slate-100 mb-4">Chatr</motion.h1>
            <p className="text-slate-300 prose-constrained mb-6">A simple, private chat experience. Connect with your team and friends — messages sync in real time.</p>
            <button onClick={() => { auth.setMode("login"); auth.setEmail("demo@chatr.local"); auth.setPassword("password"); auth.login({ email: "demo@chatr.local", password: "password" }); }} className="rounded-full bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow">Try demo</button>
          </div>

          <div className="w-full max-w-md mx-auto card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-100">{auth.mode === "login" ? "Sign in" : "Create account"}</h2>
              <button className="underline text-sm text-slate-400" onClick={() => auth.setMode(auth.mode === "login" ? "signup" : "login")}>{auth.mode === "login" ? "Create account" : "Sign in"}</button>
            </div>

            {auth.mode === "signup" && (
              <input className="input mb-3" placeholder="Full Name" value={auth.name} onChange={e => auth.setName(e.target.value)} />
            )}
            <input className="input mb-3" placeholder="Email" value={auth.email} onChange={e => auth.setEmail(e.target.value)} />
            <input type="password" className="input mb-4" placeholder="Password" value={auth.password} onChange={e => auth.setPassword(e.target.value)} />

            <button disabled={auth.loading} onClick={() => auth.mode === "login" ? auth.login() : auth.signup()} className="btn-primary w-full">
              {auth.loading ? "Processing..." : (auth.mode === "login" ? "Sign in" : "Create account")}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <GlobalHeader onMenuClick={() => setShowSidebar(true)} />

      <CallInterface
        callState={rtc.callState}
        caller={rtc.callMeta.caller}
        target={rtc.callMeta.target}
        localStream={rtc.localStream}
        remoteStream={rtc.remoteStream}
        onAccept={rtc.acceptCall}
        onReject={rtc.rejectCall}
        onEnd={rtc.endCall}
        isMuted={rtc.isMuted}
        isVideoOff={rtc.isVideoOff}
        toggleMute={rtc.toggleMute}
        toggleVideo={rtc.toggleVideo}
      />

      <Onboarding />

      <main className="flex h-[calc(100vh-70px)] overflow-hidden flex-col relative">
        <div className="flex flex-1 overflow-hidden relative">

          {/* Mobile Overlay */}
          {showSidebar && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setShowSidebar(false)} />}

          {/* Sidebar */}
          <aside className={`w-64 border-r border-slate-800 bg-slate-950 px-4 py-4 flex flex-col fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 md:relative md:translate-x-0 ${showSidebar ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="mb-1 flex justify-between items-center"><h2 className="sidebar-heading">Rooms</h2><button onClick={() => setShowCreateRoomModal(true)} className="text-xl text-slate-300 hover:text-indigo-400">+</button></div>
            <RoomList rooms={chat.rooms} currentRoomId={chat.currentRoomId} onSelect={(id) => { chat.joinRoom(id); setShowSidebar(false); }} currentUserId={user?.id} onlineUsers={chat.onlineUsers} />

            <div className="mt-4 mb-1 flex justify-between items-center"><h2 className="sidebar-heading">Direct Messages</h2><button onClick={() => setShowStartDmModal(true)} className="text-xl text-slate-300 hover:text-indigo-400">+</button></div>
            <RoomList rooms={chat.dmRooms} currentRoomId={chat.currentRoomId} onSelect={(id) => { chat.joinRoom(id); setShowSidebar(false); }} currentUserId={user?.id} onlineUsers={chat.onlineUsers} />

            <div className="pt-3 border-t border-slate-800 meta-small mt-auto">Connected as <span className="font-medium">{user?.email}</span></div>
          </aside>

          {/* Chat Area */}
          <section className="flex-1 flex flex-col">
            <ChatHeader
              connected={chat.connected}
              roomName={currentRoom ? currentRoom.name : "Select a room"}
              subtitle={currentRoom ? "Messages are synced in real time." : "Choose a room."}
              onInvite={currentRoom?.ownerId === user?.id ? () => setShowInviteModal(true) : undefined}
              typingText={getTypingText()}
              onCall={() => rtc.startCall(chat.currentRoomId!)}
            />

            <MessageList
              messages={chat.messages}
              currentUserId={user?.id}
              onReact={chat.sendReaction}
            />

            <MsgInput
              value={input}
              onChange={setInput}
              onSend={sendMsg}
              onTyping={chat.handleTyping}
              disabled={!chat.connected || !currentRoom}
            />
          </section>
        </div>
      </main>

      {/* Modals */}
      <CreateRoomModal open={showCreateRoomModal} onClose={() => setShowCreateRoomModal(false)} onCreate={chat.createRoom} />
      <StartDmModal open={showStartDmModal} onClose={() => setShowStartDmModal(false)} onSelectUser={chat.startDm} />
      <InviteUserModal open={showInviteModal} onClose={() => setShowInviteModal(false)} onInvite={chat.inviteUser} />
    </>
  );
}
