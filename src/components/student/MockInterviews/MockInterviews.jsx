import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, Typography, Button, Box, Card, CardContent, 
  Alert, CircularProgress, Grid, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, Paper, LinearProgress,
  IconButton, Tooltip
} from '@mui/material';
import { 
  PlayArrow, Mic, Videocam, CheckCircle, 
  ChatBubbleOutline, Code, Groups, RefreshOutlined
} from '@mui/icons-material';
import { createInterviewSession, testAPIConnection } from '../../../services/API/index2';

// ═══ iMeetPro Theme Tokens ═══
const T = {
  primary: '#00838f',
  primaryLight: '#26c6da',
  primaryDark: '#004d54',
  secondary: '#0d9488',
  secondaryLight: '#5eead4',
  navy: '#1a5276',
  blue: '#2980b9',
  blueLight: '#3498c8',
  text: '#0f172a',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  surface: '#f0f4f8',
  cardBg: '#fff',
  borderLight: 'rgba(41,128,185,0.08)',
  borderMedium: 'rgba(41,128,185,0.15)',
  success: '#0d9488',
  warning: '#f59e0b',
  error: '#ef4444',
  gradientPrimary: 'linear-gradient(135deg, #1a5276 0%, #2980b9 100%)',
  gradientTeal: 'linear-gradient(135deg, #00838f 0%, #26c6da 100%)',
  gradientSuccess: 'linear-gradient(135deg, #0d9488 0%, #5eead4 100%)',
  gradientAccent: 'linear-gradient(135deg, #1a5276 0%, #0d9488 100%)',
};

const cardBase = {
  borderRadius: '18px',
  background: T.cardBg,
  border: `1px solid ${T.borderLight}`,
  boxShadow: '0 1px 3px rgba(26,82,118,0.05), 0 4px 20px rgba(26,82,118,0.04)',
  overflow: 'hidden',
  transition: 'box-shadow 0.3s ease, transform 0.3s ease',
};

// Interview round configuration - iMeetPro themed colors
const INTERVIEW_ROUNDS = [
  { 
    name: 'Communication', 
    duration: 5, 
    icon: ChatBubbleOutline,
    color: T.blue,
    gradient: 'linear-gradient(135deg, #2980b9 0%, #3498c8 100%)',
    description: 'Clarity, articulation, fluency, and confidence',
    focus: ['Casual conversation', 'Confidence building', 'Expression clarity']
  },
  { 
    name: 'Technical', 
    duration: 25, 
    icon: Code,
    color: T.primary,
    gradient: T.gradientTeal,
    description: 'Conceptual understanding and problem-solving',
    focus: ['Adaptive difficulty', 'Reasoning assessment', 'Knowledge depth']
  },
  { 
    name: 'HR/Behavioral', 
    duration: 10, 
    icon: Groups,
    color: T.secondary,
    gradient: T.gradientSuccess,
    description: 'Leadership, ethics, and professionalism',
    focus: ['Behavioral patterns', 'Real examples', 'Professional maturity']
  }
];

// Evaluation criteria with iMeetPro themed colors
const EVALUATION_CRITERIA = [
  { name: 'Communication', weight: 25, color: T.blue },
  { name: 'Technical', weight: 30, color: T.primary },
  { name: 'Leadership', weight: 15, color: T.navy },
  { name: 'Behaviour', weight: 15, color: T.secondary },
  { name: 'Confidence', weight: 15, color: T.primaryLight }
];

