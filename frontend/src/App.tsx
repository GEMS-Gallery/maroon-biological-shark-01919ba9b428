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
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

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

  const startCall = async () => {
    setIsLoading(true);
    try {
      const result = await backend.initializeCall();
      if ('ok' in result) {
        setCallId(result.ok.toString());
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
      } else {
        console.error('Failed to initialize call:', result.err);
      }
    } catch (error) {
      console.error('Error starting call:', error);
    }
    setIsLoading(false);
  };

  const joinCall = async () => {
    if (!callId) return;
    setIsLoading(true);
    try {
      const result = await backend.joinCall(BigInt(callId));
      if ('ok' in result) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        // Here you would typically set up WebRTC connection
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
        if (localStream) {
          localStream.getTracks().forEach(track => track.stop());
          setLocalStream(null);
        }
        if (remoteStream) {
          remoteStream.getTracks().forEach(track => track.stop());
          setRemoteStream(null);
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
          <Button variant="contained" color="primary" onClick={startCall} disabled={isLoading}>
            {isLoading ? <CircularProgress size={24} /> : 'Start Call'}
          </Button>
        )}
        {callId && (
          <>
            <TextField
              value={callId}
              label="Call ID"
              variant="outlined"
              size="small"
              sx={{ mr: 2 }}
              InputProps={{ readOnly: true }}
            />
            <Button variant="contained" color="secondary" onClick={joinCall} disabled={isLoading} sx={{ mr: 2 }}>
              {isLoading ? <CircularProgress size={24} /> : 'Join Call'}
            </Button>
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
