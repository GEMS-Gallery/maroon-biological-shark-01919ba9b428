import React, { useState, useEffect, useRef } from 'react';
import { backend } from 'declarations/backend';
import { Button, TextField, CircularProgress, Box, Typography } from '@mui/material';
import { styled } from '@mui/system';

const VideoContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '70vh',
  backgroundColor: theme.palette.grey[200],
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden',
}));

const ControlsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
}));

const App: React.FC = () => {
  const [callId, setCallId] = useState<string | null>(null);
  const [inputCallId, setInputCallId] = useState<string>('');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const createPeerConnection = () => {
    const configuration: RTCConfiguration = {
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    };
    const pc = new RTCPeerConnection(configuration);

    pc.onicecandidate = async (event) => {
      if (event.candidate && callId) {
        await backend.addIceCandidate(BigInt(callId), JSON.stringify(event.candidate));
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    peerConnectionRef.current = pc;
    return pc;
  };

  const startCall = async () => {
    setIsLoading(true);
    try {
      const result = await backend.initializeCall();
      if ('ok' in result) {
        const newCallId = result.ok.toString();
        setCallId(newCallId);
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        const pc = createPeerConnection();
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await backend.sendOffer(BigInt(newCallId), JSON.stringify(offer));
      } else {
        console.error('Failed to initialize call:', result.err);
      }
    } catch (error) {
      console.error('Error starting call:', error);
    }
    setIsLoading(false);
  };

  const joinCall = async () => {
    if (!inputCallId) return;
    setIsLoading(true);
    try {
      const result = await backend.joinCall(BigInt(inputCallId));
      if ('ok' in result) {
        setCallId(inputCallId);
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        const pc = createPeerConnection();
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
        const sessionResult = await backend.getCallSession(BigInt(inputCallId));
        if ('ok' in sessionResult) {
          const session = sessionResult.ok;
          if (session.offers[0]) {
            const offer = JSON.parse(session.offers[0]);
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await backend.sendAnswer(BigInt(inputCallId), JSON.stringify(answer));
          }
        }
      } else {
        console.error('Failed to join call:', result.err);
      }
    } catch (error) {
      console.error('Error joining call:', error);
    }
    setIsLoading(false);
  };

  const endCall = async () => {
    if (!callId) return;
    setIsLoading(true);
    try {
      const result = await backend.endCall(BigInt(callId));
      if ('ok' in result) {
        setCallId(null);
        setInputCallId('');
        if (localStream) {
          localStream.getTracks().forEach(track => track.stop());
          setLocalStream(null);
        }
        if (remoteStream) {
          remoteStream.getTracks().forEach(track => track.stop());
          setRemoteStream(null);
        }
        if (peerConnectionRef.current) {
          peerConnectionRef.current.close();
          peerConnectionRef.current = null;
        }
      } else {
        console.error('Failed to end call:', result.err);
      }
    } catch (error) {
      console.error('Error ending call:', error);
    }
    setIsLoading(false);
  };

  return (
    <Box className="App" sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ textAlign: 'center', mt: 2 }}>
        IC Video Chat
      </Typography>
      <VideoContainer>
        {localStream && (
          <video ref={localVideoRef} autoPlay muted playsInline style={{ width: '50%', height: '100%', objectFit: 'cover' }} />
        )}
        {remoteStream && (
          <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '50%', height: '100%', objectFit: 'cover' }} />
        )}
        {!localStream && !remoteStream && (
          <Typography variant="h6">No active video call</Typography>
        )}
      </VideoContainer>
      <ControlsContainer>
        {!callId && (
          <>
            <Button variant="contained" color="primary" onClick={startCall} disabled={isLoading} sx={{ mr: 2 }}>
              {isLoading ? <CircularProgress size={24} /> : 'Start Call'}
            </Button>
            <TextField
              value={inputCallId}
              onChange={(e) => setInputCallId(e.target.value)}
              label="Enter Call ID"
              variant="outlined"
              size="small"
              sx={{ mr: 2 }}
            />
            <Button variant="contained" color="secondary" onClick={joinCall} disabled={isLoading || !inputCallId}>
              {isLoading ? <CircularProgress size={24} /> : 'Join Call'}
            </Button>
          </>
        )}
        {callId && (
          <>
            <TextField
              value={callId}
              label="Current Call ID"
              variant="outlined"
              size="small"
              sx={{ mr: 2 }}
              InputProps={{ readOnly: true }}
            />
            <Button variant="contained" color="error" onClick={endCall} disabled={isLoading}>
              {isLoading ? <CircularProgress size={24} /> : 'End Call'}
            </Button>
          </>
        )}
      </ControlsContainer>
    </Box>
  );
};

export default App;