const StudentMockInterviews = () => {
  const navigate = useNavigate();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState(null);
  const [systemReady, setSystemReady] = useState(false);
  const [mediaPermissions, setMediaPermissions] = useState({
    camera: false,
    microphone: false,
    checked: false
  });
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);

  useEffect(() => {
    checkSystemReady();
    checkMediaPermissions();
  }, []);

  const checkSystemReady = async () => {
    try {
      console.log('🔍 Checking backend interview system...');
      
      const connectionTest = await testAPIConnection();
      
      if (connectionTest.status === 'success') {
        setSystemReady(true);
        setError(null);
        console.log('✅ Backend system ready!');
      } else {
        throw new Error(connectionTest.message || 'Backend connection failed');
      }
      
    } catch (error) {
      console.error('❌ Backend check failed:', error);
      setError(`Backend not ready: ${error.message}`);
      setSystemReady(false);
    }
  };

  const checkMediaPermissions = async () => {
    try {
      const isSecureContext = window.isSecureContext;
      const hasNavigator = typeof navigator !== 'undefined';
      const hasMediaDevices = hasNavigator && navigator.mediaDevices;
      const hasGetUserMedia = hasMediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function';

      console.log('🔍 Media environment check:', {
        isSecureContext,
        hasNavigator,
        hasMediaDevices,
        hasGetUserMedia,
        protocol: window.location.protocol,
        hostname: window.location.hostname
      });

      if (!hasNavigator) {
        throw new Error('Navigator API not available');
      }

      if (!hasMediaDevices) {
        throw new Error('MediaDevices API not supported. Please use a modern browser with HTTPS.');
      }

      if (!hasGetUserMedia) {
        throw new Error('getUserMedia not supported. Please update your browser.');
      }

      if (!isSecureContext && window.location.protocol !== 'file:') {
        throw new Error('Media access requires HTTPS. Please use https:// instead of http://');
      }

      try {
        if (navigator.permissions && navigator.permissions.query) {
          const permissions = await Promise.all([
            navigator.permissions.query({ name: 'camera' }),
            navigator.permissions.query({ name: 'microphone' })
          ]);

          const cameraGranted = permissions[0].state === 'granted';
          const microphoneGranted = permissions[1].state === 'granted';

          setMediaPermissions({
            camera: cameraGranted,
            microphone: microphoneGranted,
            checked: true
          });

          console.log('🎥 Media permissions:', { camera: cameraGranted, microphone: microphoneGranted });
        } else {
          console.log('📋 Permission API not supported, will check during interview start');
          setMediaPermissions({ camera: false, microphone: false, checked: true });
        }
      } catch (permError) {
        console.log('📋 Permission query failed, will check during interview start:', permError.message);
        setMediaPermissions({ camera: false, microphone: false, checked: true });
      }

    } catch (error) {
      console.error('❌ Media environment check failed:', error);
      setMediaPermissions({ camera: false, microphone: false, checked: true });
      setError(`Media not supported: ${error.message}`);
    }
  };

  const requestMediaPermissions = async () => {
    try {
      console.log('🎥 Requesting camera and microphone permissions...');
      
      if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
        throw new Error('getUserMedia is not supported in this browser or context. Please use HTTPS and a modern browser.');
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      stream.getTracks().forEach(track => track.stop());
      
      setMediaPermissions({
        camera: true,
        microphone: true,
        checked: true
      });
      
      setShowPermissionDialog(false);
      setError(null);
      console.log('✅ Media permissions granted');
      
      return true;
      
    } catch (error) {
      console.error('❌ Media permission request failed:', error);
      
      let errorMessage = 'Media access failed: ';
      
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Permission denied by user. Please allow camera and microphone access.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No camera or microphone found. Please connect media devices.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage += 'Media capture not supported. Please use HTTPS and a modern browser.';
      } else if (error.name === 'NotReadableError') {
        errorMessage += 'Media device in use by another application.';
      } else {
        errorMessage += error.message;
      }
      
      setError(errorMessage);
      return false;
    }
  };

  const startInterview = async () => {
    try {
      setIsStarting(true);
      setError(null);
      
      if (!window.isSecureContext && window.location.protocol !== 'file:') {
        throw new Error('🔒 HTTPS Required: Camera and microphone access requires a secure connection. Please access this page using HTTPS.');
      }
      
      if (!navigator.mediaDevices) {
        throw new Error('🌐 Browser Not Supported: Your browser doesn\'t support media devices. Please use a modern browser like Chrome, Firefox, Safari, or Edge.');
      }
      
      if (typeof navigator.mediaDevices.getUserMedia !== 'function') {
        throw new Error('📱 API Not Available: getUserMedia is not supported. Please update your browser to the latest version.');
      }
      
      if (!mediaPermissions.camera || !mediaPermissions.microphone) {
        console.log('🎥 Requesting media permissions before starting interview...');
        const granted = await requestMediaPermissions();
        if (!granted) {
          setIsStarting(false);
          return;
        }
      }
      
      console.log('🎯 Creating new interview session...');
      
      const sessionData = await createInterviewSession();
      
      console.log('✅ SESSION DATA RECEIVED:');
      console.log('Full response:', sessionData);
      console.log('Session ID:', sessionData.sessionId);
      console.log('Test ID:', sessionData.testId);
      console.log('Student Name:', sessionData.studentName);
      
      if (!sessionData.sessionId) {
        throw new Error('Backend did not return session_id');
      }
      
      if (!sessionData.testId) {
        throw new Error('Backend did not return test_id');
      }
      
      console.log('🎬 NAVIGATING TO VIDEO INTERVIEW with parameters:');
      console.log('Session ID:', sessionData.sessionId);
      console.log('Test ID:', sessionData.testId);
      console.log('Student Name:', sessionData.studentName);
      
      navigate(`/student/mock-interviews/session/${sessionData.sessionId}`, {
        state: {
          testId: sessionData.testId,
          studentName: sessionData.studentName,
          sessionData: sessionData,
          mediaPermissions: mediaPermissions
        }
      });
      
    } catch (error) {
      console.error('❌ Failed to start interview:', error);
      setError(error.message || `Failed to start interview: ${error.toString()}`);
    } finally {
      setIsStarting(false);
    }
  };

  const handlePermissionDialog = () => {
    setShowPermissionDialog(true);
  };

  const totalDuration = INTERVIEW_ROUNDS.reduce((acc, round) => acc + round.duration, 0);

  return (
    <Box sx={{ minHeight: '100vh', background: T.surface }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header Section */}
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 1 }}>
            <Box sx={{ 
              width: 48, 
              height: 48, 
              background: T.gradientTeal,
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(0,131,143,0.3)',
            }}>
              <Videocam sx={{ fontSize: 28, color: 'white' }} />
            </Box>
            <Typography 
              variant="h4" 
              component="h1" 
              sx={{ 
                fontWeight: 800,
                color: T.text,
                letterSpacing: '-0.5px'
              }}
            >
              AI Video Mock Interview
            </Typography>
          </Box>
          <Typography variant="body1" sx={{ color: T.textSecondary }}>
            Practice with AI-powered video conversations and real-time voice processing
          </Typography>
        </Box>

        {/* System & Media Status */}
        <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
          <Chip
            icon={systemReady ? <CheckCircle sx={{ fontSize: 18 }} /> : <CircularProgress size={14} />}
            label={systemReady ? 'System Ready' : 'Checking System...'}
            sx={{
              bgcolor: systemReady ? `${T.success}12` : `${T.warning}12`,
              color: systemReady ? T.success : '#d97706',
              fontWeight: 600,
              borderRadius: '10px',
              border: `1px solid ${systemReady ? `${T.success}25` : `${T.warning}25`}`,
              '& .MuiChip-icon': {
                color: systemReady ? T.success : '#d97706'
              }
            }}
          />

          {mediaPermissions.checked && (
            <>
              <Chip
                label={`Camera: ${mediaPermissions.camera ? 'Granted' : 'Pending'}`}
                sx={{
                  bgcolor: mediaPermissions.camera ? `${T.success}12` : `${T.warning}12`,
                  color: mediaPermissions.camera ? T.success : '#d97706',
                  fontWeight: 600,
                  borderRadius: '10px',
                  border: `1px solid ${mediaPermissions.camera ? `${T.success}25` : `${T.warning}25`}`,
                }}
              />
              <Chip
                label={`Microphone: ${mediaPermissions.microphone ? 'Granted' : 'Pending'}`}
                sx={{
                  bgcolor: mediaPermissions.microphone ? `${T.success}12` : `${T.warning}12`,
                  color: mediaPermissions.microphone ? T.success : '#d97706',
                  fontWeight: 600,
                  borderRadius: '10px',
                  border: `1px solid ${mediaPermissions.microphone ? `${T.success}25` : `${T.warning}25`}`,
                }}
              />
            </>
          )}

          {(!mediaPermissions.camera || !mediaPermissions.microphone) && mediaPermissions.checked && (
            <Button 
              size="small" 
              variant="outlined"
              onClick={handlePermissionDialog}
              sx={{ 
                borderRadius: '10px', 
                textTransform: 'none', 
                fontWeight: 600,
                borderColor: T.borderMedium,
                color: T.primary,
                '&:hover': {
                  borderColor: T.primary,
                  backgroundColor: `${T.primary}06`,
                }
              }}
            >
              Grant Access
            </Button>
          )}

          {!systemReady && error && (
            <Tooltip title="Retry connection">
              <IconButton size="small" onClick={checkSystemReady} sx={{ color: T.primary }}>
                <RefreshOutlined />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3, 
              borderRadius: '12px',
              border: '1px solid rgba(239,68,68,0.2)',
              '& .MuiAlert-message': { width: '100%' }
            }}
            action={
              <Button color="inherit" size="small" onClick={checkSystemReady} sx={{ fontWeight: 600, textTransform: 'none' }}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        {/* HTTPS Warning */}
        {!window.isSecureContext && window.location.protocol !== 'file:' && (
          <Alert 
            severity="warning" 
            sx={{ mb: 3, borderRadius: '12px', border: '1px solid rgba(245,158,11,0.2)' }}
            action={
              <Button 
                color="inherit" 
                size="small"
                sx={{ fontWeight: 600, textTransform: 'none' }}
                onClick={() => {
                  const httpsUrl = `https://${window.location.host}${window.location.pathname}${window.location.search}`;
                  window.location.href = httpsUrl;
                }}
              >
                Switch to HTTPS
              </Button>
            }
          >
            HTTPS is required for camera and microphone access.
          </Alert>
        )}

        {/* Interview Progress Section */}
        <Card sx={{ mb: 4, ...cardBase }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: T.text }}>
                Interview Progress
              </Typography>
              <Chip 
                label={`${totalDuration} minutes total`}
                size="small"
                sx={{ 
                  bgcolor: `${T.primary}10`, 
                  color: T.primary,
                  fontWeight: 700,
                  borderRadius: '10px',
                  border: `1px solid ${T.primary}20`,
                }}
              />
            </Box>

            {/* Round Progress Stepper */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              justifyContent: 'space-between',
              position: 'relative',
              px: 2
            }}>
              {INTERVIEW_ROUNDS.map((round, index) => {
                const IconComponent = round.icon;
                return (
                  <Box 
                    key={round.name}
                    sx={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center',
                      flex: 1,
                      position: 'relative'
                    }}
                  >
                    {/* Connector Line */}
                    {index < INTERVIEW_ROUNDS.length - 1 && (
                      <Box sx={{
                        position: 'absolute',
                        top: 28,
                        left: '55%',
                        right: '-45%',
                        height: 2,
                        bgcolor: T.borderMedium,
                        zIndex: 0
                      }} />
                    )}
                    
                    {/* Icon Circle */}
                    <Box sx={{
                      width: 56,
                      height: 56,
                      borderRadius: '14px',
                      background: round.gradient,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 1.5,
                      position: 'relative',
                      zIndex: 1,
                      boxShadow: `0 4px 14px ${round.color}33`,
                    }}>
                      <IconComponent sx={{ fontSize: 28, color: '#fff' }} />
                    </Box>

                    {/* Round Name */}
                    <Typography 
                      variant="subtitle1" 
                      sx={{ 
                        fontWeight: 700, 
                        color: T.text,
                        mb: 0.5,
                        textAlign: 'center'
                      }}
                    >
                      {round.name}
                    </Typography>

                    {/* Duration */}
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: T.textSecondary,
                        mb: 1.5
                      }}
                    >
                      {round.duration} min
                    </Typography>

                    {/* Progress Bar */}
                    <Box sx={{ width: '80%' }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={0}
                        sx={{
                          height: 4,
                          borderRadius: 2,
                          bgcolor: `${round.color}15`,
                          '& .MuiLinearProgress-bar': {
                            background: round.gradient,
                            borderRadius: 2
                          }
                        }}
                      />
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </CardContent>
        </Card>

        {/* Round Details Cards */}
        <Box sx={{ mb: 4 }}>
          <Grid container spacing={3} justifyContent="center" sx={{ mb: 4 }}>
            {INTERVIEW_ROUNDS.slice(0, 2).map((round) => {
              const IconComponent = round.icon;
              return (
                <Grid item xs={12} md={5} key={round.name}>
                  <Card sx={{ 
                    height: '100%',
                    ...cardBase,
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 24px rgba(26,82,118,0.12), 0 1px 4px rgba(41,128,185,0.08)',
                    }
                  }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                        <Box sx={{
                          width: 36,
                          height: 36,
                          borderRadius: '10px',
                          background: round.gradient,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: `0 2px 8px ${round.color}30`,
                        }}>
                          <IconComponent sx={{ fontSize: 20, color: '#fff' }} />
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: T.text }}>
                          {round.name}
                        </Typography>
                      </Box>
                      
                      <Typography variant="body2" sx={{ color: T.textSecondary, mb: 2 }}>
                        {round.description}
                      </Typography>

                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                        {round.focus.map((item, idx) => (
                          <Chip 
                            key={idx}
                            label={item}
                            size="small"
                            sx={{
                              bgcolor: T.surface,
                              color: T.textSecondary,
                              fontSize: '0.75rem',
                              height: 26,
                              borderRadius: '8px',
                              border: `1px solid ${T.borderMedium}`,
                              fontWeight: 500,
                            }}
                          />
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          {/* Second Row - HR/Behavioral centered */}
          <Grid container justifyContent="center">
            <Grid item xs={12} md={5}>
              {(() => {
                const round = INTERVIEW_ROUNDS[2];
                const IconComponent = round.icon;
                return (
                  <Card sx={{ 
                    height: '100%',
                    ...cardBase,
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 24px rgba(26,82,118,0.12), 0 1px 4px rgba(41,128,185,0.08)',
                    }
                  }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                        <Box sx={{
                          width: 36,
                          height: 36,
                          borderRadius: '10px',
                          background: round.gradient,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: `0 2px 8px ${round.color}30`,
                        }}>
                          <IconComponent sx={{ fontSize: 20, color: '#fff' }} />
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: T.text }}>
                          {round.name}
                        </Typography>
                      </Box>
                      
                      <Typography variant="body2" sx={{ color: T.textSecondary, mb: 2 }}>
                        {round.description}
                      </Typography>

                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                        {round.focus.map((item, idx) => (
                          <Chip 
                            key={idx}
                            label={item}
                            size="small"
                            sx={{
                              bgcolor: T.surface,
                              color: T.textSecondary,
                              fontSize: '0.75rem',
                              height: 26,
                              borderRadius: '8px',
                              border: `1px solid ${T.borderMedium}`,
                              fontWeight: 500,
                            }}
                          />
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                );
              })()}
            </Grid>
          </Grid>
        </Box>

        {/* Start Interview Card */}
        <Card sx={{ ...cardBase, mb: 4 }}>
          <Box sx={{ 
            bgcolor: T.surface, 
            px: 4, 
            py: 2,
            borderBottom: `1px solid ${T.borderLight}`
          }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: T.text }}>
              Evaluation Criteria
            </Typography>
          </Box>
          <CardContent sx={{ p: 4 }}>
            {/* Evaluation Criteria */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              flexWrap: 'wrap', 
              gap: 2,
              mb: 4
            }}>
              {EVALUATION_CRITERIA.map((criteria) => (
                <Box 
                  key={criteria.name}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 2,
                    py: 1,
                    borderRadius: '10px',
                    bgcolor: T.surface,
                    border: `1px solid ${T.borderMedium}`
                  }}
                >
                  <Box sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: criteria.color
                  }} />
                  <Typography variant="body2" sx={{ fontWeight: 600, color: T.text }}>
                    {criteria.name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: T.textMuted }}>
                    {criteria.weight}%
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* Feature Tags */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              flexWrap: 'wrap', 
              gap: 1.5,
              mb: 4
            }}>
              {[
                { label: 'Voice Recognition', icon: '🎤' },
                { label: 'Streaming TTS', icon: '🗣️' },
                { label: 'Adaptive Difficulty', icon: '🤖' },
                { label: 'Time-Based Rounds', icon: '⏱️' }
              ].map((feature) => (
                <Chip
                  key={feature.label}
                  label={`${feature.icon} ${feature.label}`}
                  variant="outlined"
                  sx={{
                    borderRadius: '10px',
                    borderColor: T.borderMedium,
                    color: T.textSecondary,
                    fontWeight: 600,
                    '&:hover': {
                      borderColor: T.primary,
                      backgroundColor: `${T.primary}06`,
                    }
                  }}
                />
              ))}
            </Box>

            {/* Start Button */}
            <Box sx={{ textAlign: 'center' }}>
              <Button
                variant="contained"
                size="large"
                startIcon={isStarting ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : <PlayArrow />}
                onClick={startInterview}
                disabled={
                  !systemReady || 
                  isStarting || 
                  !window.isSecureContext ||
                  (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)
                }
                sx={{
                  borderRadius: '14px',
                  py: 1.5,
                  px: 5,
                  fontSize: '1rem',
                  fontWeight: 700,
                  textTransform: 'none',
                  background: T.gradientTeal,
                  boxShadow: '0 4px 14px rgba(0,131,143,0.3)',
                  '&:hover': {
                    boxShadow: '0 6px 20px rgba(0,131,143,0.4)',
                  },
                  '&:disabled': {
                    background: 'rgba(148,163,184,0.15)',
                    color: 'rgba(148,163,184,0.5)',
                  }
                }}
              >
                {isStarting ? 'Starting Interview...' : `Start AI Interview (${totalDuration} min)`}
              </Button>
              
              <Typography 
                variant="body2" 
                sx={{ 
                  mt: 2, 
                  color: T.textMuted,
                  fontSize: '0.8rem',
                }}
              >
                {!window.isSecureContext 
                  ? '⚠️ HTTPS required for microphone access'
                  : !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia
                    ? '⚠️ Browser doesn\'t support media devices'
                    : 'The interview requires microphone access for voice recognition'
                }
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Features Section */}
        <Card sx={{ ...cardBase }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: T.text, mb: 3 }}>
              AI Interview Features
            </Typography>
            
            <Grid container spacing={4}>
              {[
                {
                  title: 'Voice Recognition',
                  items: ['Real-time speech-to-text', 'Natural conversation flow', 'Automatic silence detection', 'High-quality transcription']
                },
                {
                  title: 'AI Voice Responses',
                  items: ['Streaming text-to-speech', 'Natural voice synthesis', 'Real-time audio delivery', 'Professional interview tone']
                },
                {
                  title: 'Smart AI Interviewer',
                  items: ['Introduction phase for comfort', 'Context-aware questions', 'Adaptive difficulty', 'Time-based round management']
                },
                {
                  title: 'Performance Analysis',
                  items: ['5-dimension evaluation', 'Round-by-round breakdown', 'Strengths & improvement areas', 'PDF results download']
                }
              ].map((section) => (
                <Grid item xs={12} sm={6} md={3} key={section.title}>
                  <Typography 
                    variant="subtitle2" 
                    sx={{ 
                      fontWeight: 700, 
                      color: T.text, 
                      mb: 1.5 
                    }}
                  >
                    {section.title}
                  </Typography>
                  <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                    {section.items.map((item, idx) => (
                      <Box 
                        component="li" 
                        key={idx}
                        sx={{ 
                          color: T.textSecondary, 
                          fontSize: '0.875rem',
                          mb: 0.5,
                          '&::marker': {
                            color: T.borderMedium
                          }
                        }}
                      >
                        {item}
                      </Box>
                    ))}
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>

        {/* Permission Dialog */}
        <Dialog 
          open={showPermissionDialog} 
          onClose={() => setShowPermissionDialog(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: { borderRadius: '22px' }
          }}
        >
          <DialogTitle sx={{ fontWeight: 800, color: T.text }}>
            Media Access Required
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1" paragraph sx={{ color: T.text }}>
              The AI interview requires access to your camera and microphone to function properly.
            </Typography>
            <Typography variant="body2" sx={{ color: T.textSecondary }}>
              Your camera is used for video recording, and your microphone captures voice responses for the AI interviewer.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 2.5, pt: 1, gap: 1 }}>
            <Button 
              onClick={() => setShowPermissionDialog(false)}
              sx={{ textTransform: 'none', color: T.textMuted, fontWeight: 600, borderRadius: '12px' }}
            >
              Cancel
            </Button>
            <Button 
              variant="contained" 
              onClick={requestMediaPermissions}
              startIcon={<Mic />}
              sx={{ 
                textTransform: 'none',
                borderRadius: '14px',
                px: 3,
                fontWeight: 700,
                background: T.gradientTeal,
                boxShadow: '0 4px 14px rgba(0,131,143,0.3)',
                '&:hover': { boxShadow: '0 6px 20px rgba(0,131,143,0.4)' },
              }}
            >
              Grant Access
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default StudentMockInterviews;