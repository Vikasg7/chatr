"use client";

import { useEffect, useState, useRef } from "react";
import { useAuthStore } from "@/stores/auth";
import GlobalHeader from "./components/GlobalHeader";
import * as api from "@/lib/api";
import toastLib from "@/lib/toast";
import { FriendList } from "./components/FriendList";
import { ChatHeader } from "./components/ChatHeader";
import { MessageList } from "./components/MsgList";
import { MsgInput } from "./components/MsgInput";
import { SearchUserModal } from "./components/SearchUserModal";
import { motion } from 'framer-motion';
import { LogIn, UserPlus, LogOut, UserMinus, Send, Search, User, Mail, Lock, Sparkles, Users, Plus, X, Paperclip } from 'lucide-react';

// Hooks
import { useChat } from "@/hooks/useChat";
import { useAuthForm } from "@/hooks/useAuthForm";
import { useWebRTC } from "@/hooks/useWebRTC";
import { CallOverlay } from "./components/CallOverlay";
import { VideoCallOverlay } from "./components/VideoCallOverlay";

export default function ChatPage() {
  const { token, user, hydrated, setUser } = useAuthStore();
  const [ready, setReady] = useState(false);

  // Auth Form Logic
  const auth = useAuthForm();

  // Chat Logic
  const chat = useChat(token, user);

  // WebRTC Logic
  const webRTC = useWebRTC({
    onSignal: (data) => {
      if (chat.wsRef.current) {
        chat.wsRef.current.send(JSON.stringify({ ...data, friendId: chat.currentFriendId }));
      }
    },
    onStream: (stream) => {
      chat.setRemoteStream(stream);
    },
    onError: (msg) => {
      const name = currentFriendUser?.name || currentFriendUser?.email.split("@")[0] || "User";
      toastLib.showToast(`${name} is offline`, "error");
      chat.setCallStatus('IDLE');
    },
    video: chat.callType === 'video'
  });

  const ringtoneRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (chat.callStatus === 'RINGING_OUT') {
      const audio = new Audio('/outgoing.mp3');
      audio.loop = true;
      audio.play().catch(e => console.error("Audio play failed:", e));
      ringtoneRef.current = audio;
    } else if (chat.callStatus === 'RINGING_IN') {
      const audio = new Audio('/incoming.mp3');
      audio.loop = true;
      audio.play().catch(e => console.error("Audio play failed:", e));
      ringtoneRef.current = audio;
    } else {
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current = null;
      }
    }

    return () => {
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current = null;
      }
    };
  }, [chat.callStatus]);

  useEffect(() => {
    chat.setSignalHandler((data) => {
      webRTC.handleSignal(data);
    });
  }, [chat, webRTC]);

  const handleStartCall = () => {
    if (!currentFriendUser) return;
    chat.setCallType('audio');
    chat.setCallStatus('RINGING_OUT');
    webRTC.startCall(currentFriendUser.id);
    // Send call type to peer
    if (chat.wsRef.current) {
      chat.wsRef.current.send(JSON.stringify({
        type: 'call:type',
        callType: 'audio',
        friendId: chat.currentFriendId
      }));
    }
  };

  const handleStartVideoCall = () => {
    if (!currentFriendUser) return;
    chat.setCallType('video');
    chat.setCallStatus('RINGING_OUT');
    webRTC.startCall(currentFriendUser.id, true);
    // Send call type to peer
    if (chat.wsRef.current) {
      chat.wsRef.current.send(JSON.stringify({
        type: 'call:type',
        callType: 'video',
        friendId: chat.currentFriendId
      }));
    }
  };

  const handleEndCall = (duration?: string) => {
    if (chat.wsRef.current) {
      chat.wsRef.current.send(JSON.stringify({
        type: "call:end",
        friendId: chat.currentFriendId,
        duration
      }));
    }
    chat.setCallStatus('IDLE');
    chat.setRemoteStream(null);
    webRTC.cleanup();
  };

  const handleRejectCall = () => {
    if (chat.wsRef.current) {
      chat.wsRef.current.send(JSON.stringify({ type: "call:reject", friendId: chat.currentFriendId }));
    }
    chat.setCallStatus('IDLE');
    webRTC.cleanup();
  };

  const handleCancelCall = () => {
    if (chat.wsRef.current) {
      chat.wsRef.current.send(JSON.stringify({ type: "call:cancel", friendId: chat.currentFriendId }));
    }
    chat.setCallStatus('IDLE');
    webRTC.cleanup();
  };

  const handleAnswerCall = async () => {
    // Call the answerCall function which gets media and sends answer
    await webRTC.answerCall(chat.callType === 'video');
    chat.setCallStatus('ACTIVE');
  };

  // Auth Verification
  useEffect(() => {
    if (!hydrated) return;
    if (token === null) return;
    (async () => {
      try {
        const me = await api.get("/auth/me");
        if (me) setUser(me);
        setReady(true);

        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
          await Notification.requestPermission();
        }
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
  const [showSidebar, setShowSidebar] = useState(true);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const [showSearchModal, setShowSearchModal] = useState(false);

  // Initialize sidebar state based on screen size
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isMobile = window.innerWidth < 768;
      setShowSidebar(!isMobile);
    }
  }, []);

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
    const handleAuthSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (auth.loading) return;
      auth.mode === "login" ? auth.login() : auth.signup();
    };

    return (
      <main className="min-h-screen flex items-center justify-center bg-[var(--color-base)] px-6 transition-colors">
        <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-12 items-center py-12">
          <div className="flex flex-col items-center md:items-start text-center md:text-left relative">
            <div className="absolute -left-10 -top-10 w-56 h-56 rounded-full bg-gradient-to-br from-indigo-700/30 to-blue-400/20 blur-3xl opacity-40 pointer-events-none" />
            <motion.h1 initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.36 }} className="text-5xl font-extrabold text-slate-100 mb-4">Chatr</motion.h1>
            <p className="text-slate-300 prose-constrained mb-6 font-medium">Connect with friends — messages sync in real time.</p>
            <button
              onClick={() => { auth.setMode("login"); auth.setEmail("demo@chatr.local"); auth.setPassword("password"); auth.login({ email: "demo@chatr.local", password: "password" }); }}
              className="rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-100 shadow-xl transition-all flex items-center gap-2 group"
            >
              <Sparkles size={18} className="text-indigo-400 group-hover:scale-110 transition-transform" />
              Try demo
            </button>
          </div>

          <div className="w-full max-w-md mx-auto card relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50" />

            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-slate-100">{auth.mode === "login" ? "Sign in" : "Create account"}</h2>
              <button
                className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                onClick={() => auth.setMode(auth.mode === "login" ? "signup" : "login")}
              >
                {auth.mode === "login" ? "Create an account" : "Back to login"}
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {auth.mode === "signup" && (
                <div className="relative group/input">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-indigo-400 transition-colors" size={18} />
                  <input
                    className="input w-full !pl-10 h-11 bg-slate-900/50 border-slate-700/50 focus:border-indigo-500 focus:bg-slate-900 transition-all font-medium"
                    placeholder="Full Name"
                    value={auth.name}
                    onChange={e => auth.setName(e.target.value)}
                    required={auth.mode === "signup"}
                  />
                </div>
              )}

              <div className="relative group/input">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-indigo-400 transition-colors" size={18} />
                <input
                  type="email"
                  className="input w-full !pl-10 h-11 bg-slate-900/50 border-slate-700/50 focus:border-indigo-500 focus:bg-slate-900 transition-all font-medium"
                  placeholder="Email address"
                  value={auth.email}
                  onChange={e => auth.setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="relative group/input">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-indigo-400 transition-colors" size={18} />
                <input
                  type="password"
                  className="input w-full !pl-10 h-11 bg-slate-900/50 border-slate-700/50 focus:border-indigo-500 focus:bg-slate-900 transition-all font-medium"
                  placeholder="Password"
                  value={auth.password}
                  onChange={e => auth.setPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={auth.loading}
                className="btn-primary w-full h-11 font-bold tracking-tight shadow-xl shadow-indigo-900/20 flex items-center justify-center gap-2 group/btn"
              >
                {auth.loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {auth.mode === "login" ? <LogIn size={18} className="group-hover:translate-x-0.5 transition-transform" /> : <UserPlus size={18} className="group-hover:translate-x-0.5 transition-transform" />}
                    {auth.mode === "login" ? "Sign in" : "Create account"}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <GlobalHeader onMenuClick={() => setShowSidebar(true)} />

      <main className="flex h-[calc(100vh-70px)] overflow-hidden flex-col relative">
        <div
          onClick={() => {
            // Only allow closing sidebar on mobile
            if (showSidebar && window.innerWidth < 768) setShowSidebar(false);
          }}
          className="flex flex-1 overflow-hidden relative h-full"
        >

          {/* Sidebar */}
          <aside
            onClick={(e) => e.stopPropagation()}
            className={`w-72 border-r border-[var(--border-subtle)] bg-[var(--color-elevated)] px-4 py-4 flex flex-col fixed inset-y-0 left-0 z-40 transform transition-all duration-300 md:relative md:translate-x-0 ${showSidebar ? 'translate-x-0' : '-translate-x-full'}`}
          >
            <div className="flex flex-col h-full">
              <div className="mb-6 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-indigo-400" />
                  <h2 className="sidebar-heading">Friends</h2>
                </div>
                <button
                  onClick={() => setShowSearchModal(true)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all"
                  title="Search Users"
                ><Plus size={20} /></button>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col">
                <FriendList
                  friends={chat.friends}
                  currentFriendId={chat.currentFriendId}
                  onSelect={(id) => {
                    chat.selectFriend(id);
                    // Only close sidebar on mobile
                    if (window.innerWidth < 768) setShowSidebar(false);
                  }}
                  currentUserId={user?.id}
                  onlineUsers={chat.onlineUsers}
                />
              </div>

              <div className="pt-3 border-t border-[var(--border-subtle)] meta-small mt-auto">
                Connected as <span className="font-medium text-[var(--text-muted)]">{user?.email}</span>
              </div>
            </div>
          </aside>

          <section
            className={`flex-1 flex flex-col relative min-w-0 transition-opacity duration-300 ${showSidebar ? 'opacity-50 md:opacity-100' : 'opacity-100'}`}
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (e.dataTransfer.types.includes('Files')) {
                setIsDraggingFile(true);
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Only hide overlay if leaving the section element itself
              if (e.currentTarget === e.target) {
                setIsDraggingFile(false);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingFile(false);

              const file = e.dataTransfer.files?.[0];
              if (file && currentFriendship?.status === 'ACCEPTED') {
                setDroppedFile(file);
              }
            }}
          >
            <ChatHeader
              connected={chat.connected}
              roomName={selectedUser ? (selectedUser.name || selectedUser.email.split("@")[0]) : "Select a friend"}
              isOnline={!!selectedUser && chat.onlineUsers.has(selectedUser.id)}
              subtitle={selectedUser ? `Chatting with ${selectedUser.email}` : "Find someone to chat with!"}
              typingText={getTypingText()}
              onUnfriend={() => currentFriendship && chat.unfriend(currentFriendship.id)}
              isAccepted={currentFriendship?.status === "ACCEPTED"}
              onCall={handleStartCall}
              onVideoCall={handleStartVideoCall}
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
                externalFile={droppedFile}
                onFileConsumed={() => setDroppedFile(null)}
              />
            )}

            {/* Drag-and-Drop Overlay */}
            {isDraggingFile && currentFriendship?.status === 'ACCEPTED' && (
              <div className="absolute inset-0 bg-indigo-600/10 backdrop-blur-sm border-4 border-dashed border-indigo-500/50 rounded-2xl flex items-center justify-center z-50 pointer-events-none">
                <div className="bg-[var(--color-card)] px-8 py-6 rounded-2xl border border-indigo-500/30 shadow-2xl">
                  <p className="text-lg font-bold text-indigo-400 flex items-center gap-3">
                    <Paperclip size={24} />
                    Drop file to attach
                  </p>
                </div>
              </div>
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
              <div className="h-24 flex items-center justify-center border-t border-[var(--border-subtle)] bg-[var(--color-elevated)] text-[var(--text-muted)] text-sm italic">
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

      {chat.callType === 'audio' ? (
        <CallOverlay
          status={chat.callStatus}
          callerName={currentFriendUser?.name || currentFriendUser?.email.split("@")[0]}
          onAnswer={handleAnswerCall}
          onReject={handleRejectCall}
          onCancel={handleCancelCall}
          onEnd={handleEndCall}
          onToggleAudio={webRTC.toggleAudio}
        />
      ) : (
        <VideoCallOverlay
          status={chat.callStatus}
          callerName={currentFriendUser?.name || currentFriendUser?.email.split("@")[0]}
          localStream={webRTC.localStream}
          remoteStream={chat.remoteStream}
          onAnswer={handleAnswerCall}
          onReject={handleRejectCall}
          onCancel={handleCancelCall}
          onEnd={handleEndCall}
          onToggleAudio={webRTC.toggleAudio}
          onToggleVideo={webRTC.toggleVideo}
        />
      )}

      {/* Hidden Remote Audio (audio calls only) */}
      {chat.remoteStream && chat.callStatus === 'ACTIVE' && chat.callType === 'audio' && (
        <audio
          autoPlay
          ref={(audio) => {
            if (audio) audio.srcObject = chat.remoteStream;
          }}
          className="hidden"
        />
      )}
    </>
  );
}
