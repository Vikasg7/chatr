import { useState, useRef, useCallback } from 'react';

const ICE_SERVERS = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export function useWebRTC(wsRef: React.MutableRefObject<WebSocket | null>, userId?: number) {
    const [callState, setCallState] = useState<"idle" | "incoming" | "calling" | "connected">("idle");
    const [callMeta, setCallMeta] = useState<{ caller?: { id: number; name: string }; target?: { id: number; name: string } }>({});
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);

    const localStreamRef = useRef<MediaStream | null>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

    const endCall = useCallback(() => {
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => t.stop());
            localStreamRef.current = null;
        }
        setLocalStream(null);
        setRemoteStream(null);
        setCallState("idle");
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: "call:end" }));
        }
    }, [wsRef]);

    const startCall = useCallback(async (roomId: number) => {
        setCallState("calling");
        setCallMeta({ target: { id: 0, name: "Room" } });

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setLocalStream(stream);
            localStreamRef.current = stream;

            const pc = new RTCPeerConnection(ICE_SERVERS);
            peerConnectionRef.current = pc;

            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            pc.onicecandidate = (event) => {
                if (event.candidate && wsRef.current) {
                    wsRef.current.send(JSON.stringify({ type: "call:candidate", candidate: event.candidate }));
                }
            };

            pc.ontrack = (event) => {
                setRemoteStream(event.streams[0]);
            };

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            if (wsRef.current) wsRef.current.send(JSON.stringify({ type: "call:invite", sdp: offer }));
        } catch (err) {
            console.error("Failed to start call", err);
            endCall();
        }
    }, [wsRef, endCall]);

    const acceptCall = useCallback(async () => {
        setCallState("connected");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setLocalStream(stream);
            localStreamRef.current = stream;

            const pc = peerConnectionRef.current || new RTCPeerConnection(ICE_SERVERS);
            peerConnectionRef.current = pc;

            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            pc.onicecandidate = (event) => {
                if (event.candidate && wsRef.current) {
                    wsRef.current.send(JSON.stringify({ type: "call:candidate", candidate: event.candidate }));
                }
            };

            pc.ontrack = (event) => {
                setRemoteStream(event.streams[0]);
            };

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            if (wsRef.current) wsRef.current.send(JSON.stringify({ type: "call:answer", sdp: answer }));

        } catch (err) {
            console.error("Failed to accept", err);
            endCall();
        }
    }, [wsRef, endCall]);

    const rejectCall = useCallback(() => {
        if (wsRef.current) wsRef.current.send(JSON.stringify({ type: "call:reject" }));
        setCallState("idle");
    }, [wsRef]);

    const handleSignal = useCallback(async (data: any) => {
        if (data.type === "call:invite") {
            if (data.senderId === userId) return;

            setCallState("incoming");
            setCallMeta({ caller: { id: data.senderId, name: "Incoming Call" } });

            const pc = new RTCPeerConnection(ICE_SERVERS);
            peerConnectionRef.current = pc;
            pc.onicecandidate = (event) => {
                if (event.candidate && wsRef.current) {
                    wsRef.current.send(JSON.stringify({ type: "call:candidate", candidate: event.candidate }));
                }
            };
            pc.ontrack = (event) => {
                setRemoteStream(event.streams[0]);
            };
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));

        } else if (data.type === "call:answer") {
            if (peerConnectionRef.current) {
                await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
                setCallState("connected");
            }
        } else if (data.type === "call:candidate") {
            if (peerConnectionRef.current) {
                await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
        } else if (data.type === "call:end" || data.type === "call:reject") {
            if (peerConnectionRef.current) {
                peerConnectionRef.current.close();
                peerConnectionRef.current = null;
            }
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(t => t.stop());
                localStreamRef.current = null;
            }
            setLocalStream(null);
            setRemoteStream(null);
            setCallState("idle");
        }
    }, [wsRef, userId]);

    const toggleMute = useCallback(() => {
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach(t => t.enabled = !t.enabled);
            setIsMuted(!localStreamRef.current.getAudioTracks()[0].enabled);
        }
    }, []);

    const toggleVideo = useCallback(() => {
        if (localStreamRef.current) {
            localStreamRef.current.getVideoTracks().forEach(t => t.enabled = !t.enabled);
            setIsVideoOff(!localStreamRef.current.getVideoTracks()[0].enabled);
        }
    }, []);

    return {
        callState,
        callMeta,
        localStream,
        remoteStream,
        isMuted,
        isVideoOff,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        handleSignal,
        toggleMute,
        toggleVideo
    };
}
