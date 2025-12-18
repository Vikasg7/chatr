import { useEffect, useRef, useState, useCallback } from 'react';

interface UseWebRTCProps {
    onSignal: (data: any) => void;
    onStream: (stream: MediaStream) => void;
}

export function useWebRTC({ onSignal, onStream }: UseWebRTCProps) {
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');

    const cleanup = useCallback(() => {
        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }
        setConnectionState('new');
    }, []);

    const createPeerConnection = useCallback(() => {
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                onSignal({ type: 'call:signal', candidate: event.candidate });
            }
        };

        pc.ontrack = (event) => {
            onStream(event.streams[0]);
        };

        pc.onconnectionstatechange = () => {
            setConnectionState(pc.connectionState);
        };

        pcRef.current = pc;
        return pc;
    }, [onSignal, onStream]);

    const startCall = useCallback(async () => {
        cleanup();
        const pc = createPeerConnection();

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
                video: false
            });
            localStreamRef.current = stream;
            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            onSignal({ type: 'call:request', offer });
        } catch (err) {
            console.error('Failed to get local stream', err);
            cleanup();
        }
    }, [createPeerConnection, onSignal, cleanup]);

    const handleSignal = useCallback(async (data: any) => {
        if (!pcRef.current && data.type !== 'call:request') return;

        if (data.type === 'call:request') {
            cleanup();
            const pc = createPeerConnection();

            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                    },
                    video: false
                });
                localStreamRef.current = stream;
                stream.getTracks().forEach(track => pc.addTrack(track, stream));

                await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                onSignal({ type: 'call:answer', answer });
            } catch (err) {
                console.error('Failed to answer call', err);
            }
        } else if (data.type === 'call:answer') {
            if (pcRef.current && pcRef.current.signalingState !== 'closed') {
                try {
                    await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
                } catch (err) {
                    console.error('Failed to set remote description:', err);
                }
            }
        } else if (data.type === 'call:signal' && data.candidate) {
            if (pcRef.current && pcRef.current.signalingState !== 'closed' && pcRef.current.remoteDescription) {
                try {
                    await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
                } catch (err) {
                    console.error('Failed to add ICE candidate:', err);
                }
            }
        }
    }, [createPeerConnection, onSignal, cleanup]);

    return { startCall, handleSignal, cleanup, connectionState };
}
