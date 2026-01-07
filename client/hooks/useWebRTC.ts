import { useEffect, useRef, useState, useCallback } from 'react';

interface UseWebRTCProps {
    onSignal: (data: any) => void;
    onStream: (stream: MediaStream) => void;
    onError?: (message: string) => void;
    video?: boolean;
}

export function useWebRTC({ onSignal, onStream, onError, video = false }: UseWebRTCProps) {
    const onSignalRef = useRef(onSignal);
    const onStreamRef = useRef(onStream);
    const onErrorRef = useRef(onError);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const pendingOfferRef = useRef<any>(null);
    const pendingCandidatesRef = useRef<any[]>([]);
    const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
    const bufferedRemoteStreamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        onSignalRef.current = onSignal;
        onStreamRef.current = onStream;
        onErrorRef.current = onError;
    }, [onSignal, onStream, onError]);

    const cleanup = useCallback(() => {
        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
            setLocalStream(null);
        }
        pendingOfferRef.current = null;
        pendingCandidatesRef.current = [];
        bufferedRemoteStreamRef.current = null;
        setConnectionState('new');
    }, []);

    const mangleSdp = (sdp: string) => {
        // Force high-quality Opus bitrate (default is ~32kbps, we want ~128kbps)
        return sdp.replace(/a=fmtp:(\d+) (.*)/g, (match, pt, params) => {
            if (params.includes('opus')) {
                return `${match};stereo=1;sprop-stereo=1;maxaveragebitrate=128000;useinbandfec=1`;
            }
            return match;
        });
    };

    const createPeerConnection = useCallback(() => {
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' },
                // Note: Production environments should include a TURN server for reliability
                // { urls: 'turn:your-turn-server.com', username: '...', credential: '...' }
            ]
        });

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                onSignalRef.current({ type: 'call:signal', candidate: event.candidate });
            }
        };

        pc.ontrack = (event) => {
            const stream = event.streams[0];
            if (pc.connectionState === 'connected') {
                onStreamRef.current(stream);
            } else {
                bufferedRemoteStreamRef.current = stream;
            }
        };

        pc.onconnectionstatechange = () => {
            setConnectionState(pc.connectionState);
            if (pc.connectionState === 'connected' && bufferedRemoteStreamRef.current) {
                onStreamRef.current(bufferedRemoteStreamRef.current);
                bufferedRemoteStreamRef.current = null;
            }
        };

        pcRef.current = pc;
        return pc;
    }, [onSignal, onStream]);

    const startCall = useCallback(async (targetUserId: number, isVideoIntent?: boolean) => {
        cleanup();
        const pc = createPeerConnection();
        const isVideo = isVideoIntent ?? video;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 48000,
                    channelCount: 1, // Mono is usually better for voice to avoid phase issues unless needed
                },
                video: isVideo ? {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                } : false
            });
            localStreamRef.current = stream;
            setLocalStream(stream);

            if (pc.signalingState === 'closed') {
                stream.getTracks().forEach(track => track.stop());
                return;
            }

            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            const offer = await pc.createOffer();
            const mangledOffer = { ...offer, sdp: mangleSdp(offer.sdp || '') };
            await pc.setLocalDescription(mangledOffer);
            onSignalRef.current({ type: 'call:request', offer: mangledOffer, targetUserId });
        } catch (err) {
            console.error('Failed to get local stream', err);
            cleanup();
        }
    }, [createPeerConnection, cleanup, video, mangleSdp]);

    const answerCall = useCallback(async (isVideoIntent?: boolean) => {
        if (!pendingOfferRef.current) {
            console.error('No pending offer to answer');
            return;
        }

        // Save pending data before cleanup clears it
        const savedOffer = pendingOfferRef.current;
        const savedCandidates = [...pendingCandidatesRef.current];
        const isVideo = isVideoIntent ?? video;

        cleanup();
        const pc = createPeerConnection();

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 48000,
                    channelCount: 1,
                },
                video: isVideo ? {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                } : false
            });
            localStreamRef.current = stream;
            setLocalStream(stream);
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
            const mangledAnswer = { ...answer, sdp: mangleSdp(answer.sdp || '') };
            await pc.setLocalDescription(mangledAnswer);
            onSignalRef.current({ type: 'call:answer', answer: mangledAnswer });

            // Clear pending offer
            pendingOfferRef.current = null;
        } catch (err) {
            console.error('Failed to answer call', err);
            cleanup();
        }
    }, [createPeerConnection, cleanup, video, mangleSdp]);

    const handleSignal = useCallback(async (data: any) => {
        if (data.type === 'call:request') {
            // Store the offer but don't get media yet - wait for user to accept
            pendingOfferRef.current = data.offer;
            return;
        }

        if (data.type === 'call:error') {
            if (onErrorRef.current) onErrorRef.current(data.error);
            cleanup();
            return;
        }

        if (!pcRef.current && data.type !== 'call:request' && data.type !== 'call:signal') return;

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
            if (pcRef.current && pcRef.current.signalingState === 'closed') {
                return;
            }

            // ✅ ALWAYS buffer if remoteDescription not set yet OR peer connection doesn't exist yet
            if (pcRef.current && pcRef.current.remoteDescription) {
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

    return { startCall, answerCall, handleSignal, cleanup, connectionState, localStream, toggleAudio, toggleVideo };
}
