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
    const [rooms, setRooms] = useState<any[]>([]);
    const [dmRooms, setDmRooms] = useState<any[]>([]);
    const [currentRoomId, setCurrentRoomId] = useState<number | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
    const [typingUsers, setTypingUsers] = useState<Set<number>>(new Set());

    const wsRef = useRef<WebSocket | null>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const signalHandlerRef = useRef<((data: any) => void) | null>(null);

    const setSignalHandler = useCallback((handler: (data: any) => void) => {
        signalHandlerRef.current = handler;
    }, []);

    // Initial Data Load
    useEffect(() => {
        if (!token) return;
        (async () => {
            try {
                const [r, d] = await Promise.all([
                    api.get("/rooms"),
                    api.get("/dm")
                ]);
                setRooms(r);
                setDmRooms(d);
                if (r.length > 0 && !currentRoomId) {
                    joinRoom(r[0].id);
                }
            } catch (e) { console.error(e); }
        })();
    }, [token]);

    // WebSocket Setup
    useEffect(() => {
        if (!token) return;
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        const ws = WS.create(token);
        wsRef.current = ws;

        ws.onopen = () => {
            setConnected(true);
            if (Notification.permission === "default") Notification.requestPermission();
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === "message:new") {
                addMsg(data.message);
                if (document.hidden && data.message.sender.id !== user?.id) {
                    const n = new Notification(`New message from ${data.message.sender.name || data.message.sender.email}`, {
                        body: data.message.text || "Sent an attachment",
                        icon: "/icon.svg"
                    });
                    n.onclick = () => window.focus();
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
            else if (data.type.startsWith("call:")) {
                if (signalHandlerRef.current) signalHandlerRef.current(data);
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
        };

        ws.onclose = () => setConnected(false);

        return () => {
            ws.close();
        };
    }, [token, user]);


    // Actions
    const addMsg = useCallback((msg: Message) => {
        setMessages(prev => [...prev, msg].sort((a, b) => a.id - b.id));
    }, []);

    const joinRoom = useCallback(async (roomId: number) => {
        setCurrentRoomId(roomId);
        wsRef.current?.send(JSON.stringify({ type: "room:join", roomId }));
        const msgs = await api.get(`/rooms/${roomId}/messages`);
        setMessages((msgs || []).sort((a: any, b: any) => a.id - b.id));
    }, []);

    const createRoom = useCallback(async (name: string) => {
        const room = await api.post("/rooms", { name });
        setRooms(prev => [...prev, room]);
        joinRoom(room.id);
    }, [joinRoom]);

    const startDm = useCallback(async (targetUser: any) => {
        const room = await api.post(`/dm/${targetUser.id}`, { name: targetUser?.name });
        setDmRooms(prev => prev.find(r => r.id === room.id) ? prev : [...prev, room]);
        joinRoom(room.id);
    }, [joinRoom]);

    const inviteUser = useCallback(async (email: string) => {
        if (!currentRoomId) return;
        try {
            await api.post(`/rooms/${currentRoomId}/invite`, { email });
            toastLib.showToast("User invited!", "success");
        } catch (e: any) {
            toastLib.showToast(e.message, "error");
        }
    }, [currentRoomId]);

    const sendMsg = useCallback((text: string, attachment?: { url: string; type: string }) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        wsRef.current.send(JSON.stringify({
            type: "message:new",
            text,
            attachmentUrl: attachment?.url,
            attachmentType: attachment?.type
        }));
    }, []);

    const sendReaction = useCallback((msgId: number, emoji: string) => {
        if (!wsRef.current) return;
        wsRef.current.send(JSON.stringify({ type: "message:react", messageId: msgId, emoji }));
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
        rooms,
        dmRooms,
        currentRoomId,
        messages,
        onlineUsers,
        typingUsers,
        wsRef,
        joinRoom,
        createRoom,
        startDm,
        inviteUser,
        sendMsg,
        sendReaction,
        handleTyping,
        setSignalHandler
    };
}
