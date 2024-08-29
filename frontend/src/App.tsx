import React, { useState, useEffect, useRef, useCallback } from 'react';
import { backend } from 'declarations/backend';
import { Button, TextField, CircularProgress, Box, Typography, Snackbar } from '@mui/material';
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
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
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

  const createPeerConnection = useCallback(() => {
    const configuration: RTCConfiguration = {
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    };
    const pc = new RTCPeerConnection(configuration);

    pc.onicecandidate = async (event) => {
      if (event.candidate && callId) {
        try {
          await backend.addIceCandidate(BigInt(callId), JSON.stringify(event.candidate));
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
          setSnackbarMessage('Error adding ICE candidate');
        }
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [callId]);

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
        setSnackbarMessage('Call started. Waiting for someone to join...');
      } else {
        console.error('Failed to initialize call:', result.err);
        setSnackbarMessage('Failed to start call');
      }
    } catch (error) {
      console.error('Error starting call:', error);
      setSnackbarMessage('Error starting call');
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
        const session = result.ok;
        if (session.offers[0]) {
          const offer = JSON.parse(session.offers[0]);
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await backend.sendAnswer(BigInt(inputCallId), JSON.stringify(answer));
          setSnackbarMessage('Joined call successfully');
        } else {
          setSnackbarMessage('No offer available. Try again.');
        }
      } else {
        console.error('Failed to join call:', result.err);
        setSnackbarMessage('Failed to join call');
      }
    } catch (error) {
      console.error('Error joining call:', error);
      setSnackbarMessage('Error joining call');
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
        setSnackbarMessage('Call ended');
      } else {
        console.error('Failed to end call:', result.err);
        setSnackbarMessage('Failed to end call');
      }
    } catch (error) {
      console.error('Error ending call:', error);
      setSnackbarMessage('Error ending call');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    const pollCallSession = async () => {
      if (!callId) return;
      try {
        const result = await backend.getCallSession(BigInt(callId));
        if ('ok' in result) {
          const session = result.ok;
          const pc = peerConnectionRef.current;
          if (pc) {
            if (pc.localDescription && pc.localDescription.type === 'offer' && session.answers[1]) {
              const answer = JSON.parse(session.answers[1]);
              await pc.setRemoteDescription(new RTCSessionDescription(answer));
            }
            session.iceCandidates.forEach((candidates, index) => {
              if (index !== (pc.localDescription?.type === 'offer' ? 0 : 1)) {
                candidates.forEach(async (candidate) => {
                  await pc.addIceCandidate(new RTCIceCandidate(JSON.parse(candidate)));
                });
              }
            });
          }
        }
      } catch (error) {
        console.error('Error polling call session:', error);
      }
    };

    const intervalId = setInterval(pollCallSession, 1000);
    return () => clearInterval(intervalId);
  }, [callId]);

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
      <Snackbar
        open={!!snackbarMessage}
        autoHideDuration={6000}
        onClose={() => setSnackbarMessage('')}
        message={snackbarMessage}
      />
    </Box>
  );
};

export default App;
