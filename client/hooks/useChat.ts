import { useState, useRef, useEffect, useCallback } from 'react';
import * as api from "@/lib/api";
import * as WS from "@/lib/ws";
import toastLib from "@/lib/toast";
import { useAuthStore } from "@/stores/auth";
import * as push from "@/lib/push";

interface Message {
    id: number;
    text: string;
    sender: { id: number; name: string | null; email: string };
    createdAt: string;
    reactions?: any[];
    attachmentUrl?: string;
    attachmentType?: string;
    metadata?: any;
    replyToId?: number;
    replyTo?: Message;
}

export function useChat(user: any) {
    const [connected, setConnected] = useState(false);
    const [friends, setFriends] = useState<any[]>([]);
    const [currentFriendId, setCurrentFriendId] = useState<number | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
    const [typingUsers, setTypingUsers] = useState<Set<number>>(new Set());
    const [callStatus, setCallStatus] = useState<'IDLE' | 'RINGING_OUT' | 'RINGING_IN' | 'ACTIVE'>('IDLE');
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [callType, setCallType] = useState<'audio' | 'video'>('audio');
    const [activeCallUserId, setActiveCallUserId] = useState<number | null>(null);
    const [hasMoreMessages, setHasMoreMessages] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [hasMoreFriends, setHasMoreFriends] = useState(true);
    const [loadingFriends, setLoadingFriends] = useState(false);

    const wsRef = useRef<WebSocket | null>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const signalHandlerRef = useRef<((data: any) => void) | null>(null);
    const currentFriendIdRef = useRef<number | null>(null);
    const messagesRef = useRef<any[]>([]);

    // Refs to hold latest state for the WebSocket onmessage handler (avoids closure issues without reconnects)
    const stateRefs = useRef({
        callStatus,
        currentFriendId,
        user,
        friends
    });

    useEffect(() => {
        stateRefs.current = { callStatus, currentFriendId, user, friends };
        currentFriendIdRef.current = currentFriendId;
    }, [callStatus, currentFriendId, user, friends]);

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    const setSignalHandler = useCallback((handler: (data: any) => void) => {
        signalHandlerRef.current = handler;
    }, []);

    const addMsg = useCallback((msg: Message) => {
        setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev;
            const next = [...prev, msg].sort((a, b) => a.id - b.id);
            // ✅ Pruning: Keep only the latest 500 messages in memory
            if (next.length > 500) {
                return next.slice(next.length - 500);
            }
            return next;
        });
    }, []);

    const selectFriend = useCallback(async (friendshipId: number, friendsOverride?: any[]) => {
        const list = friendsOverride || friends;
        const friendship = list.find(f => f.id === friendshipId);
        if (friendship) {
            const otherUser = friendship.senderId === user?.id ? friendship.receiver : friendship.sender;
            setSelectedUserId(otherUser?.id || null);
        }
        setCurrentFriendId(friendshipId);
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: "chat:join", friendId: friendshipId }));
        }

        // Save last opened inbox
        if (user?.id) {
            localStorage.setItem(`chatr-last-friend-${user.id}`, friendshipId.toString());
        }

        setLoadingMessages(true);
        try {
            const limit = 50;
            const msgs = await api.get(`/friends/${friendshipId}/messages?limit=${limit}`);
            setMessages((msgs || []).sort((a: any, b: any) => a.id - b.id));
            setHasMoreMessages(msgs.length === limit);
        } finally {
            setLoadingMessages(false);
        }
    }, [user?.id, friends]);

    const loadMoreMessages = useCallback(async () => {
        if (!currentFriendId || !hasMoreMessages || loadingMessages) return;

        const firstMsgId = messages[0]?.id;
        if (!firstMsgId) return;

        setLoadingMessages(true);
        try {
            const limit = 50;
            const moreMsgs = await api.get(`/friends/${currentFriendId}/messages?beforeId=${firstMsgId}&limit=${limit}`);
            if (moreMsgs && moreMsgs.length > 0) {
                setMessages(prev => {
                    const existingIds = new Set(prev.map(m => m.id));
                    const filtered = moreMsgs.filter((m: Message) => !existingIds.has(m.id));
                    return [...filtered, ...prev].sort((a, b) => a.id - b.id);
                });
                setHasMoreMessages(moreMsgs.length === limit);
            } else {
                setHasMoreMessages(false);
            }
        } finally {
            setLoadingMessages(false);
        }
    }, [currentFriendId, hasMoreMessages, loadingMessages, messages]);

    // Initial Data Load
    useEffect(() => {
        if (!user) return;
        (async () => {
            setLoadingFriends(true);
            try {
                const limit = 20;
                const f = await api.get(`/friends?limit=${limit}&offset=0`);
                setFriends(f);
                setHasMoreFriends(f.length === limit);

                // Try to restore last opened inbox
                const lastFriendId = user?.id ? localStorage.getItem(`chatr-last-friend-${user.id}`) : null;
                const savedId = lastFriendId ? parseInt(lastFriendId) : null;

                const friendToSelect = savedId
                    ? f.find((fr: any) => fr.id === savedId && fr.status === "ACCEPTED")
                    : f.find((fr: any) => fr.status === "ACCEPTED");

                if (friendToSelect && !currentFriendId) {
                    selectFriend(friendToSelect.id, f);
                }
            } catch (e) { console.error(e); } finally {
                setLoadingFriends(false);
            }
        })();
    }, [user?.id]);

    const loadMoreFriends = useCallback(async () => {
        if (!user || !hasMoreFriends || loadingFriends) return;

        setLoadingFriends(true);
        try {
            const limit = 20;
            const offset = friends.length;
            const moreFriends = await api.get(`/friends?limit=${limit}&offset=${offset}`);
            if (moreFriends && moreFriends.length > 0) {
                setFriends(prev => {
                    const existingIds = new Set(prev.map(f => f.id));
                    const filtered = moreFriends.filter((f: any) => !existingIds.has(f.id));
                    return [...prev, ...filtered];
                });
                setHasMoreFriends(moreFriends.length === limit);
            } else {
                setHasMoreFriends(false);
            }
        } catch (e) { console.error(e); } finally {
            setLoadingFriends(false);
        }
    }, [user?.id, hasMoreFriends, loadingFriends, friends.length]);

    // Auto-sync selectFriend when selectedUserId is set
    useEffect(() => {
        if (!selectedUserId) return;
        const matchingFriendship = friends.find(f =>
            (f.senderId === selectedUserId || f.receiverId === selectedUserId) &&
            f.status === "ACCEPTED"
        );
        if (matchingFriendship && matchingFriendship.id !== currentFriendId) {
            selectFriend(matchingFriendship.id);
        }
    }, [friends, selectedUserId, currentFriendId, selectFriend]);

    // WebSocket Setup - depends on user presence
    useEffect(() => {
        if (!user) return;
        let reconnectTimeout: NodeJS.Timeout;

        const connect = () => {
            if (wsRef.current?.readyState === WebSocket.OPEN) return;

            const token = useAuthStore.getState().token;
            const ws = WS.create(token);
            wsRef.current = ws;

            ws.onopen = async () => {
                setConnected(true);

                // Rejoin current chat if we have one
                if (currentFriendIdRef.current) {
                    ws.send(JSON.stringify({ type: "chat:join", friendId: currentFriendIdRef.current }));
                }

                // ✅ Register Service Worker & Push Notifications
                if ("serviceWorker" in navigator && Notification.permission !== "denied") {
                    try {
                        await push.registerServiceWorker();
                        if (Notification.permission === "granted") {
                            await push.subscribeUserToPush();
                        } else if (Notification.permission === "default") {
                            const permission = await Notification.requestPermission();
                            if (permission === "granted") {
                                await push.subscribeUserToPush();
                            }
                        }
                    } catch (err) {
                        console.error("Push registration error:", err);
                    }
                }
            };

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                const { callStatus: currentStatus, currentFriendId: cid, user: currentUser, friends: currentFriends } = stateRefs.current;

                if (data.type === "message:new") {
                    addMsg(data.message);
                    if (data.message.sender.id !== currentUser?.id) {
                        const shouldNotify = !document.hasFocus() || data.message.friendId !== cid;
                        if (shouldNotify && Notification.permission === 'granted') {
                            const senderName = data.message.sender.name || data.message.sender.email.split('@')[0];
                            const messageText = data.message.text || (data.message.attachmentType ? `Sent ${data.message.attachmentType.toLowerCase()}` : 'New message');
                            const notification = new Notification(`${senderName}`, {
                                body: messageText,
                                icon: data.message.sender.avatarUrl || '/icon.png',
                                tag: `msg-${data.message.id}`,
                                requireInteraction: false
                            });
                            notification.onclick = () => { window.focus(); notification.close(); };
                            setTimeout(() => notification.close(), 5000);
                        }
                    }
                }
                else if (data.type === "status:list") setOnlineUsers(new Set(data.users.map(Number))); // Force numbers
                else if (data.type === "status:online") setOnlineUsers(prev => new Set(prev).add(Number(data.userId)));
                else if (data.type === "status:offline") setOnlineUsers(prev => {
                    const next = new Set(prev);
                    next.delete(Number(data.userId));
                    return next;
                });
                else if (data.type === "message:react") {
                    setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, reactions: data.reactions } : m));
                }
                else if (data.type === "message:edit") {
                    setMessages(prev => prev.map(m => m.id === data.message.id ? data.message : m));
                }
                else if (data.type === "message:delete") {
                    setMessages(prev => prev.filter(m => m.id !== data.messageId));
                }
                else if (data.type === "friend:new") {
                    setFriends(prev => [...prev.filter(f => f.id !== data.friend.id), data.friend]);
                    toastLib.showToast("New friend request!", "info");
                }
                else if (data.type === "friend:updated") {
                    setFriends(prev => prev.map(f => f.id === data.friend.id ? data.friend : f));
                    // Only toast if someone ELSE accepted our request
                    if (data.friend.status === "ACCEPTED" && data.friend.senderId === currentUser?.id) {
                        toastLib.showToast(`${data.friend.receiver?.name || 'Someone'} accepted your friend request!`, "success");
                    }
                }
                else if (data.type === "friend:deleted") {
                    setFriends(prev => prev.filter(f => f.id !== data.friendId));
                    if (cid === data.friendId) {
                        const otherId = data.senderId === currentUser?.id ? data.receiverId : data.senderId;
                        setSelectedUserId(otherId);
                        setCurrentFriendId(null);
                        setMessages([]);
                        // Notify that the current chat session has ended due to unfriending (from the other side)
                        if (data.deletedBy !== currentUser?.id) {
                            toastLib.showToast("Friendship removed by the other user", "info");
                        }
                    }
                }
                else if (data.type === "typing:start") setTypingUsers(prev => new Set(prev).add(data.userId));
                else if (data.type === "typing:stop") setTypingUsers(prev => {
                    const next = new Set(prev);
                    next.delete(data.userId);
                    return next;
                });
                else if (data.type === "call:type") setCallType(data.callType);
                else if (data.type === "call:request") {
                    if (currentStatus !== 'IDLE') {
                        ws.send(JSON.stringify({ type: "call:reject", friendId: cid }));
                        return;
                    }
                    const friend = currentFriends.find(f => f.id === data.friendId);
                    const callerId = friend ? (friend.senderId === currentUser?.id ? friend.receiverId : friend.senderId) : null;
                    setActiveCallUserId(callerId);
                    setCallStatus('RINGING_IN');
                    if (signalHandlerRef.current) signalHandlerRef.current(data);
                }
                else if (data.type === "call:cancel" || data.type === "call:reject" || data.type === "call:end") {
                    setCallStatus('IDLE');
                    setActiveCallUserId(null);
                    setRemoteStream(null);
                    if (signalHandlerRef.current) signalHandlerRef.current(data);
                }
                else if (data.type === "call:answer") {
                    setCallStatus('ACTIVE');
                    if (signalHandlerRef.current) signalHandlerRef.current(data);
                }
                else if (data.type === "call:signal") {
                    if (signalHandlerRef.current) signalHandlerRef.current(data);
                }
                else if (data.type === "call:error") {
                    setCallStatus('IDLE');
                    setActiveCallUserId(null);
                    if (signalHandlerRef.current) signalHandlerRef.current(data);
                }
            };

            ws.onopen = async () => {
                setConnected(true);

                // Rejoin current chat if we have one
                if (currentFriendIdRef.current) {
                    ws.send(JSON.stringify({ type: "chat:join", friendId: currentFriendIdRef.current }));

                    // Fetch any messages missed during disconnection
                    try {
                        const lastMsgId = messagesRef.current.length > 0
                            ? Math.max(...messagesRef.current.map(m => m.id))
                            : 0;

                        if (lastMsgId > 0) {
                            const newMsgs = await api.get(`/friends/${currentFriendIdRef.current}/messages?since=${lastMsgId}`);
                            if (newMsgs && newMsgs.length > 0) {
                                setMessages(prev => {
                                    const existingIds = new Set(prev.map(m => m.id));
                                    const filtered = newMsgs.filter((m: any) => !existingIds.has(m.id));
                                    return [...prev, ...filtered].sort((a, b) => a.id - b.id);
                                });
                            }
                        }
                    } catch (err) {
                        console.error("Failed to fetch missed messages:", err);
                    }
                }
            };

            ws.onclose = () => {
                setConnected(false);
                setOnlineUsers(new Set()); // Clear online users when disconnected
                reconnectTimeout = setTimeout(connect, 3000); // Try to reconnect after 3 seconds
            };

            ws.onerror = (err) => {
                console.error("WebSocket error:", err);
                ws.close();
            };
        };

        connect();

        return () => {
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            wsRef.current?.close();
        };
    }, [user?.id, useAuthStore.getState().token]); // Depends on user presence and token

    const sendSignal = useCallback((data: any) => {
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ ...data, friendId: currentFriendId }));
        } else {
            console.warn("Could not send signal: WebSocket is not open", data.type);
            if (data.type === 'call:request') {
                toastLib.showToast("Connection lost. Reconnecting...", "error");
            }
        }
    }, [currentFriendId]);

    const selectUser = useCallback(async (userId: number) => {
        const existing = friends.find(f => f.senderId === userId || f.receiverId === userId);
        if (existing) {
            selectFriend(existing.id);
        } else {
            setSelectedUserId(userId);
            setCurrentFriendId(null);
            setMessages([]);
        }
    }, [friends, selectFriend]);

    const sendFriendRequest = useCallback(async (targetUserId: number) => {
        try {
            const res = await api.post("/friends/request", { userId: targetUserId });
            setFriends(prev => [...prev.filter(f => f.id !== res.id), res]);
            selectFriend(res.id);
            toastLib.showToast("Friend request sent!", "success");
        } catch (e: any) { toastLib.showToast(e.message, "error"); }
    }, [selectFriend]);

    const acceptFriendRequest = useCallback(async (friendshipId: number) => {
        try {
            await api.post(`/friends/accept/${friendshipId}`, {});
            setFriends(prev => prev.map(f => f.id === friendshipId ? { ...f, status: "ACCEPTED" } : f));
            toastLib.showToast("Request accepted!", "success");
        } catch (e: any) { toastLib.showToast(e.message, "error"); }
    }, []);

    const unfriend = useCallback(async (friendshipId: number) => {
        try {
            await api.del(`/friends/${friendshipId}`);
            setFriends(prev => prev.filter(f => f.id !== friendshipId));
            if (currentFriendId === friendshipId) {
                setCurrentFriendId(null);
                setMessages([]);
            }
            toastLib.showToast("Friendship removed", "success");
        } catch (e: any) { toastLib.showToast(e.message, "error"); }
    }, [currentFriendId]);

    const sendMsg = useCallback((text: string, attachment?: { url: string; type: string; name?: string }, replyToId?: number) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        wsRef.current.send(JSON.stringify({
            type: "message:new",
            text,
            attachmentUrl: attachment?.url,
            attachmentType: attachment?.type,
            attachmentName: attachment?.name,
            replyToId
        }));
    }, []);

    const sendReaction = useCallback((msgId: number, emoji: string) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: "message:react", messageId: msgId, emoji }));
        }
    }, []);

    const editMsg = useCallback((msgId: number, text: string) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: "message:edit", messageId: msgId, text }));
        }
    }, []);

    const deleteMsg = useCallback((msgId: number) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: "message:delete", messageId: msgId }));
        }
    }, []);

    const handleTyping = useCallback((isTyping: boolean) => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) return;

        if (isTyping) {
            if (!typingTimeoutRef.current) ws.send(JSON.stringify({ type: "typing:start" }));
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

    return {
        connected,
        friends,
        currentFriendId,
        messages,
        onlineUsers,
        typingUsers,
        selectedUserId,
        wsRef,
        selectFriend,
        selectUser,
        sendFriendRequest,
        acceptFriendRequest,
        unfriend,
        sendMsg,
        sendReaction,
        editMsg,
        deleteMsg,
        handleTyping,
        setSignalHandler,
        callStatus,
        setCallStatus,
        remoteStream,
        setRemoteStream,
        callType,
        setCallType,
        activeCallUserId,
        setActiveCallUserId,
        hasMoreMessages,
        loadingMessages,
        loadMoreMessages,
        hasMoreFriends,
        loadingFriends,
        loadMoreFriends,
        sendSignal
    };
}
