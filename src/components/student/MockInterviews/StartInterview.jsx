import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, LinearProgress, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress, Alert, Chip
} from '@mui/material';
import {
  Mic, VolumeUp, Stop,
  Videocam, VideocamOff, Cameraswitch, Warning,
  MicOff, Refresh, Timer, Settings,
  Lightbulb, StopCircle, Headset, CheckCircle
} from '@mui/icons-material';

import {
  createInterviewSession,
  testAPIConnection,
  createInterviewWebSocket,
  sendWebSocketMessage,
  closeWebSocket,
  getWebSocketState,
  processAudioForWebSocket
} from '../../../services/API/index2';

// ============================================================================
// CONFIGURATION - UPDATED TIMING
// ============================================================================
const AUDIO_CONFIG = {
  SILENCE_THRESHOLD: 0.08,
  VOICE_DETECTION_SENSITIVITY: 0.6,
  SILENCE_DURATION: 3000,
  MAX_RECORDING_TIME: 600000,
  MIN_SPEECH_TIME: 300,
  AI_PAUSE_DELAY: 2000,
  NO_VOICE_TIMEOUT: 10000,
  KEEPALIVE_INTERVAL: 25000,
  AUDIO_LEVEL_UPDATE_INTERVAL: 80,
  PLAYBACK_VOLUME: 0.9,
  AI_SPEECH_RATE: 1.0,
};

const WEBSOCKET_CONFIG = {
  RECONNECT_ATTEMPTS: 3,
  RECONNECT_DELAY: 2000,
  CONNECTION_TIMEOUT: 15000,
  PING_INTERVAL: 30000
};

// ============================================================================
// ROUND CONFIGURATION - UPDATED TIMING
// Communication: 10 min, Technical: 25 min, HR: 10 min
// ============================================================================
const ROUND_CONFIG = {
  introduction: { duration: 60, label: 'Introduction', icon: '👋', description: 'Welcome and interview overview' },
  communication: { duration: 600, label: 'Communication', icon: '🗣️', description: 'Clarity, articulation, and confidence' },
  technical: { duration: 1500, label: 'Technical', icon: '💻', description: 'Problem-solving and conceptual understanding' },
  hr: { duration: 600, label: 'HR/Behavioral', icon: '🤝', description: 'Leadership, ethics, and professionalism' }
};

const MAIN_ROUNDS = ['communication', 'technical', 'hr'];

// ============================================================================
// VOICE ACTIVITY DETECTION (VAD) CONFIGURATION
// Human speech fundamental frequency: 85Hz – 255Hz
// Human speech formants/harmonics: up to ~3400Hz
// We focus on 85Hz – 3000Hz band and ignore everything else
// ============================================================================
const VAD_CONFIG = {
  // Frequency range for human voice detection (Hz)
  VOICE_FREQ_LOW: 85,
  VOICE_FREQ_HIGH: 3000,

  // Energy threshold: voice-band energy must exceed this to count as speech
  // This is a ratio (0–1) of voice-band energy vs max possible energy
  VOICE_ENERGY_THRESHOLD: 0.06,

  // Spectral flatness: noise is flat across frequencies, voice has peaks
  // Lower value = more tonal (voice-like), Higher = more noise-like
  // Speech typically < 0.4, white noise ~ 0.8-1.0
  SPECTRAL_FLATNESS_THRESHOLD: 0.55,

  // Zero-crossing rate proxy: voice has moderate ZCR, noise has high ZCR
  // We use spectral centroid as proxy — voice centroid is lower than noise
  SPECTRAL_CENTROID_MAX_HZ: 2800,

  // Consecutive frames needed to confirm voice (anti-flicker)
  CONSECUTIVE_VOICE_FRAMES: 4,
  CONSECUTIVE_SILENCE_FRAMES: 6,

  // Adaptive noise floor: learn ambient noise level in first N frames
  NOISE_FLOOR_LEARNING_FRAMES: 30,
  NOISE_FLOOR_ADAPTATION_RATE: 0.02,  // How fast noise floor adapts (0–1)
  NOISE_FLOOR_MARGIN: 2.5,  // Voice must be this many times above noise floor
};

// ============================================================================
// SILENCE DETECTION CONFIGURATION (now voice-frequency aware)
// ============================================================================
const SILENCE_CONFIG = {
  SILENCE_DURATION_MS: 3000,
  MIN_SPEECH_DURATION_MS: 2500,
  SMOOTHING_WINDOW: 50,
  // These are now computed from VAD, not raw amplitude:
  SILENCE_THRESHOLD_ABSOLUTE: 0.05,  // Fallback only
};

