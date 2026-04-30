import { useState, useRef, useEffect, useMemo } from 'react';
import { FaPlay, FaPause } from 'react-icons/fa';
import './AudioBubble.css';

// Global audio manager to ensure only one audio plays at a time
let currentlyPlayingAudio = null;

export function AudioBubble({ url, duration: propDuration }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(propDuration || 0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);
  const waveHeights = useMemo(
    () => Array.from({length: 25}, () => Math.max(20, Math.random() * 80)),
    []
  );

  useEffect(() => {
    const audio = new Audio(url);
    audioRef.current = audio;
    setIsPlaying(false);
    setCurrentTime(0);
    
    // Use prop duration if available, otherwise wait for metadata
    if (propDuration) {
      setDuration(propDuration);
    } else {
      setDuration(0);
    }

    const handleLoadedMetadata = () => {
      if (audio.duration && audio.duration !== Infinity && !propDuration) {
        setDuration(audio.duration);
      }
    };
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (currentlyPlayingAudio === audio) {
        currentlyPlayingAudio = null;
      }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
      audio.src = '';
      if (currentlyPlayingAudio === audio) {
        currentlyPlayingAudio = null;
      }
    };
  }, [url, propDuration]);

  const togglePlay = () => {
    const audio = audioRef.current;
    
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      if (currentlyPlayingAudio === audio) {
        currentlyPlayingAudio = null;
      }
    } else {
      // Pause any currently playing audio
      if (currentlyPlayingAudio && currentlyPlayingAudio !== audio) {
        currentlyPlayingAudio.pause();
      }
      
      audio.play().catch(console.error);
      setIsPlaying(true);
      currentlyPlayingAudio = audio;
    }
  };

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return "00:00";
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="mdc-audio-bubble">
      <button className="mdc-audio-play-btn" onClick={togglePlay}>
        {isPlaying ? <FaPause size={14} /> : <FaPlay size={14} style={{marginLeft: 2}} />}
      </button>
      <div className="mdc-audio-waveform">
        <div className="mdc-audio-progress" style={{ width: `${progress}%` }}></div>
        {/* Pseudo waves */}
        <div className="mdc-audio-bars">
           {waveHeights.map((h, i) => (
             <div key={i} className="mdc-audio-bar" style={{height: `${h}%`}}></div>
           ))}
        </div>
      </div>
      <span className="mdc-audio-time">{formatTime(isPlaying ? currentTime : (duration || 0))}</span>
    </div>
  );
}
