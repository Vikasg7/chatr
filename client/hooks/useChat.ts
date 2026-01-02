import { useState, useRef, useEffect, useCallback } from 'react';
import * as api from "@/lib/api";
import * as WS from "@/lib/ws";
import toastLib from "@/lib/toast";

interface Message {
    id: number;
    text: string;
    sender: { id: number; name: string | null; email: string };
    createdAt: string;
    reactions?: any[];
    attachmentUrl?: string;
    attachmentType?: string;
    metadata?: any;
}

export function useChat(token: string | null, user: any) {
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

    const wsRef = useRef<WebSocket | null>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const signalHandlerRef = useRef<((data: any) => void) | null>(null);
    const friendsRef = useRef<any[]>([]);

    useEffect(() => {
        friendsRef.current = friends;
    }, [friends]);

    const setSignalHandler = useCallback((handler: (data: any) => void) => {
        signalHandlerRef.current = handler;
    }, []);

    // Actions
    const addMsg = useCallback((msg: Message) => {
        setMessages(prev => [...prev, msg].sort((a, b) => a.id - b.id));
    }, []);

    const selectFriend = useCallback(async (friendshipId: number, friendsOverride?: any[]) => {
        const list = friendsOverride || friends;
        const friendship = list.find(f => f.id === friendshipId);
        if (friendship) {
            const otherUser = friendship.senderId === user?.id ? friendship.receiver : friendship.sender;
            setSelectedUserId(otherUser?.id || null);
        }
        setCurrentFriendId(friendshipId);
        wsRef.current?.send(JSON.stringify({ type: "chat:join", friendId: friendshipId }));
        const msgs = await api.get(`/friends/${friendshipId}/messages`);
        setMessages((msgs || []).sort((a: any, b: any) => a.id - b.id));
    }, [user?.id, friends]);

    // Initial Data Load
    useEffect(() => {
        if (!token) return;
        (async () => {
            try {
                const f = await api.get("/friends");
                setFriends(f);

                // One-time auto-select on mount
                const firstAccepted = f.find((fr: any) => fr.status === "ACCEPTED");
                if (firstAccepted && !currentFriendId) {
                    selectFriend(firstAccepted.id, f);
                }
            } catch (e) { console.error(e); }
        })();
    }, [token]);

    // Auto-sync WebSocket session when a friendship is found for the selected user
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

    // WebSocket Setup
    useEffect(() => {
        if (!token) return;
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        const ws = WS.create(token);
        wsRef.current = ws;

        ws.onopen = () => {
            setConnected(true);
            if (currentFriendId) {
                ws.send(JSON.stringify({ type: "chat:join", friendId: currentFriendId }));
            }
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === "message:new") {
                addMsg(data.message);

                // Show browser notification for new messages
                if (data.message.sender.id !== user?.id) {
                    const shouldNotify = !document.hasFocus() || data.message.friendId !== currentFriendId;

                    if (shouldNotify && Notification.permission === 'granted') {
                        const senderName = data.message.sender.name || data.message.sender.email.split('@')[0];
                        const messageText = data.message.text || (data.message.attachmentType ? `Sent ${data.message.attachmentType.toLowerCase()}` : 'New message');

                        const notification = new Notification(`${senderName}`, {
                            body: messageText,
                            icon: data.message.sender.avatarUrl || '/icon.png',
                            tag: `msg-${data.message.id}`,
                            requireInteraction: false
                        });

                        notification.onclick = () => {
                            window.focus();
                            notification.close();
                        };

                        setTimeout(() => notification.close(), 5000);
                    }
                }
            }
            else if (data.type === "status:list") setOnlineUsers(new Set(data.users));
            else if (data.type === "status:online") setOnlineUsers(prev => new Set(prev).add(data.userId));
            else if (data.type === "status:offline") setOnlineUsers(prev => {
                const next = new Set(prev);
                next.delete(data.userId);
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
                setFriends(prev => {
                    if (prev.find(f => f.id === data.friend.id)) return prev;
                    return [...prev, data.friend];
                });
                toastLib.showToast("New friend request!", "info");
            }
            else if (data.type === "friend:updated") {
                setFriends(prev => prev.map(f => f.id === data.friend.id ? data.friend : f));
                if (data.friend.status === "ACCEPTED") {
                    toastLib.showToast("Friend request accepted!", "success");
                }
            }
            else if (data.type === "friend:deleted") {
                setFriends(prev => prev.filter(f => f.id !== data.friendId));
                if (currentFriendId === data.friendId) {
                    // Stay on the conversation but as non-friend
                    const otherId = data.senderId === user?.id ? data.receiverId : data.senderId;
                    setSelectedUserId(otherId);
                    setCurrentFriendId(null);
                    setMessages([]);
                }
                toastLib.showToast("Friendship removed", "info");
            }
            else if (data.type === "typing:start") {
                setTypingUsers(prev => new Set(prev).add(data.userId));
            }
            else if (data.type === "typing:stop") {
                setTypingUsers(prev => {
                    const next = new Set(prev);
                    next.delete(data.userId);
                    return next;
                });
            }
            else if (data.type === "call:type") {
                setCallType(data.callType);
            }
            else if (data.type === "call:request") {
                if (callStatus !== 'IDLE') {
                    wsRef.current?.send(JSON.stringify({ type: "call:reject", friendId: currentFriendId }));
                    return;
                }
                setCallStatus('RINGING_IN');
                if (signalHandlerRef.current) signalHandlerRef.current(data);
            }
            else if (data.type === "call:cancel" || data.type === "call:reject" || data.type === "call:end") {
                setCallStatus('IDLE');
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
                if (signalHandlerRef.current) signalHandlerRef.current(data);
            }
        };

        ws.onclose = () => setConnected(false);

        return () => {
            ws.close();
        };
    }, [token, user?.id]);



    const selectUser = useCallback(async (userId: number) => {
        // Check if we already have a friendship with this user
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
            setFriends(prev => {
                if (prev.find(f => f.id === res.id)) return prev;
                return [...prev, res];
            });
            selectFriend(res.id);
            toastLib.showToast("Friend request sent!", "success");
        } catch (e: any) {
            toastLib.showToast(e.message, "error");
        }
    }, [selectFriend]);

    const acceptFriendRequest = useCallback(async (friendshipId: number) => {
        try {
            await api.post(`/friends/accept/${friendshipId}`, {});
            setFriends(prev => prev.map(f => f.id === friendshipId ? { ...f, status: "ACCEPTED" } : f));
            toastLib.showToast("Request accepted!", "success");
        } catch (e: any) {
            toastLib.showToast(e.message, "error");
        }
    }, []);

    const unfriend = useCallback(async (friendshipId: number) => {
        try {
            await api.del(`/friends/${friendshipId}`);
            setFriends(prev => prev.filter(f => f.id !== friendshipId));
            if (currentFriendId === friendshipId) {
                // Keep the same user selected, but now as "not a friend"
                // selectedUserId is already set in selectFriend
                setCurrentFriendId(null);
                setMessages([]);
            }
            toastLib.showToast("Friendship removed", "success");
        } catch (e: any) {
            toastLib.showToast(e.message, "error");
        }
    }, [currentFriendId]);

    const sendMsg = useCallback((text: string, attachment?: { url: string; type: string; name?: string }) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        wsRef.current.send(JSON.stringify({
            type: "message:new",
            text,
            attachmentUrl: attachment?.url,
            attachmentType: attachment?.type,
            attachmentName: attachment?.name
        }));
    }, []);

    const sendReaction = useCallback((msgId: number, emoji: string) => {
        if (!wsRef.current) return;
        wsRef.current.send(JSON.stringify({ type: "message:react", messageId: msgId, emoji }));
    }, []);

    const editMsg = useCallback((msgId: number, text: string) => {
        if (!wsRef.current) return;
        wsRef.current.send(JSON.stringify({ type: "message:edit", messageId: msgId, text }));
    }, []);

    const deleteMsg = useCallback((msgId: number) => {
        if (!wsRef.current) return;
        wsRef.current.send(JSON.stringify({ type: "message:delete", messageId: msgId }));
    }, []);

    const handleTyping = useCallback((isTyping: boolean) => {
        const ws = wsRef.current;
        if (!ws) return;

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
        setCallType
    };
}