// ============================================================================
// AI AVATAR COMPONENT — Animated talking head / orb
// ============================================================================
const AIAvatar = ({ isPlaying, isListening, isWaiting, size = 56 }) => {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const phaseRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = size * 2;
    const h = size * 2;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const cx = w / 2;
    const cy = h / 2;
    const baseRadius = w * 0.3;

    const draw = () => {
      phaseRef.current += 0.04;
      const t = phaseRef.current;
      ctx.clearRect(0, 0, w, h);

      // Outer glow
      const glowColor = isPlaying ? 'rgba(99, 102, 241, 0.15)'
        : isListening ? 'rgba(34, 197, 94, 0.15)'
        : isWaiting ? 'rgba(34, 197, 94, 0.1)'
        : 'rgba(100, 116, 139, 0.1)';
      const glowRadius = baseRadius + (isPlaying ? 12 + Math.sin(t * 2) * 8 : isListening ? 8 + Math.sin(t * 1.5) * 4 : 6);
      const glowGrad = ctx.createRadialGradient(cx, cy, baseRadius * 0.5, cx, cy, glowRadius + 20);
      glowGrad.addColorStop(0, glowColor);
      glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, glowRadius + 20, 0, Math.PI * 2);
      ctx.fill();

      // Sound wave rings when AI is speaking
      if (isPlaying) {
        for (let i = 0; i < 3; i++) {
          const wavePhase = (t * 1.5 + i * 2.1) % (Math.PI * 2);
          const waveRadius = baseRadius + 10 + (wavePhase / (Math.PI * 2)) * 30;
          const waveAlpha = Math.max(0, 0.4 - (wavePhase / (Math.PI * 2)) * 0.4);
          ctx.strokeStyle = `rgba(99, 102, 241, ${waveAlpha})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, cy, waveRadius, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Main circle with gradient
      const mainGrad = ctx.createRadialGradient(cx - baseRadius * 0.3, cy - baseRadius * 0.3, 0, cx, cy, baseRadius);
      if (isPlaying) {
        mainGrad.addColorStop(0, '#818cf8');
        mainGrad.addColorStop(0.5, '#6366f1');
        mainGrad.addColorStop(1, '#4f46e5');
      } else if (isListening) {
        mainGrad.addColorStop(0, '#4ade80');
        mainGrad.addColorStop(0.5, '#22c55e');
        mainGrad.addColorStop(1, '#16a34a');
      } else if (isWaiting) {
        mainGrad.addColorStop(0, '#86efac');
        mainGrad.addColorStop(0.5, '#4ade80');
        mainGrad.addColorStop(1, '#22c55e');
      } else {
        mainGrad.addColorStop(0, '#94a3b8');
        mainGrad.addColorStop(0.5, '#64748b');
        mainGrad.addColorStop(1, '#475569');
      }
      ctx.fillStyle = mainGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
      ctx.fill();

      // Inner highlight
      const highlightGrad = ctx.createRadialGradient(cx - baseRadius * 0.25, cy - baseRadius * 0.3, 0, cx, cy, baseRadius * 0.8);
      highlightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
      highlightGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = highlightGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius * 0.8, 0, Math.PI * 2);
      ctx.fill();

      // Face - Eyes
      const eyeY = cy - baseRadius * 0.12;
      const eyeSpacing = baseRadius * 0.28;
      const eyeRadius = baseRadius * 0.08;
      const blinkCycle = Math.sin(t * 0.5);
      const eyeScaleY = blinkCycle < -0.92 ? 0.1 : 1; // Blink

      ctx.fillStyle = '#fff';
      ctx.save();
      // Left eye
      ctx.translate(cx - eyeSpacing, eyeY);
      ctx.scale(1, eyeScaleY);
      ctx.beginPath();
      ctx.arc(0, 0, eyeRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      // Right eye
      ctx.translate(cx + eyeSpacing, eyeY);
      ctx.scale(1, eyeScaleY);
      ctx.beginPath();
      ctx.arc(0, 0, eyeRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Pupils (slight movement)
      const pupilOffset = Math.sin(t * 0.3) * 1.5;
      const pupilRadius = eyeRadius * 0.5;
      ctx.fillStyle = '#1e1b4b';
      if (eyeScaleY > 0.5) {
        ctx.beginPath();
        ctx.arc(cx - eyeSpacing + pupilOffset, eyeY, pupilRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + eyeSpacing + pupilOffset, eyeY, pupilRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Mouth — changes based on state
      const mouthY = cy + baseRadius * 0.22;
      ctx.strokeStyle = '#fff';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';

      if (isPlaying) {
        // Talking animation: mouth opens and closes
        const mouthOpen = Math.abs(Math.sin(t * 4)) * baseRadius * 0.15 + baseRadius * 0.03;
        const mouthWidth = baseRadius * 0.25;
        ctx.beginPath();
        ctx.ellipse(cx, mouthY, mouthWidth, mouthOpen, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#4338ca';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.stroke();
      } else if (isListening || isWaiting) {
        // Small open mouth (listening)
        const mouthWidth = baseRadius * 0.12 + Math.sin(t * 1.5) * baseRadius * 0.03;
        ctx.beginPath();
        ctx.ellipse(cx, mouthY, mouthWidth, baseRadius * 0.06, 0, 0, Math.PI * 2);
        ctx.fillStyle = isListening ? '#15803d' : '#166534';
        ctx.fill();
      } else {
        // Slight smile
        ctx.beginPath();
        ctx.arc(cx, mouthY - baseRadius * 0.05, baseRadius * 0.18, 0.2, Math.PI - 0.2);
        ctx.stroke();
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, isListening, isWaiting, size]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: size * 2,
        height: size * 2,
        display: 'block',
        margin: '0 auto',
      }}
    />
  );
};


// ============================================================================
// VOICE ACTIVITY DETECTOR CLASS
// Analyzes frequency-domain data to distinguish human voice from noise
// ============================================================================
class VoiceActivityDetector {
  constructor(analyserNode, sampleRate) {
    this.analyser = analyserNode;
    this.sampleRate = sampleRate;
    this.fftSize = analyserNode.fftSize;
    this.binCount = analyserNode.frequencyBinCount;
    this.binResolution = sampleRate / this.fftSize; // Hz per bin

    // Compute bin indices for voice frequency range
    this.voiceLowBin = Math.max(1, Math.floor(VAD_CONFIG.VOICE_FREQ_LOW / this.binResolution));
    this.voiceHighBin = Math.min(this.binCount - 1, Math.ceil(VAD_CONFIG.VOICE_FREQ_HIGH / this.binResolution));

    // Buffers
    this.frequencyData = new Uint8Array(this.binCount);
    this.timeData = new Uint8Array(this.fftSize);

    // Adaptive noise floor (per-bin)
    this.noiseFloor = new Float32Array(this.binCount).fill(0);
    this.noiseFloorInitialized = false;
    this.frameCount = 0;

    // State tracking
    this.consecutiveVoiceFrames = 0;
    this.consecutiveSilenceFrames = 0;
    this.isVoiceActive = false;

    // Rolling history for smoothing
    this.voiceEnergyHistory = [];
    this.maxHistoryLength = 10;

    console.log(`[VAD] Initialized: sampleRate=${sampleRate}, fftSize=${this.fftSize}, ` +
      `binResolution=${this.binResolution.toFixed(1)}Hz, ` +
      `voiceBins=${this.voiceLowBin}-${this.voiceHighBin} ` +
      `(${(this.voiceLowBin * this.binResolution).toFixed(0)}Hz-${(this.voiceHighBin * this.binResolution).toFixed(0)}Hz)`);
  }

  /**
   * Analyze current audio frame and return voice detection result
   * @returns {{ isVoice: boolean, voiceEnergy: number, noiseEnergy: number, confidence: number, rawLevel: number }}
   */
  analyze() {
    if (!this.analyser) {
      return { isVoice: false, voiceEnergy: 0, noiseEnergy: 0, confidence: 0, rawLevel: 0 };
    }

    this.analyser.getByteFrequencyData(this.frequencyData);
    this.frameCount++;

    // 1. Compute voice-band energy (85Hz - 3000Hz)
    let voiceBandSum = 0;
    let voiceBandCount = 0;
    let voiceBandMax = 0;

    for (let i = this.voiceLowBin; i <= this.voiceHighBin; i++) {
      const val = this.frequencyData[i] / 255;
      voiceBandSum += val;
      voiceBandCount++;
      if (val > voiceBandMax) voiceBandMax = val;
    }
    const voiceBandAvg = voiceBandCount > 0 ? voiceBandSum / voiceBandCount : 0;

    // 2. Compute non-voice energy (everything outside voice band)
    let nonVoiceSum = 0;
    let nonVoiceCount = 0;
    for (let i = 0; i < this.binCount; i++) {
      if (i < this.voiceLowBin || i > this.voiceHighBin) {
        nonVoiceSum += this.frequencyData[i] / 255;
        nonVoiceCount++;
      }
    }
    const nonVoiceAvg = nonVoiceCount > 0 ? nonVoiceSum / nonVoiceCount : 0;

    // 3. Compute overall raw level (for UI display)
    let totalSum = 0;
    for (let i = 0; i < this.binCount; i++) {
      totalSum += this.frequencyData[i] / 255;
    }
    const rawLevel = totalSum / this.binCount;

    // 4. Adaptive noise floor learning
    if (this.frameCount <= VAD_CONFIG.NOISE_FLOOR_LEARNING_FRAMES) {
      // During learning phase, accumulate average
      for (let i = this.voiceLowBin; i <= this.voiceHighBin; i++) {
        const val = this.frequencyData[i] / 255;
        this.noiseFloor[i] = this.noiseFloor[i] + (val - this.noiseFloor[i]) / this.frameCount;
      }
      if (this.frameCount === VAD_CONFIG.NOISE_FLOOR_LEARNING_FRAMES) {
        this.noiseFloorInitialized = true;
        const avgNoise = this.noiseFloor.slice(this.voiceLowBin, this.voiceHighBin + 1)
          .reduce((a, b) => a + b, 0) / voiceBandCount;
        console.log(`[VAD] Noise floor learned: avg=${avgNoise.toFixed(4)} over ${VAD_CONFIG.NOISE_FLOOR_LEARNING_FRAMES} frames`);
      }
      return { isVoice: false, voiceEnergy: voiceBandAvg, noiseEnergy: nonVoiceAvg, confidence: 0, rawLevel };
    }

    // 5. Slowly adapt noise floor during silence (not during speech)
    if (!this.isVoiceActive) {
      for (let i = this.voiceLowBin; i <= this.voiceHighBin; i++) {
        const val = this.frequencyData[i] / 255;
        this.noiseFloor[i] = this.noiseFloor[i] * (1 - VAD_CONFIG.NOISE_FLOOR_ADAPTATION_RATE)
          + val * VAD_CONFIG.NOISE_FLOOR_ADAPTATION_RATE;
      }
    }

    // 6. Compute voice energy relative to noise floor
    let voiceAboveNoiseSum = 0;
    let voiceAboveNoiseCount = 0;
    for (let i = this.voiceLowBin; i <= this.voiceHighBin; i++) {
      const val = this.frequencyData[i] / 255;
      const noiseLevel = this.noiseFloor[i] * VAD_CONFIG.NOISE_FLOOR_MARGIN;
      if (val > noiseLevel) {
        voiceAboveNoiseSum += (val - this.noiseFloor[i]);
        voiceAboveNoiseCount++;
      }
    }
    const voiceAboveNoise = voiceBandCount > 0 ? voiceAboveNoiseSum / voiceBandCount : 0;

    // 7. Spectral flatness in voice band (tonality measure)
    // Geometric mean / Arithmetic mean of magnitudes
    // Voice is tonal (low flatness), noise is flat (high flatness)
    let logSum = 0;
    let linSum = 0;
    let validBins = 0;
    for (let i = this.voiceLowBin; i <= this.voiceHighBin; i++) {
      const val = Math.max(this.frequencyData[i] / 255, 0.0001); // avoid log(0)
      logSum += Math.log(val);
      linSum += val;
      validBins++;
    }
    const geometricMean = Math.exp(logSum / validBins);
    const arithmeticMean = linSum / validBins;
    const spectralFlatness = arithmeticMean > 0 ? geometricMean / arithmeticMean : 1;

    // 8. Spectral centroid (weighted average frequency)
    let weightedFreqSum = 0;
    let magnitudeSum = 0;
    for (let i = this.voiceLowBin; i <= this.voiceHighBin; i++) {
      const mag = this.frequencyData[i] / 255;
      const freq = i * this.binResolution;
      weightedFreqSum += freq * mag;
      magnitudeSum += mag;
    }
    const spectralCentroid = magnitudeSum > 0 ? weightedFreqSum / magnitudeSum : 0;

    // 9. Voice-to-noise ratio
    const vnr = nonVoiceAvg > 0.001 ? voiceBandAvg / nonVoiceAvg : voiceBandAvg * 100;

    // 10. Decision logic: combine multiple features
    const energyPass = voiceAboveNoise > VAD_CONFIG.VOICE_ENERGY_THRESHOLD;
    const flatnessPass = spectralFlatness < VAD_CONFIG.SPECTRAL_FLATNESS_THRESHOLD;
    const centroidPass = spectralCentroid > 0 && spectralCentroid < VAD_CONFIG.SPECTRAL_CENTROID_MAX_HZ;
    const vnrPass = vnr > 1.3; // Voice band should be louder than non-voice

    // Confidence score (0-1)
    let confidence = 0;
    if (energyPass) confidence += 0.35;
    if (flatnessPass) confidence += 0.25;
    if (centroidPass) confidence += 0.15;
    if (vnrPass) confidence += 0.25;

    // Smooth confidence
    this.voiceEnergyHistory.push(confidence);
    if (this.voiceEnergyHistory.length > this.maxHistoryLength) {
      this.voiceEnergyHistory.shift();
    }
    const smoothedConfidence = this.voiceEnergyHistory.reduce((a, b) => a + b, 0) / this.voiceEnergyHistory.length;

    // 11. Hysteresis: require consecutive frames to change state
    const voiceDetected = smoothedConfidence >= 0.55;

    if (voiceDetected) {
      this.consecutiveVoiceFrames++;
      this.consecutiveSilenceFrames = 0;
    } else {
      this.consecutiveSilenceFrames++;
      this.consecutiveVoiceFrames = 0;
    }

    // State transitions with hysteresis
    if (!this.isVoiceActive && this.consecutiveVoiceFrames >= VAD_CONFIG.CONSECUTIVE_VOICE_FRAMES) {
      this.isVoiceActive = true;
      console.log(`[VAD] Voice STARTED (confidence=${smoothedConfidence.toFixed(2)}, energy=${voiceAboveNoise.toFixed(3)}, flatness=${spectralFlatness.toFixed(2)}, centroid=${spectralCentroid.toFixed(0)}Hz)`);
    } else if (this.isVoiceActive && this.consecutiveSilenceFrames >= VAD_CONFIG.CONSECUTIVE_SILENCE_FRAMES) {
      this.isVoiceActive = false;
      console.log(`[VAD] Voice STOPPED (confidence=${smoothedConfidence.toFixed(2)}, silence frames=${this.consecutiveSilenceFrames})`);
    }

    return {
      isVoice: this.isVoiceActive,
      voiceEnergy: voiceAboveNoise,
      noiseEnergy: nonVoiceAvg,
      confidence: smoothedConfidence,
      rawLevel: Math.max(voiceBandAvg, rawLevel * 0.3), // Show primarily voice-band level
      spectralFlatness,
      spectralCentroid,
      vnr
    };
  }

  /** Reset state (e.g., on new recording) */
  reset() {
    this.consecutiveVoiceFrames = 0;
    this.consecutiveSilenceFrames = 0;
    this.isVoiceActive = false;
    this.voiceEnergyHistory = [];
  }

  /** Reset noise floor (e.g., on mic change) */
  resetNoiseFloor() {
    this.noiseFloor.fill(0);
    this.noiseFloorInitialized = false;
    this.frameCount = 0;
    this.reset();
  }
}


// ============================================================================
// MAIN COMPONENT
// ============================================================================
const StartInterview = () => {
  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const urlParams = new URLSearchParams(window.location.search);
  const initialTestId = location.state?.testId || urlParams.get('testId');
  const initialStudentName = location.state?.studentName || urlParams.get('studentName') || 'Candidate';

  // Core states
  const [testId, setTestId] = useState(initialTestId);
  const [studentName, setStudentName] = useState(initialStudentName);
  const [currentSessionId, setCurrentSessionId] = useState(sessionId);

  // Connection states
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [systemReady, setSystemReady] = useState(false);

  // Interview states
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [currentStage, setCurrentStage] = useState('introduction');
  const [questionNumber, setQuestionNumber] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(ROUND_CONFIG.introduction.duration);
  const [currentDifficulty, setCurrentDifficulty] = useState('medium');
  const [introductionCompleted, setIntroductionCompleted] = useState(false);

  // Audio states
  const [isAIPlaying, setIsAIPlaying] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [silenceTimer, setSilenceTimer] = useState(0);
  const [noVoiceTimer, setNoVoiceTimer] = useState(0);
  const [showHeadphoneWarning, setShowHeadphoneWarning] = useState(false);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [aiSpeechProgress, setAiSpeechProgress] = useState(0);
  const [waitingForVoice, setWaitingForVoice] = useState(false);

  // NEW: Voice confidence display
  const [voiceConfidence, setVoiceConfidence] = useState(0);

  // Microphone device states
  const [availableMicrophones, setAvailableMicrophones] = useState([]);
  const [selectedMicrophone, setSelectedMicrophone] = useState('');

  // Camera states
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [videoStream, setVideoStream] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [cameraPermissionDenied, setCameraPermissionDenied] = useState(false);
  const [cameraInitializing, setCameraInitializing] = useState(false);

  // UI states
  const [isEndingInterview, setIsEndingInterview] = useState(false);
  const [showEndConfirmation, setShowEndConfirmation] = useState(false);
  const [showRoundTransition, setShowRoundTransition] = useState(false);
  const [transitionMessage, setTransitionMessage] = useState('');

  // Refs
  const wsRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const silenceTimeoutRef = useRef(null);
  const noVoiceTimeoutRef = useRef(null);
  const audioChunksRef = useRef([]);
  const animationFrameRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const videoRef = useRef(null);
  const videoStreamRef = useRef(null);
  const audioQueueRef = useRef([]);
  const currentAudioRef = useRef(null);
  const gainNodeRef = useRef(null);
  const isPlayingAudioRef = useRef(false);
  const didInitRef = useRef(false);
  const awaitingNextQuestionRef = useRef(false);
  const awaitingServerAnswerRef = useRef(false);

  const audioSourceNodeRef = useRef(null);
  const selectedMicrophoneRef = useRef('');

  // NEW: Voice Activity Detector ref
  const vadRef = useRef(null);

  // Question tracking refs
  const localQuestionCountRef = useRef({ communication: 0, technical: 0, hr: 0 });
  const roundQuestionCountRef = useRef({ communication: 0, technical: 0, hr: 0 });
  const lastQuestionTextRef = useRef('');
  const lastBackendQuestionNumberRef = useRef({ communication: 0, technical: 0, hr: 0 });

  // State sync refs
  const interviewStartedRef = useRef(false);
  const isConnectedRef = useRef(false);
  const waitingForVoiceRef = useRef(false);
  const isRecordingRef = useRef(false);
  const isAIPlayingRef = useRef(false);
  const currentStageRef = useRef('introduction');

  useEffect(() => {
    interviewStartedRef.current = interviewStarted;
    isConnectedRef.current = isConnected;
    waitingForVoiceRef.current = waitingForVoice;
    isRecordingRef.current = isRecording;
    isAIPlayingRef.current = isAIPlaying;
    currentStageRef.current = currentStage;
  }, [interviewStarted, isConnected, waitingForVoice, isRecording, isAIPlaying, currentStage]);

  useEffect(() => {
    selectedMicrophoneRef.current = selectedMicrophone;
  }, [selectedMicrophone]);

  // Timer countdown
  useEffect(() => {
    if (!interviewStarted || !isConnected) return;
    const timerInterval = setInterval(() => {
      setTimeRemaining(prev => prev <= 0 ? (clearInterval(timerInterval), 0) : prev - 1);
    }, 1000);
    return () => clearInterval(timerInterval);
  }, [interviewStarted, isConnected, currentStage]);

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    if (!window.location.search.includes('skip_headphone_check')) {
      setShowHeadphoneWarning(true);
      return;
    }
    initializeCompleteSystem();
    return cleanup;
  }, []);

  // Listen for audio device changes
  useEffect(() => {
    if (!navigator.mediaDevices?.addEventListener) return;
    const handleDeviceChange = async () => {
      console.log('[Audio Devices] Device change detected, re-enumerating...');
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const mics = devices.filter(d => d.kind === 'audioinput');
        setAvailableMicrophones(mics);
        const currentMicId = selectedMicrophoneRef.current;
        if (currentMicId && !mics.find(m => m.deviceId === currentMicId)) {
          console.log('[Audio Devices] Current mic disconnected, switching to default...');
          const newMicId = mics.length > 0 ? mics[0].deviceId : '';
          setSelectedMicrophone(newMicId);
          if (!isRecordingRef.current && !isAIPlayingRef.current) {
            await setupEnhancedAudioSystem(newMicId);
          }
        }
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        setAvailableCameras(videoDevices);
      } catch (err) {
        console.warn('[Audio Devices] Error:', err);
      }
    };
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
  }, []);

  // Helper functions
  const waitForAudioReady = async (retries = 15, delay = 120) => {
    for (let i = 0; i < retries; i++) {
      const ctx = audioContextRef.current;
      const ready = analyserRef.current && streamRef.current?.active && ctx &&
        (ctx.state === 'running' || (await ctx.resume(), ctx.state === 'running'));
      if (ready) return true;
      await new Promise(r => setTimeout(r, delay));
    }
    return false;
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentRoundIndex = () => {
    const index = MAIN_ROUNDS.indexOf(currentStage);
    return index >= 0 ? index : -1;
  };

  const getMicrophoneDevices = async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return [];
      let devices = await navigator.mediaDevices.enumerateDevices();
      let audioDevices = devices.filter(d => d.kind === 'audioinput');
      setAvailableMicrophones(audioDevices);
      if (audioDevices.length > 0 && !selectedMicrophoneRef.current) {
        const preferred = selectPreferredMicrophone(audioDevices);
        setSelectedMicrophone(preferred.deviceId);
      }
      return audioDevices;
    } catch (error) {
      console.warn('[Audio Devices] Error:', error);
      return [];
    }
  };

  const selectPreferredMicrophone = (devices) => {
    if (!devices || devices.length === 0) return { deviceId: '', label: 'default' };
    const priorityKeywords = [
      { keywords: ['bluetooth', 'bt ', 'airpod', 'buds', 'jbl', 'sony', 'bose', 'beats'], priority: 4 },
      { keywords: ['usb', 'external'], priority: 3 },
      { keywords: ['headset', 'headphone', 'earphone', 'earbuds', 'wired', 'hands-free', 'handsfree'], priority: 2 },
      { keywords: ['default', 'communications'], priority: 1 },
    ];
    let bestDevice = devices[0];
    let bestPriority = 0;
    for (const device of devices) {
      const label = (device.label || '').toLowerCase();
      for (const { keywords, priority } of priorityKeywords) {
        if (keywords.some(kw => label.includes(kw)) && priority > bestPriority) {
          bestDevice = device;
          bestPriority = priority;
        }
      }
    }
    return bestDevice;
  };

  // System initialization
  const initializeCompleteSystem = async () => {
    try {
      setIsConnecting(true);
      setConnectionError(null);
      await checkBackendConnection();
      await handleSessionCreation();
      await setupMediaSystems();
      await initializeWebSocketConnection();
      setSystemReady(true);
    } catch (error) {
      setConnectionError(`System initialization failed: ${error.message}`);
      setIsConnecting(false);
    }
  };

  const checkBackendConnection = async () => {
    const connectionTest = await testAPIConnection();
    if (connectionTest.status !== 'success') throw new Error(connectionTest.message || 'Backend connection failed');
  };

  const handleSessionCreation = async () => {
    if (currentSessionId && testId) return;
    if (currentSessionId && !testId) return;
    const sessionData = await createInterviewSession();
    if (!sessionData.sessionId || !sessionData.testId) throw new Error('Invalid session data');
    setCurrentSessionId(sessionData.sessionId);
    setTestId(sessionData.testId);
    setStudentName(sessionData.studentName || 'Candidate');
    window.history.replaceState({ testId: sessionData.testId, studentName: sessionData.studentName }, '', `/student/mock-interviews/session/${sessionData.sessionId}`);
  };

  const setupMediaSystems = async () => {
    try { await getCameraDevices(); } catch (e) { setCameraError('Camera unavailable'); }
    await getMicrophoneDevices();
    await setupEnhancedAudioSystem();
  };

  // =========================================================================
  // Audio system setup with Bluetooth/headphone compatibility
  // =========================================================================
  const setupEnhancedAudioSystem = async (micDeviceId = null) => {
    try {
      setAudioInitialized(false);

      // Clean up existing
      if (audioSourceNodeRef.current) {
        try { audioSourceNodeRef.current.disconnect(); } catch (_) {}
        audioSourceNodeRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        await audioContextRef.current.close();
        audioContextRef.current = null;
      }

      // Destroy old VAD
      vadRef.current = null;

      await new Promise(resolve => setTimeout(resolve, 150));

      const targetMicId = micDeviceId || selectedMicrophoneRef.current || '';

      const buildAudioConstraints = (deviceId) => {
        const constraints = {
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true },
          autoGainControl: { ideal: true },
          channelCount: { ideal: 1 },
          sampleRate: { ideal: 44100 },
        };
        if (deviceId) constraints.deviceId = { exact: deviceId };
        return constraints;
      };

      let stream = null;
      const attempts = [
        () => navigator.mediaDevices.getUserMedia({ audio: buildAudioConstraints(targetMicId), video: false }),
        () => navigator.mediaDevices.getUserMedia({ audio: targetMicId ? { deviceId: { exact: targetMicId } } : true, video: false }),
        () => navigator.mediaDevices.getUserMedia({ audio: buildAudioConstraints(null), video: false }),
        () => navigator.mediaDevices.getUserMedia({ audio: true, video: false }),
      ];

      for (let i = 0; i < attempts.length; i++) {
        try {
          stream = await attempts[i]();
          if (stream && stream.getAudioTracks().length > 0) {
            console.log('[Audio Setup] Success on attempt', i + 1, '- Track:', stream.getAudioTracks()[0].label);
            break;
          }
        } catch (err) {
          console.warn('[Audio Setup] Attempt', i + 1, 'failed:', err.name);
          stream = null;
          if (err.name === 'NotAllowedError') throw new Error('Microphone permission denied.');
        }
      }

      if (!stream || stream.getAudioTracks().length === 0) {
        throw new Error('Could not access any microphone.');
      }

      streamRef.current = stream;

      const streamSampleRate = stream.getAudioTracks()[0].getSettings().sampleRate;
      const contextOptions = { latencyHint: 'interactive' };
      if (streamSampleRate && streamSampleRate >= 8000 && streamSampleRate <= 96000) {
        contextOptions.sampleRate = streamSampleRate;
      }

      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)(contextOptions);
      if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();

      const actualSampleRate = audioContextRef.current.sampleRate;
      console.log('[Audio Setup] AudioContext sampleRate:', actualSampleRate);

      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.gain.setValueAtTime(AUDIO_CONFIG.PLAYBACK_VOLUME, audioContextRef.current.currentTime);
      gainNodeRef.current.connect(audioContextRef.current.destination);

      // Create analyser with appropriate settings
      analyserRef.current = audioContextRef.current.createAnalyser();
      // Use larger FFT for better frequency resolution at low sample rates
      analyserRef.current.fftSize = actualSampleRate <= 16000 ? 1024 : 2048;
      analyserRef.current.smoothingTimeConstant = 0.3; // Slightly more smoothing for stability
      analyserRef.current.minDecibels = -90;
      analyserRef.current.maxDecibels = -10;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      audioSourceNodeRef.current = source;

      // =====================================================================
      // NEW: Initialize Voice Activity Detector
      // =====================================================================
      vadRef.current = new VoiceActivityDetector(analyserRef.current, actualSampleRate);
      console.log('[Audio Setup] Voice Activity Detector initialized');

      // Re-enumerate for labels
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const mics = devices.filter(d => d.kind === 'audioinput');
        setAvailableMicrophones(mics);
        const activeDeviceId = stream.getAudioTracks()[0].getSettings().deviceId;
        if (activeDeviceId) setSelectedMicrophone(activeDeviceId);
      } catch (_) {}

      setAudioInitialized(true);
      console.log('[Audio Setup] Complete with VAD');

    } catch (error) {
      setAudioInitialized(false);
      console.error('[Audio Setup] Failed:', error);
      throw new Error(`Audio setup failed: ${error.message}`);
    }
  };

  // WebSocket
  const initializeWebSocketConnection = async () => {
    if (!currentSessionId) throw new Error('No session ID');
    const websocket = createInterviewWebSocket(currentSessionId, { onOpen: handleWebSocketOpen, onMessage: handleWebSocketMessage, onError: handleWebSocketError, onClose: handleWebSocketClose });
    wsRef.current = websocket;
    if (pingIntervalRef.current) { clearInterval(pingIntervalRef.current); pingIntervalRef.current = null; }
    pingIntervalRef.current = setInterval(() => { try { if (getWebSocketState(currentSessionId) === 'open') sendWebSocketMessage(currentSessionId, { type: 'ping' }); } catch (_) {} }, WEBSOCKET_CONFIG.PING_INTERVAL);
  };

  const handleWebSocketOpen = () => {
    setIsConnected(true); setIsConnecting(false); setConnectionError(null); setReconnectAttempts(0); setInterviewStarted(true);
    try {
      const participantId = localStorage.getItem('participant_id') || sessionStorage.getItem('participant_id') || null;
      const token = localStorage.getItem('token') || sessionStorage.getItem('token') || null;
      if (currentSessionId) sendWebSocketMessage(currentSessionId, { type: 'init', session_id: currentSessionId, test_id: testId || null, participant_id: participantId, token });
    } catch (e) { console.warn('Init message failed:', e); }
  };

  const handleWebSocketClose = (event) => {
    setIsConnected(false);
    if (pingIntervalRef.current) { clearInterval(pingIntervalRef.current); pingIntervalRef.current = null; }
    if (event.code !== 1000 && event.code !== 1001 && reconnectAttempts < WEBSOCKET_CONFIG.RECONNECT_ATTEMPTS) {
      setReconnectAttempts(prev => prev + 1);
      reconnectTimeoutRef.current = setTimeout(() => { initializeWebSocketConnection().catch(error => setConnectionError(`Reconnection failed: ${error.message}`)); }, WEBSOCKET_CONFIG.RECONNECT_DELAY);
    } else { setConnectionError('Connection lost. Please refresh.'); }
  };

  const handleWebSocketMessage = (data) => {
    try {
      switch (data.type) {
        case 'error': setConnectionError(data.text); break;
        case 'fatal_error': setConnectionError(`Fatal Error: ${data.text || data.message}`); setInterviewStarted(false); break;
        case 'ai_response': handleAIResponse(data); break;
        case 'audio_chunk': if (data.audio) playAudioChunk(data.audio); break;
        case 'audio_end': handleAudioStreamEnd(); break;
        case 'round_transition': handleRoundTransition(data); break;
        case 'silence_prompt': handleSilencePrompt(data); break;
        case 'status': handleStatusUpdate(data); break;
        case 'interview_complete': handleInterviewComplete(data); break;
        case 'init_ack': if (data.stage) setCurrentStage(data.stage); break;
        case 'pong': break;
        default: break;
      }
    } catch (error) { console.error('WS message error:', error); }
  };

  const handleWebSocketError = (error) => { setConnectionError(`Connection error: ${error.message}`); };

  // Question tracking
  const handleAIResponse = (data) => {
    stopListening();
    setWaitingForVoice(false);
    waitingForVoiceRef.current = false;
    awaitingNextQuestionRef.current = false;
    awaitingServerAnswerRef.current = false;

    setCurrentMessage(data.text);
    const newStage = data.stage || 'introduction';
    const previousStage = currentStageRef.current;
    setCurrentStage(newStage);

    if (newStage === 'communication' && !introductionCompleted) setIntroductionCompleted(true);

    if (MAIN_ROUNDS.includes(newStage)) {
      const backendSaysRepeat = data.is_repeat === true || data.is_clarification === true || data.is_new_question === false;
      const currentText = (data.text || '').trim();
      const previousText = lastQuestionTextRef.current.trim();
      const textIsSame = currentText.length > 0 && previousText.length > 0 &&
        (currentText === previousText || (currentText.length > 50 && previousText.length > 50 &&
          currentText.substring(0, Math.floor(currentText.length * 0.8)) === previousText.substring(0, Math.floor(previousText.length * 0.8))));
      const isRepeat = backendSaysRepeat || textIsSame;

      if (previousStage !== newStage) {
        localQuestionCountRef.current[newStage] = 1;
        lastBackendQuestionNumberRef.current[newStage] = data.question_number || 1;
        lastQuestionTextRef.current = currentText;
        setQuestionNumber(1);
      } else if (isRepeat) {
        // keep current
      } else {
        const newLocalQ = (localQuestionCountRef.current[newStage] || 0) + 1;
        localQuestionCountRef.current[newStage] = newLocalQ;
        lastBackendQuestionNumberRef.current[newStage] = data.question_number || newLocalQ;
        lastQuestionTextRef.current = currentText;
        setQuestionNumber(newLocalQ);
      }
    } else {
      lastQuestionTextRef.current = (data.text || '').trim();
    }

    setIsAIPlaying(true);
    isAIPlayingRef.current = true;
    setAiSpeechProgress(0);

    if (data.time_remaining_seconds !== undefined && data.time_remaining_seconds > 0) {
      setTimeRemaining(data.time_remaining_seconds);
    } else if (ROUND_CONFIG[newStage] && previousStage !== newStage) {
      setTimeRemaining(ROUND_CONFIG[newStage].duration);
    }
    if (data.difficulty) setCurrentDifficulty(data.difficulty);
  };

  const handleRoundTransition = (data) => {
    const toStage = data.to_stage || 'communication';
    const toConfig = ROUND_CONFIG[toStage] || ROUND_CONFIG.communication;
    setTransitionMessage(data.text || `Moving to ${toConfig.label} round...`);
    setShowRoundTransition(true);
    setCurrentStage(toStage);
    if (data.from_stage === 'introduction') setIntroductionCompleted(true);
    setTimeRemaining(toConfig.duration);
    localQuestionCountRef.current[toStage] = 0;
    lastBackendQuestionNumberRef.current[toStage] = 0;
    lastQuestionTextRef.current = '';
    setQuestionNumber(0);
    setTimeout(() => setShowRoundTransition(false), 5000);
  };

  const handleSilencePrompt = (data) => { setCurrentMessage(data.text || "Take your time."); setIsAIPlaying(true); };

  const handleStatusUpdate = (data) => {
    if (data.stage) setCurrentStage(data.stage);
    if (data.time_remaining_seconds !== undefined) setTimeRemaining(data.time_remaining_seconds);
    if (data.difficulty) setCurrentDifficulty(data.difficulty);
  };

  const handleAudioStreamEnd = () => { setTimeout(() => waitForAudioComplete(), 200); };

  const handleInterviewComplete = (data) => {
    setInterviewStarted(false); stopListening(); if (cameraEnabled) stopCamera();
    setTimeout(() => navigate(`/student/mock-interviews/results/${testId}`, { state: { evaluation: data } }), 1500);
  };

  const waitForAudioComplete = () => {
    if (audioQueueRef.current.length === 0 && !isPlayingAudioRef.current) {
      setIsAIPlaying(false); isAIPlayingRef.current = false; setAiSpeechProgress(100);
      setTimeout(() => startAutoVoiceDetection(), AUDIO_CONFIG.AI_PAUSE_DELAY);
    } else { setTimeout(waitForAudioComplete, 200); }
  };

  // =========================================================================
  // VOICE DETECTION — Now uses VAD (frequency-based)
  // =========================================================================
  const startAutoVoiceDetection = async () => {
    try {
      if (isRecordingRef.current || isAIPlayingRef.current || isPlayingAudioRef.current || audioQueueRef.current.length > 0) {
        setTimeout(startAutoVoiceDetection, 500);
        return;
      }

      if (!streamRef.current?.active) {
        console.log('[Voice Detection] Stream inactive, reinitializing...');
        try { await setupEnhancedAudioSystem(); } catch (err) { console.error('[Voice Detection] Reinit failed:', err); return; }
      }

      if (!(await waitForAudioReady())) {
        await setupEnhancedAudioSystem();
        if (!(await waitForAudioReady())) return;
      }

      if (noVoiceTimeoutRef.current) {
        clearTimeout(noVoiceTimeoutRef.current);
        noVoiceTimeoutRef.current = null;
      }

      // Reset VAD state for fresh detection
      if (vadRef.current) vadRef.current.reset();

      await startEnhancedVoiceMonitoring();
      setWaitingForVoice(true);
      waitingForVoiceRef.current = true;
      setNoVoiceTimer(0);

      if (AUDIO_CONFIG.NO_VOICE_TIMEOUT) {
        noVoiceTimeoutRef.current = setTimeout(() => {
          if (waitingForVoiceRef.current && !isRecordingRef.current) {
            console.log('[Interview] No voice timeout — requesting next question');
            setWaitingForVoice(false);
            waitingForVoiceRef.current = false;
            clearVoiceMonitor();
            if (currentSessionId && getWebSocketState(currentSessionId) === 'open') {
              sendWebSocketMessage(currentSessionId, { type: 'audio_data', audio: '' });
            }
          }
        }, AUDIO_CONFIG.NO_VOICE_TIMEOUT);
      }
    } catch (error) {
      console.error('Auto voice detection failed:', error);
      setWaitingForVoice(false);
    }
  };

  const clearVoiceMonitor = () => {
    if (animationFrameRef.current) {
      clearInterval(animationFrameRef.current);
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  // =========================================================================
  // ENHANCED VOICE MONITORING — Uses VAD instead of raw amplitude
  // =========================================================================
  const startEnhancedVoiceMonitoring = async () => {
    if (!(await waitForAudioReady())) return;
    setWaitingForVoice(true);
    waitingForVoiceRef.current = true;

    let consecutiveVoiceDetections = 0;
    const DETECTION_THRESHOLD = 3; // Fewer needed since VAD already has hysteresis

    if (animationFrameRef.current) {
      clearInterval(animationFrameRef.current);
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    const monitorVoice = () => {
      if (!waitingForVoiceRef.current) { clearVoiceMonitor(); return; }
      if (isRecordingRef.current || isAIPlayingRef.current) return;

      try {
        // Use VAD for voice detection
        if (vadRef.current) {
          const result = vadRef.current.analyze();
          setAudioLevel(result.rawLevel);
          setVoiceConfidence(result.confidence);

          if (result.isVoice) {
            consecutiveVoiceDetections++;
            if (consecutiveVoiceDetections >= DETECTION_THRESHOLD) {
              if (noVoiceTimeoutRef.current) {
                clearTimeout(noVoiceTimeoutRef.current);
                noVoiceTimeoutRef.current = null;
              }
              console.log('[Voice Monitor] Human voice confirmed (confidence=' + result.confidence.toFixed(2) + '), starting recording');
              setWaitingForVoice(false);
              waitingForVoiceRef.current = false;
              clearVoiceMonitor();
              setTimeout(startEnhancedRecording, 50);
              return;
            }
          } else {
            consecutiveVoiceDetections = Math.max(0, consecutiveVoiceDetections - 1);
          }
        } else {
          // Fallback if VAD not initialized
          if (!analyserRef.current) { clearVoiceMonitor(); return; }
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const avgVolume = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
          setAudioLevel(avgVolume / 255);
        }
      } catch (error) {
        console.error('Voice monitoring error:', error);
        setWaitingForVoice(false);
        waitingForVoiceRef.current = false;
        clearVoiceMonitor();
      }
    };

    animationFrameRef.current = setInterval(monitorVoice, 50);
  };

  // =========================================================================
  // RECORDING — check stream, use compatible mime
  // =========================================================================
  const startEnhancedRecording = async () => {
    try {
      if (isRecordingRef.current) return;

      if (!streamRef.current?.active) {
        console.log('[Recording] Stream inactive, reinitializing...');
        await setupEnhancedAudioSystem();
        if (!streamRef.current?.active) return;
      }

      audioChunksRef.current = [];

      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) mimeType = 'audio/webm;codecs=opus';
      else if (MediaRecorder.isTypeSupported('audio/webm')) mimeType = 'audio/webm';
      else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) mimeType = 'audio/ogg;codecs=opus';
      else if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';

      const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType, audioBitsPerSecond: 128000 });
      mediaRecorder.ondataavailable = (event) => { if (event.data?.size > 0) audioChunksRef.current.push(event.data); };
      mediaRecorder.onstop = handleRecordingComplete;
      mediaRecorder.onerror = (e) => { console.error('[Recording] Error:', e); setIsRecording(false); setIsListening(false); };
      mediaRecorder.start(200);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true); isRecordingRef.current = true; setIsListening(true);
      setWaitingForVoice(false); waitingForVoiceRef.current = false;

      // Reset VAD for recording-phase silence detection
      if (vadRef.current) vadRef.current.reset();

      setTimeout(startEnhancedSilenceDetection, 100);
      setTimeout(() => { if (mediaRecorderRef.current?.state === 'recording') stopRecording(); }, AUDIO_CONFIG.MAX_RECORDING_TIME);
    } catch (error) {
      console.error('Recording failed:', error);
      setIsRecording(false); setIsListening(false);
    }
  };

  // =========================================================================
  // SILENCE DETECTION — Now uses VAD to detect human-voice silence only
  // Background noise (fans, AC, traffic) won't prevent silence detection
  // =========================================================================
  const startEnhancedSilenceDetection = () => {
    if (!analyserRef.current) return;

    let speechDetected = false;
    let speechStartTime = null;
    let silenceStartTime = null;
    let recentVoiceStates = [];
    const SMOOTHING_WINDOW = 30;

    const { SILENCE_DURATION_MS, MIN_SPEECH_DURATION_MS } = SILENCE_CONFIG;

    const detectSilenceAndSpeech = () => {
      if (!isRecordingRef.current || mediaRecorderRef.current?.state !== 'recording') return;

      try {
        let isVoiceNow = false;
        let displayLevel = 0;

        if (vadRef.current) {
          // Use frequency-band VAD for voice detection
          const result = vadRef.current.analyze();
          isVoiceNow = result.isVoice;
          displayLevel = result.rawLevel;
          setVoiceConfidence(result.confidence);
        } else {
          // Fallback: raw amplitude (original behavior)
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const avgVolume = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
          displayLevel = avgVolume / 255;
          isVoiceNow = displayLevel > SILENCE_CONFIG.SILENCE_THRESHOLD_ABSOLUTE * 2;
        }

        setAudioLevel(displayLevel);

        // Track voice state history for smoothing
        recentVoiceStates.push(isVoiceNow ? 1 : 0);
        if (recentVoiceStates.length > SMOOTHING_WINDOW) recentVoiceStates.shift();

        const voiceRatio = recentVoiceStates.reduce((a, b) => a + b, 0) / recentVoiceStates.length;

        // Speech detection: if voice ratio > 30% in recent window
        if (!speechDetected && voiceRatio > 0.3) {
          speechDetected = true;
          speechStartTime = Date.now();
          silenceStartTime = null;
          console.log('[Silence Detection] Human speech started (voiceRatio=' + voiceRatio.toFixed(2) + ')');
        }

        // Max recording time safety
        if (speechDetected && Date.now() - speechStartTime > 120000) {
          console.log('[Silence Detection] Max recording time');
          stopRecording();
          return;
        }

        // Silence detection: only after minimum speech time
        if (speechDetected && (Date.now() - speechStartTime) >= MIN_SPEECH_DURATION_MS) {
          // Voice is considered silent when VAD says no voice for sustained period
          // voiceRatio < 0.1 means less than 10% of recent frames had voice
          const isSilent = voiceRatio < 0.1;

          if (isSilent) {
            if (!silenceStartTime) {
              silenceStartTime = Date.now();
              console.log('[Silence Detection] Voice silence started (voiceRatio=' + voiceRatio.toFixed(2) + ')');
            }
            const silenceElapsed = Date.now() - silenceStartTime;
            setSilenceTimer(silenceElapsed);

            if (silenceElapsed >= SILENCE_DURATION_MS) {
              console.log('[Silence Detection] ' + (SILENCE_DURATION_MS / 1000) + 's of voice silence confirmed');
              stopRecording();
              return;
            }
          } else {
            if (silenceStartTime) {
              console.log('[Silence Detection] Voice resumed (voiceRatio=' + voiceRatio.toFixed(2) + ')');
            }
            silenceStartTime = null;
            setSilenceTimer(0);
          }
        }

        animationFrameRef.current = requestAnimationFrame(detectSilenceAndSpeech);
      } catch (error) {
        console.error('Silence detection error:', error);
      }
    };

    if (animationFrameRef.current) {
      clearInterval(animationFrameRef.current);
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(detectSilenceAndSpeech);
  };

  const stopRecording = () => {
    try {
      if (animationFrameRef.current) { clearInterval(animationFrameRef.current); cancelAnimationFrame(animationFrameRef.current); animationFrameRef.current = null; }
      if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
      setIsRecording(false); isRecordingRef.current = false; setIsListening(false);
      setWaitingForVoice(false); waitingForVoiceRef.current = false;
      setSilenceTimer(0); setAudioLevel(0); setNoVoiceTimer(0); setVoiceConfidence(0);
    } catch (error) { console.error('Stop recording error:', error); setIsRecording(false); isRecordingRef.current = false; setIsListening(false); }
  };

  const stopListening = () => {
    setWaitingForVoice(false); waitingForVoiceRef.current = false; setNoVoiceTimer(0); setAudioLevel(0); setVoiceConfidence(0);
    if (noVoiceTimeoutRef.current) { clearTimeout(noVoiceTimeoutRef.current); noVoiceTimeoutRef.current = null; }
    if (animationFrameRef.current) { clearInterval(animationFrameRef.current); cancelAnimationFrame(animationFrameRef.current); animationFrameRef.current = null; }
    stopRecording();
  };

  const handleRecordingComplete = async () => {
    try {
      if (audioChunksRef.current.length === 0) return;
      const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'audio/webm' });
      if (audioBlob.size < 100) return;
      const audioMessage = await processAudioForWebSocket(audioBlob);
      if (currentSessionId && getWebSocketState(currentSessionId) === 'open') {
        sendWebSocketMessage(currentSessionId, audioMessage);
        awaitingServerAnswerRef.current = true;
        setTimeout(() => { if (awaitingServerAnswerRef.current && getWebSocketState(currentSessionId) === 'open') sendWebSocketMessage(currentSessionId, { type: 'next_question' }); }, 8000);
      } else { setConnectionError('Connection lost. Please refresh.'); }
    } catch (error) { console.error('Audio processing failed:', error); setConnectionError(`Audio processing failed: ${error.message}`); }
  };

  const playAudioChunk = async (hexAudio) => {
    try {
      if (!hexAudio || !audioContextRef.current || !gainNodeRef.current) return;
      const audioData = new Uint8Array(hexAudio.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);
      if (audioData.length === 0) return;
      const audioBuffer = await audioContextRef.current.decodeAudioData(audioData.buffer.slice());
      audioQueueRef.current.push(audioBuffer);
      if (!isPlayingAudioRef.current) playNextInQueue();
    } catch (error) { console.error('Audio chunk error:', error); }
  };

  const playNextInQueue = () => {
    if (audioQueueRef.current.length === 0 || !audioContextRef.current || !gainNodeRef.current) { isPlayingAudioRef.current = false; return; }
    const buffer = audioQueueRef.current.shift();
    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = AUDIO_CONFIG.AI_SPEECH_RATE;
    source.connect(gainNodeRef.current);
    currentAudioRef.current = source;
    isPlayingAudioRef.current = true;
    source.onended = () => { currentAudioRef.current = null; isPlayingAudioRef.current = false; setAiSpeechProgress(prev => Math.min(prev + 15, 95)); if (audioQueueRef.current.length > 0) playNextInQueue(); else setAiSpeechProgress(100); };
    source.start();
  };

  // Camera functions (unchanged)
  const getCameraDevices = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Media devices not supported');
      let devices = await navigator.mediaDevices.enumerateDevices();
      let videoDevices = devices.filter(device => device.kind === 'videoinput');
      if (videoDevices.length > 0 && !videoDevices[0].label) {
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false });
        tempStream.getTracks().forEach(track => track.stop());
        await new Promise(resolve => setTimeout(resolve, 100));
        devices = await navigator.mediaDevices.enumerateDevices();
        videoDevices = devices.filter(device => device.kind === 'videoinput');
      }
      setAvailableCameras(videoDevices);
      if (videoDevices.length > 0 && !selectedCamera) setSelectedCamera(videoDevices[0].deviceId);
      return videoDevices;
    } catch (error) { setCameraError(`Camera access failed: ${error.message}`); setCameraPermissionDenied(true); return []; }
  };

  const startCamera = async (deviceId = null) => {
    setCameraInitializing(true); setCameraError(null);
    try {
      if (videoStreamRef.current) { videoStreamRef.current.getTracks().forEach(track => track.stop()); videoStreamRef.current = null; setVideoStream(null); await new Promise(resolve => setTimeout(resolve, 200)); }
      const constraints = { video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 }, ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'user' }) }, audio: false };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (!stream.getVideoTracks()[0]) throw new Error('No video track');
      videoStreamRef.current = stream; setVideoStream(stream); setCameraEnabled(true); setCameraPermissionDenied(false);
    } catch (error) { setCameraError(error.message); setCameraEnabled(false); if (error.name === 'NotAllowedError') setCameraPermissionDenied(true); }
    finally { setCameraInitializing(false); }
  };

  const stopCamera = () => {
    try {
      if (videoStreamRef.current) { videoStreamRef.current.getTracks().forEach(track => track.stop()); videoStreamRef.current = null; }
      if (videoRef.current) { videoRef.current.srcObject = null; videoRef.current.pause(); videoRef.current.load(); }
      setVideoStream(null); setCameraEnabled(false); setCameraInitializing(false); setCameraError(null);
    } catch (error) { console.error('Camera stop error:', error); }
  };

  const switchCamera = async () => {
    if (availableCameras.length <= 1) return;
    const currentIndex = availableCameras.findIndex(camera => camera.deviceId === selectedCamera);
    const nextIndex = (currentIndex + 1) % availableCameras.length;
    setSelectedCamera(availableCameras[nextIndex].deviceId);
    await startCamera(availableCameras[nextIndex].deviceId);
  };

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement || !videoStream) return;
    const setupVideo = async () => {
      try {
        if (videoElement.srcObject) { videoElement.srcObject = null; videoElement.pause(); videoElement.load(); await new Promise(resolve => setTimeout(resolve, 100)); }
        videoElement.srcObject = videoStream; videoElement.muted = true; videoElement.playsInline = true; videoElement.autoplay = true;
        await new Promise(resolve => { if (videoElement.readyState >= 1) resolve(); else videoElement.addEventListener('loadedmetadata', resolve, { once: true }); });
        await videoElement.play();
      } catch (error) { console.error('Video setup error:', error); }
    };
    setupVideo();
  }, [videoStream]);

  useEffect(() => {
    if (interviewStarted && !cameraEnabled && !cameraInitializing) {
      if (availableCameras.length === 0) getCameraDevices().then(() => startCamera());
      else startCamera();
    }
  }, [interviewStarted, cameraEnabled, cameraInitializing]);

  const handleEndInterviewClick = () => setShowEndConfirmation(true);

  const confirmEndInterview = async () => {
    setShowEndConfirmation(false); setIsEndingInterview(true);
    try { await stopInterview(); } catch (error) { console.error('Error ending interview:', error); }
    finally { setIsEndingInterview(false); }
  };

  const stopInterview = async () => {
    try {
      setInterviewStarted(false); setIsConnecting(false); setIsConnected(false);
      stopListening(); if (cameraEnabled) stopCamera();
      if (currentSessionId && getWebSocketState(currentSessionId) === 'open') {
        sendWebSocketMessage(currentSessionId, { type: 'manual_stop', reason: 'user_initiated', timestamp: Date.now() });
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      cleanup(); closeWebSocket(currentSessionId);
      setTimeout(() => navigate('/student/mock-interviews', { state: { message: 'Interview ended by user', type: 'info' } }), 1000);
    } catch (error) { console.error('Stop error:', error); setTimeout(() => navigate('/student/mock-interviews'), 1000); }
  };

  const cleanup = useCallback(() => {
    stopListening(); stopCamera();
    [reconnectTimeoutRef, silenceTimeoutRef, noVoiceTimeoutRef, pingIntervalRef].forEach(ref => { if (ref.current) { clearInterval(ref.current); clearTimeout(ref.current); ref.current = null; } });
    if (animationFrameRef.current) { clearInterval(animationFrameRef.current); cancelAnimationFrame(animationFrameRef.current); animationFrameRef.current = null; }
    if (audioSourceNodeRef.current) { try { audioSourceNodeRef.current.disconnect(); } catch (_) {} audioSourceNodeRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') { audioContextRef.current.close(); audioContextRef.current = null; }
    audioQueueRef.current = []; isPlayingAudioRef.current = false;
    vadRef.current = null;
  }, []);

  const handleHeadphoneConfirm = () => { setShowHeadphoneWarning(false); initializeCompleteSystem(); };
  const handleHeadphoneSkip = () => { setShowHeadphoneWarning(false); const newUrl = new URL(window.location); newUrl.searchParams.set('skip_headphone_check', 'true'); window.history.replaceState({}, '', newUrl); initializeCompleteSystem(); };

  const currentRoundIndex = getCurrentRoundIndex();
  const stageConfig = ROUND_CONFIG[currentStage] || ROUND_CONFIG.introduction;
  const isIntroductionPhase = currentStage === 'introduction';

  const getSystemStatus = () => {
    if (isAIPlaying) return { text: 'AI SPEAKING', color: '#6366f1' };
    if (isRecording) return { text: 'RECORDING', color: '#ef4444' };
    if (waitingForVoice) return { text: 'LISTENING', color: '#22c55e' };
    return { text: 'STANDBY', color: '#64748b' };
  };
  const systemStatus = getSystemStatus();

  // ============================================================================
  // RENDER - Headphone Warning
  // ============================================================================
  if (showHeadphoneWarning) {
    return (
      <Box sx={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Dialog open={true} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '16px', p: 2 } }}>
          <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
            <Box sx={{ width: 72, height: 72, borderRadius: '16px', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Headset sx={{ fontSize: 36, color: '#fff' }} />
            </Box>
            <Typography variant="h5" fontWeight={700}>Headphones Recommended</Typography>
          </DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 3, borderRadius: '10px' }}>
              <Typography variant="body2">For the best experience, use headphones to prevent audio feedback during your interview.</Typography>
            </Alert>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} color="success.main" gutterBottom>✓ Recommended</Typography>
              <Typography variant="body2" color="text.secondary">Wired headphones with microphone, earbuds, or over-ear headphones</Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={600} color="error.main" gutterBottom>✕ Not Recommended</Typography>
              <Typography variant="body2" color="text.secondary">Laptop speakers, external speakers without headphones</Typography>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 2, flexDirection: 'column' }}>
            <Button variant="contained" fullWidth size="large" onClick={handleHeadphoneConfirm} sx={{ borderRadius: '10px', py: 1.5, background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', textTransform: 'none', fontWeight: 600 }}>I Have Headphones Ready</Button>
            <Button variant="text" fullWidth onClick={handleHeadphoneSkip} sx={{ textTransform: 'none', color: '#64748b' }}>Continue Without Headphones</Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  // ============================================================================
  // RENDER - Connecting
  // ============================================================================
  if (isConnecting) {
    return (
      <Box sx={{ minHeight: 'calc(100vh - 64px)', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center', p: 4 }}>
          <CircularProgress size={56} sx={{ mb: 3, color: '#6366f1' }} />
          <Typography variant="h5" fontWeight={600} gutterBottom>{reconnectAttempts > 0 ? `Reconnecting... (${reconnectAttempts}/${WEBSOCKET_CONFIG.RECONNECT_ATTEMPTS})` : 'Initializing Interview System'}</Typography>
          <Typography variant="body2" color="text.secondary">Setting up audio, camera, and AI connection...</Typography>
        </Box>
      </Box>
    );
  }

  // ============================================================================
  // RENDER - Error
  // ============================================================================
  if (connectionError) {
    return (
      <Box sx={{ minHeight: 'calc(100vh - 64px)', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center', p: 4, maxWidth: 480 }}>
          <Box sx={{ width: 72, height: 72, borderRadius: '16px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Warning sx={{ fontSize: 36, color: '#dc2626' }} />
          </Box>
          <Typography variant="h5" fontWeight={600} gutterBottom>Connection Error</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>{connectionError}</Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button variant="outlined" onClick={() => navigate('/student/mock-interviews')} sx={{ borderRadius: '10px', textTransform: 'none' }}>Back to Dashboard</Button>
            <Button variant="contained" onClick={() => window.location.reload()} startIcon={<Refresh />} sx={{ borderRadius: '10px', textTransform: 'none', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>Retry</Button>
          </Box>
        </Box>
      </Box>
    );
  }

  // ============================================================================
  // RENDER - Main Interview Interface
  // ============================================================================
  return (
    <Box sx={{ minHeight: 'calc(100vh - 64px)', background: '#f8fafc', p: 3, display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes recording-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); } 50% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); } }
      `}</style>

      {/* Top Bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', borderRadius: '16px', p: '16px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {MAIN_ROUNDS.map((roundKey, index) => {
            const config = ROUND_CONFIG[roundKey];
            const isActive = currentStage === roundKey;
            const isCompleted = currentRoundIndex > index;
            return (
              <React.Fragment key={roundKey}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '12px', background: isActive ? '#6366f1' : isCompleted ? '#22c55e' : '#f1f5f9', color: isActive || isCompleted ? '#fff' : '#64748b', transition: 'all 0.3s ease' }}>
                  <Typography variant="caption" fontWeight={600}>{config.label}</Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>{Math.floor(config.duration / 60)} min</Typography>
                </Box>
                {index < MAIN_ROUNDS.length - 1 && <Box sx={{ width: '40px', height: '2px', background: isCompleted ? '#22c55e' : '#e2e8f0' }} />}
              </React.Fragment>
            );
          })}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Chip icon={<Timer sx={{ fontSize: 16 }} />} label={`Time: ${formatTime(timeRemaining)}`} size="small" sx={{ background: '#dbeafe', color: '#1d4ed8', fontWeight: 600, '& .MuiChip-icon': { color: '#1d4ed8' } }} />
        </Box>
      </Box>

      {/* Main Content - 50/50 Split */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', flex: 1 }}>
        {/* Left Column */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Video Panel */}
          <Box sx={{ background: '#1e293b', borderRadius: '16px', overflow: 'hidden', position: 'relative', flex: 1, minHeight: '320px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
            <Box sx={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'rgba(0,0,0,0.6)', borderRadius: '8px', color: '#fff', fontSize: '12px', fontWeight: 600, backdropFilter: 'blur(10px)', zIndex: 10 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: systemStatus.color, animation: isRecording ? 'pulse 1s infinite' : 'none' }} />
              {systemStatus.text}
            </Box>
            {cameraEnabled && videoStream ? (
              <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
                {cameraInitializing ? <CircularProgress sx={{ color: '#fff' }} /> : <Videocam sx={{ fontSize: 72, opacity: 0.3, color: '#fff' }} />}
              </Box>
            )}
            <Box sx={{ position: 'absolute', bottom: '12px', left: '12px', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', borderRadius: '10px', padding: '10px 14px', color: '#fff', zIndex: 10 }}>
              <Typography variant="caption" fontWeight={600} sx={{ opacity: 0.85, display: 'block', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{isIntroductionPhase ? 'Introduction Round' : `${stageConfig.label} Round`}</Typography>
              <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '13px' }}>Q{questionNumber || 1}: Interactive Assessment</Typography>
            </Box>
          </Box>

          {/* Action Area — NOW WITH AI AVATAR */}
          <Box sx={{ background: '#fff', borderRadius: '16px', p: 3, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>

            {/* AI Avatar replaces the old icon box */}
            <AIAvatar
              isPlaying={isAIPlaying}
              isListening={isRecording}
              isWaiting={waitingForVoice}
              size={48}
            />

            <Typography variant="h6" fontWeight={700} gutterBottom sx={{ fontSize: '18px', mt: 1 }}>
              {isAIPlaying ? 'AI Speaking...' : isRecording ? 'Recording Your Response' : waitingForVoice ? 'Listening for your voice...' : 'Initializing...'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {isAIPlaying ? 'Please listen to the question carefully' : isRecording ? 'Speak clearly — pauses in speech are auto-detected' : waitingForVoice ? 'Start speaking within 5 seconds or auto-skip' : 'Setting up interview system'}
            </Typography>

            {/* Voice-band audio level + confidence */}
            {(isRecording || waitingForVoice) && (
              <Box sx={{ maxWidth: 300, mx: 'auto', mb: 2 }}>
                <LinearProgress variant="determinate" value={Math.min(audioLevel * 100, 100)} sx={{ height: 6, borderRadius: 3, backgroundColor: '#e2e8f0', '& .MuiLinearProgress-bar': { borderRadius: 3, background: voiceConfidence > 0.5 ? 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)' : 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)' } }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Voice Level: {Math.round(audioLevel * 100)}%
                  </Typography>
                  <Typography variant="caption" sx={{ color: voiceConfidence > 0.5 ? '#16a34a' : '#64748b', fontWeight: voiceConfidence > 0.5 ? 600 : 400 }}>
                    {voiceConfidence > 0.5 ? '🟢 Voice Detected' : '⚪ No Voice'}
                  </Typography>
                </Box>
              </Box>
            )}

            {/* Silence timer */}
            {isRecording && silenceTimer > 0 && (
              <Box sx={{ maxWidth: 300, mx: 'auto', mb: 2 }}>
                <LinearProgress
                  variant="determinate"
                  value={(silenceTimer / SILENCE_CONFIG.SILENCE_DURATION_MS) * 100}
                  sx={{ height: 4, borderRadius: 2, backgroundColor: '#fef3c7', '& .MuiLinearProgress-bar': { borderRadius: 2, background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)' } }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Silence detected: {(silenceTimer / 1000).toFixed(1)}s / {(SILENCE_CONFIG.SILENCE_DURATION_MS / 1000).toFixed(1)}s
                </Typography>
              </Box>
            )}

            <Button onClick={handleEndInterviewClick} disabled={isEndingInterview} startIcon={<StopCircle sx={{ fontSize: 18 }} />} sx={{ padding: '10px 20px', background: 'transparent', border: '2px solid #fca5a5', borderRadius: '10px', color: '#dc2626', fontWeight: 600, fontSize: '13px', textTransform: 'none', '&:hover': { background: '#fef2f2', borderColor: '#f87171' } }}>Terminate Session</Button>
          </Box>
        </Box>

        {/* Right Column */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Session Diagnostics */}
          <Box sx={{ background: '#fff', borderRadius: '16px', p: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', mb: 2, fontWeight: 700, fontSize: '15px', color: '#1e293b' }}>
              <Settings sx={{ fontSize: 18, color: '#6366f1' }} /> Session Diagnostics
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Box sx={{ p: '12px', background: '#f8fafc', borderRadius: '10px' }}>
                <Typography sx={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', mb: '4px' }}>Audio Engine</Typography>
                <Typography sx={{ fontSize: '14px', fontWeight: 600, color: audioInitialized ? '#22c55e' : '#f59e0b' }}>{audioInitialized ? 'Ready' : 'Calibrating...'}</Typography>
              </Box>
              <Box sx={{ p: '12px', background: '#f8fafc', borderRadius: '10px' }}>
                <Typography sx={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', mb: '4px' }}>Network Socket</Typography>
                <Typography sx={{ fontSize: '14px', fontWeight: 600, color: isConnected ? '#22c55e' : '#f59e0b' }}>{isConnected ? 'Connected' : 'Connecting...'}</Typography>
              </Box>
              <Box sx={{ p: '12px', background: '#f8fafc', borderRadius: '10px' }}>
                <Typography sx={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', mb: '4px' }}>Voice Detection</Typography>
                <Typography sx={{ fontSize: '14px', fontWeight: 600, color: voiceConfidence > 0.5 ? '#22c55e' : '#1e293b' }}>
                  {voiceConfidence > 0.5 ? '🟢 Active' : `Level: ${Math.round(audioLevel * 100)}%`}
                </Typography>
              </Box>
              <Box sx={{ p: '12px', background: '#f8fafc', borderRadius: '10px' }}>
                <Typography sx={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', mb: '4px' }}>Difficulty</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: currentDifficulty === 'hard' ? '#ef4444' : currentDifficulty === 'easy' ? '#22c55e' : '#f59e0b' }} />
                  <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{currentDifficulty.toUpperCase()}</Typography>
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Conversation Tip */}
          <Box sx={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', borderRadius: '12px', p: 2, display: 'flex', gap: '12px', alignItems: 'flex-start', border: '1px solid #bfdbfe' }}>
            <Box sx={{ width: '36px', height: '36px', borderRadius: '10px', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
              <Lightbulb sx={{ fontSize: 20 }} />
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ fontSize: '14px' }}>Conversation Tip</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5, fontSize: '13px' }}>Try to maintain consistent eye contact with the camera. It demonstrates confidence and engagement.</Typography>
            </Box>
          </Box>

          {/* Interview System Status */}
          <Box sx={{ background: '#fff', borderRadius: '16px', p: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', mb: 2, fontWeight: 700, fontSize: '15px', color: '#1e293b' }}>
              <Box component="span" sx={{ fontSize: '18px' }}>✨</Box> Interview System Status
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px', mb: 2, flexWrap: 'wrap' }}>
              <Chip icon={<Timer sx={{ fontSize: 16 }} />} label={`Time: ${formatTime(timeRemaining)}`} size="small" sx={{ background: '#1e40af', color: '#fff', fontWeight: 600, '& .MuiChip-icon': { color: '#fff' } }} />
              <Chip label={`Phase: ${stageConfig.label}`} size="small" sx={{ background: '#16a34a', color: '#fff', fontWeight: 600 }} />
              <Chip icon={<CheckCircle sx={{ fontSize: 16 }} />} label={isConnected ? 'WebSocket: Connected' : 'WebSocket: Disconnected'} size="small" sx={{ background: '#f1f5f9', color: isConnected ? '#475569' : '#dc2626', fontWeight: 600, '& .MuiChip-icon': { color: isConnected ? '#16a34a' : '#dc2626' } }} />
            </Box>
            <Box sx={{ background: '#f0fdf4', borderRadius: '12px', p: '16px', border: '1px solid #bbf7d0' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', mb: '12px', fontWeight: 700, fontSize: '14px', color: '#166534' }}>
                <CheckCircle sx={{ fontSize: 20, color: '#16a34a' }} />
                Natural Conversation Flow:
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px', pl: '28px' }}>
                <Typography sx={{ fontSize: '13px', color: '#15803d' }}>
                  <Box component="span" sx={{ mr: 1 }}>🎯</Box>
                  <Box component="span" sx={{ fontWeight: 600 }}>Waiting:</Box> 5 seconds to start speaking, or auto-skip
                </Typography>
                <Typography sx={{ fontSize: '13px', color: '#15803d' }}>
                  <Box component="span" sx={{ mr: 1 }}>🗣️</Box>
                  <Box component="span" sx={{ fontWeight: 600 }}>Speaking:</Box> Talk as long as you need
                </Typography>
                <Typography sx={{ fontSize: '13px', color: '#15803d' }}>
                  <Box component="span" sx={{ mr: 1 }}>⏹️</Box>
                  <Box component="span" sx={{ fontWeight: 600 }}>Finished:</Box> 3 seconds of voice silence → Next question
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Round Transition Dialog */}
      <Dialog open={showRoundTransition} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '16px', p: 2 } }}>
        <DialogContent sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h2" gutterBottom>{stageConfig.icon}</Typography>
          <Typography variant="h5" fontWeight={700} gutterBottom>{transitionMessage}</Typography>
          <Typography variant="body1" color="text.secondary">{stageConfig.description}</Typography>
          <CircularProgress sx={{ mt: 3, color: '#6366f1' }} />
        </DialogContent>
      </Dialog>

      {/* End Interview Confirmation */}
      <Dialog open={showEndConfirmation} onClose={() => setShowEndConfirmation(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '16px', p: 2 } }}>
        <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
          <Box sx={{ width: 72, height: 72, borderRadius: '16px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Warning sx={{ fontSize: 36, color: '#dc2626' }} />
          </Box>
          <Typography variant="h5" fontWeight={700}>End Interview?</Typography>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ borderRadius: '10px' }}>
            <Typography variant="body2">This action cannot be undone. Your progress will be saved and you'll be redirected to results.</Typography>
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button variant="outlined" onClick={() => setShowEndConfirmation(false)} sx={{ borderRadius: '10px', textTransform: 'none', flex: 1 }}>Continue Interview</Button>
          <Button variant="contained" color="error" onClick={confirmEndInterview} startIcon={<Stop />} sx={{ borderRadius: '10px', textTransform: 'none', flex: 1 }}>End Interview</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StartInterview;