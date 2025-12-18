import { useEffect, useRef, useState, useCallback } from 'react';

interface UseWebRTCProps {
    onSignal: (data: any) => void;
    onStream: (stream: MediaStream) => void;
    video?: boolean;
}

export function useWebRTC({ onSignal, onStream, video = false }: UseWebRTCProps) {
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const pendingOfferRef = useRef<any>(null);
    const pendingCandidatesRef = useRef<any[]>([]);
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
        pendingOfferRef.current = null;
        pendingCandidatesRef.current = [];
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
                video: video ? {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                } : false
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

    const answerCall = useCallback(async () => {
        if (!pendingOfferRef.current) {
            console.error('No pending offer to answer');
            return;
        }

        // Save pending data before cleanup clears it
        const savedOffer = pendingOfferRef.current;
        const savedCandidates = [...pendingCandidatesRef.current];

        cleanup();
        const pc = createPeerConnection();

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
                video: video ? {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                } : false
            });
            localStreamRef.current = stream;
            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            await pc.setRemoteDescription(new RTCSessionDescription(savedOffer));

            // Process any queued ICE candidates
            for (const candidate of savedCandidates) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (err) {
                    console.error('Failed to add queued ICE candidate:', err);
                }
            }
            pendingCandidatesRef.current = [];

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            onSignal({ type: 'call:answer', answer });

            // Clear pending offer
            pendingOfferRef.current = null;
        } catch (err) {
            console.error('Failed to answer call', err);
            cleanup();
        }
    }, [createPeerConnection, onSignal, cleanup, video]);

    const handleSignal = useCallback(async (data: any) => {
        if (data.type === 'call:request') {
            // Store the offer but don't get media yet - wait for user to accept
            pendingOfferRef.current = data.offer;
            return;
        }

        if (!pcRef.current && data.type !== 'call:request') return;

        if (data.type === 'call:answer') {
            if (pcRef.current && pcRef.current.signalingState !== 'closed') {
                try {
                    await pcRef.current.setRemoteDescription(
                        new RTCSessionDescription(data.answer)
                    );

                    // 🔥 Flush buffered ICE candidates AFTER remote description
                    for (const candidate of pendingCandidatesRef.current) {
                        try {
                            await pcRef.current.addIceCandidate(
                                new RTCIceCandidate(candidate)
                            );
                        } catch (err) {
                            console.error('Failed to add buffered ICE:', err);
                        }
                    }
                    pendingCandidatesRef.current = [];
                } catch (err) {
                    console.error('Failed to set remote description:', err);
                }
            }
            return;
        }

        if (data.type === 'call:signal' && data.candidate) {
            if (!pcRef.current || pcRef.current.signalingState === 'closed') {
                return;
            }

            // ✅ ALWAYS buffer if remoteDescription not set yet
            if (pcRef.current.remoteDescription) {
                try {
                    await pcRef.current.addIceCandidate(
                        new RTCIceCandidate(data.candidate)
                    );
                } catch (err) {
                    console.error('Failed to add ICE candidate:', err);
                }
            } else {
                pendingCandidatesRef.current.push(data.candidate);
            }
            return;
        }

        if (
            data.type === 'call:cancel' ||
            data.type === 'call:reject' ||
            data.type === 'call:end'
        ) {
            pendingOfferRef.current = null;
            pendingCandidatesRef.current = [];
            cleanup();
        }
    }, [cleanup]);


    const toggleAudio = useCallback(() => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                return audioTrack.enabled;
            }
        }
        return true;
    }, []);

    const toggleVideo = useCallback(() => {
        if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                return videoTrack.enabled;
            }
        }
        return true;
    }, []);

    return { startCall, answerCall, handleSignal, cleanup, connectionState, localStream: localStreamRef.current, toggleAudio, toggleVideo };
}
