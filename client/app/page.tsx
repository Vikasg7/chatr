"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth";
import GlobalHeader from "./components/GlobalHeader";
import * as api from "@/lib/api";
import { FriendList } from "./components/FriendList";
import { ChatHeader } from "./components/ChatHeader";
import { MessageList } from "./components/MsgList";
import { MsgInput } from "./components/MsgInput";
import { SearchUserModal } from "./components/SearchUserModal";
import { motion } from 'framer-motion';

// Hooks
import { useChat } from "@/hooks/useChat";
import { useAuthForm } from "@/hooks/useAuthForm";

export default function ChatPage() {
  const { token, user, hydrated, setUser } = useAuthStore();
  const [ready, setReady] = useState(false);

  // Auth Form Logic
  const auth = useAuthForm();

  // Chat Logic
  const chat = useChat(token, user);

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
  const [editingMessage, setEditingMessage] = useState<any>(null);

  const sendMsg = (attachment?: { url: string; type: string }) => {
    if (editingMessage) {
      chat.editMsg(editingMessage.id, input);
      setEditingMessage(null);
    } else {
      chat.sendMsg(input, attachment);
    }
    setInput("");
  };

  const startEdit = (msg: any) => {
    setEditingMessage(msg);
    setInput(msg.text);
  };

  // Layout State
  const [showSidebar, setShowSidebar] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);

  const currentFriendship = chat.friends.find(f =>
    (chat.currentFriendId && f.id === chat.currentFriendId) ||
    (chat.selectedUserId && (f.senderId === chat.selectedUserId || f.receiverId === chat.selectedUserId))
  );

  const getFriendUser = (f: any) => {
    if (!f) return null;
    return f.senderId === user?.id ? f.receiver : f.sender;
  };

  const currentFriendUser = getFriendUser(currentFriendship);

  const getTypingText = () => {
    if (chat.typingUsers.size === 0) return null;
    return "Typing...";
  };

  const [selectedUser, setSelectedUser] = useState<any>(null);

  useEffect(() => {
    if (!chat.selectedUserId) {
      setSelectedUser(null);
      return;
    }
    // Check if it's already in the friends list (it usually is if selected via sidebar)
    const friendship = chat.friends.find(f => f.senderId === chat.selectedUserId || f.receiverId === chat.selectedUserId);
    if (friendship) {
      const u = friendship.senderId === user?.id ? friendship.receiver : friendship.sender;
      setSelectedUser(u);
    } else {
      // Fetch fresh
      (async () => {
        try {
          const u = await api.get(`/users/${chat.selectedUserId}`);
          setSelectedUser(u);
        } catch (e) { }
      })();
    }
  }, [chat.selectedUserId, chat.friends, user?.id]);

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
            <p className="text-slate-300 prose-constrained mb-6">Connect with friends — messages sync in real time.</p>
            <button onClick={() => { auth.setMode("login"); auth.setEmail("demo@chatr.local"); auth.setPassword("password"); auth.login({ email: "demo@chatr.local", password: "password" }); }} className="rounded-full bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow">Try demo</button>
          </div>

          <div className="w-full max-w-md mx-auto card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-100">{auth.mode === "login" ? "Sign in" : "Create account"}</h2>
              <button className="underline text-sm text-slate-400" onClick={() => auth.setMode(auth.mode === "login" ? "signup" : "login")}>{auth.mode === "login" ? "Create account" : "Sign in"}</button>
            </div>

            {auth.mode === "signup" && (
              <input className="input w-full mb-3" placeholder="Full Name" value={auth.name} onChange={e => auth.setName(e.target.value)} />
            )}
            <input className="input w-full mb-3" placeholder="Email" value={auth.email} onChange={e => auth.setEmail(e.target.value)} />
            <input type="password" className="input w-full mb-4" placeholder="Password" value={auth.password} onChange={e => auth.setPassword(e.target.value)} />

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

      <main className="flex h-[calc(100vh-70px)] overflow-hidden flex-col relative">
        <div className="flex flex-1 overflow-hidden relative">

          {/* Sidebar */}
          <aside className={`w-64 border-r border-slate-800 bg-slate-950 px-4 py-4 flex flex-col fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 md:relative md:translate-x-0 ${showSidebar ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="mb-4 flex justify-between items-center">
              <h2 className="sidebar-heading">Friends</h2>
              <button
                onClick={() => setShowSearchModal(true)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all text-xl font-bold"
                title="Start New Conversation"
              >+</button>
            </div>

            <FriendList
              friends={chat.friends}
              currentFriendId={chat.currentFriendId}
              onSelect={(id) => { chat.selectFriend(id); setShowSidebar(false); }}
              currentUserId={user?.id}
              onlineUsers={chat.onlineUsers}
            />

            <div className="pt-3 border-t border-slate-800 meta-small mt-auto">
              Connected as <span className="font-medium">{user?.email}</span>
            </div>
          </aside>

          <section className="flex-1 flex flex-col relative min-w-0">
            <ChatHeader
              connected={chat.connected}
              roomName={selectedUser ? (selectedUser.name || selectedUser.email.split("@")[0]) : "Select a friend"}
              subtitle={selectedUser ? `Chatting with ${selectedUser.email}` : "Find someone to chat with!"}
              typingText={getTypingText()}
              onUnfriend={() => currentFriendship && chat.unfriend(currentFriendship.id)}
              isAccepted={currentFriendship?.status === "ACCEPTED"}
            />

            <MessageList
              messages={chat.messages}
              currentUserId={user?.id || null}
              onReact={chat.sendReaction}
              onEdit={startEdit}
              onDelete={chat.deleteMsg}
            />

            {currentFriendship && (
              <MsgInput
                value={input}
                onChange={setInput}
                onSend={sendMsg}
                onTyping={chat.handleTyping}
                disabled={!chat.connected}
                isEditing={!!editingMessage}
                onCancelEdit={() => { setEditingMessage(null); setInput(""); }}
                friendshipStatus={currentFriendship.status}
                isSender={currentFriendship.senderId === user?.id}
                onSendRequest={() => chat.sendFriendRequest(selectedUser?.id)}
                onAcceptRequest={() => chat.acceptFriendRequest(currentFriendship.id)}
              />
            )}

            {!currentFriendship && selectedUser && (
              <MsgInput
                value={input}
                onChange={setInput}
                onSend={sendMsg}
                onTyping={chat.handleTyping}
                disabled={!chat.connected}
                onSendRequest={() => chat.sendFriendRequest(selectedUser.id)}
              />
            )}

            {!currentFriendship && !selectedUser && (
              <div className="h-24 flex items-center justify-center border-t border-slate-800 bg-slate-950/90 text-slate-500 text-sm italic">
                Select a friend from the sidebar to start chatting
              </div>
            )}
          </section>
        </div>
      </main>

      <SearchUserModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onSelect={chat.selectUser}
        currentUserId={user?.id}
        existingFriendIds={chat.friends.map(f => getFriendUser(f)?.id)}
      />
    </>
  );
}
