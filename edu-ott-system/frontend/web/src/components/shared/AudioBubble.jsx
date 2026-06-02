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
    () => Array.from({ length: 25 }, () => Math.max(20, Math.random() * 80)),
    []
  );

  useEffect(() => {
    if (propDuration) setDuration(propDuration);
  }, [propDuration]);

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.duration && audio.duration !== Infinity && !propDuration) {
      setDuration(audio.duration);
    }
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (audio) setCurrentTime(audio.currentTime);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (currentlyPlayingAudio === audioRef.current) currentlyPlayingAudio = null;
  };

  const handleError = (e) => {
    console.error('Audio playback error:', e.nativeEvent);
    setIsPlaying(false);
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !url) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      if (currentlyPlayingAudio === audio) currentlyPlayingAudio = null;
    } else {
      if (currentlyPlayingAudio && currentlyPlayingAudio !== audio) {
        currentlyPlayingAudio.pause();
      }
      audio.play().catch(err => {
        console.error('Audio playback failed:', err);
        setIsPlaying(false);
      });
      setIsPlaying(true);
      currentlyPlayingAudio = audio;
    }
  };

  const formatTime = (secs) => {
    if (!secs || isNaN(secs) || secs === Infinity) return '00:00';
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="mdc-audio-bubble">
      {url && (
        <audio
          ref={audioRef}
          src={url}
          preload="metadata"
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onError={handleError}
        />
      )}
      <button className="mdc-audio-play-btn" onClick={togglePlay}>
        {isPlaying ? <FaPause size={14} /> : <FaPlay size={14} style={{ marginLeft: 2 }} />}
      </button>
      <div className="mdc-audio-waveform">
        <div className="mdc-audio-progress" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
        <div className="mdc-audio-bars">
          {waveHeights.map((h, i) => (
            <div key={i} className="mdc-audio-bar" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
      <span className="mdc-audio-time">{formatTime(isPlaying ? currentTime : (duration || 0))}</span>
    </div>
  );
}
