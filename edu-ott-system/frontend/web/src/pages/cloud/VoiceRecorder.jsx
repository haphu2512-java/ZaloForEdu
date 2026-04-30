import React, { useState, useEffect, useRef } from 'react';
import { FaTrash, FaPlay, FaPause, FaPaperPlane, FaStop, FaMicrophone } from 'react-icons/fa';
import './VoiceRecorder.css';

export const VoiceRecorder = ({ onCancel, onSend }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  
  // Web Audio API for visualization
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const animationFrameRef = useRef(null);
  const canvasRef = useRef(null);

  // Audio playback ref
  const audioPlayerRef = useRef(new Audio());

  useEffect(() => {
    startRecording();
    return () => {
      cleanupAudio();
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.src = "";
      }
    };
  }, []);

  useEffect(() => {
    const player = audioPlayerRef.current;
    
    const handleTimeUpdate = () => {
      setPlaybackTime(Math.floor(player.currentTime));
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
      setPlaybackTime(0);
    };

    player.addEventListener('timeupdate', handleTimeUpdate);
    player.addEventListener('ended', handleEnded);

    return () => {
      player.removeEventListener('timeupdate', handleTimeUpdate);
      player.removeEventListener('ended', handleEnded);
    };
  }, []);

  const cleanupAudio = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      if (sourceRef.current.mediaStream) {
        sourceRef.current.mediaStream.getTracks().forEach(t => t.stop());
      }
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(console.error);
    }
    const tracks = mediaRecorderRef.current?.stream?.getTracks();
    if (tracks) {
      tracks.forEach(track => track.stop());
    }
  };

  const drawVisualizer = (dataArray, bufferLength) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasCtx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    analyserRef.current.getByteFrequencyData(dataArray);

    canvasCtx.clearRect(0, 0, width, height);

    const barWidth = (width / bufferLength) * 2.5;
    let barHeight;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      barHeight = dataArray[i] / 2; // scale

      canvasCtx.fillStyle = '#1B99E1'; // Zalo blue
      // Draw rounded bar
      const h = Math.max(2, barHeight);
      const y = (height - h) / 2;
      canvasCtx.beginPath();
      canvasCtx.roundRect(x, y, barWidth - 1, h, 2);
      canvasCtx.fill();

      x += barWidth;
    }

    animationFrameRef.current = requestAnimationFrame(() => drawVisualizer(dataArray, bufferLength));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          autoGainControl: false,
          noiseSuppression: false,
        }
      });
      
      const clonedStream = stream.clone();
      
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      sourceRef.current = audioContextRef.current.createMediaStreamSource(clonedStream);
      sourceRef.current.connect(analyserRef.current);
      
      analyserRef.current.fftSize = 64;
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      drawVisualizer(dataArray, bufferLength);

      let options = { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 128000 };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'audio/webm', audioBitsPerSecond: 128000 };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options = { mimeType: 'audio/mp4', audioBitsPerSecond: 128000 }; // Safari
          if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options = {}; // fallback behavior
          }
        }
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioBlob(audioBlob);
        setAudioUrl(audioUrl);
      };

      mediaRecorder.start(); // Thu toàn bộ stream thay vì cắt nhỏ mỗi 100ms để tránh lệch rate
      setIsRecording(true);
      
      setRecordingTime(0);
      const startTime = Date.now();
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - startTime) / 1000));
      }, 250);

    } catch (err) {
      console.error("Microphone access denied:", err);
      // Optional: Show toast to user
      onCancel();
    }
  };

  const stopRecording = () => {
    cleanupAudio();
    setIsRecording(false);
  };

  const togglePlayback = () => {
    if (!audioPlayerRef.current || !audioUrl) return;
    
    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.src = audioUrl;
      audioPlayerRef.current.currentTime = playbackTime;
      audioPlayerRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  const handleSend = () => {
    if (audioBlob) {
      onSend(audioBlob, recordingTime);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="voice-recorder-container">
      {isRecording ? (
        <div className="voice-recorder-recording">
          <div className="vr-recording-indicator">
            <div className="vr-red-dot"></div>
            <span className="vr-timer">{formatTime(recordingTime)}</span>
          </div>
          
          <div className="vr-visualizer">
            <canvas ref={canvasRef} width="160" height="40" />
          </div>
          
          <div className="vr-actions is-recording">
            <button className="vr-btn vr-cancel-btn" onClick={onCancel} title="Hủy">
              <FaTrash size={14} />
            </button>
            <button className="vr-btn vr-stop-btn" onClick={stopRecording} title="Dừng ghi âm">
              <FaStop size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div className="voice-recorder-preview">
          <div className="vr-preview-controls">
            <button className="vr-btn vr-delete-btn" onClick={onCancel}>
              <FaTrash size={14} />
            </button>
            <button className="vr-btn vr-play-btn" onClick={togglePlayback}>
              {isPlaying ? <FaPause size={14} /> : <FaPlay size={14} style={{marginLeft: 2}} />}
            </button>
          </div>
          
          {/* Sóng âm tĩnh tượng trưng khi đã ghi xong */}
          <div className="vr-playback-visualizer">
            <div className="vr-pseudo-wave">
               {Array.from({length: 15}).map((_, i) => (
                 <div key={i} className="vr-wave-bar" style={{height: `${Math.max(20, Math.random() * 80)}%`}}></div>
               ))}
            </div>
            <div className="vr-timer">{formatTime(isPlaying ? playbackTime : recordingTime)}</div>
          </div>
          
          <button className="vr-btn vr-send-btn" onClick={handleSend}>
            <FaPaperPlane size={14} />
          </button>
        </div>
      )}
    </div>
  );
};
