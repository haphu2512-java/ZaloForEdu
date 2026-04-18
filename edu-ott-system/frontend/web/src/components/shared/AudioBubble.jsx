import { useState, useRef, useEffect, useMemo } from 'react';
import { FaPlay, FaPause } from 'react-icons/fa';

export function AudioBubble({ url }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
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
    setDuration(0);

    const handleLoadedMetadata = () => {
      if (audio.duration && audio.duration !== Infinity) {
        setDuration(audio.duration);
      }
    };
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
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
    };
  }, [url]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(console.error);
      setIsPlaying(true);
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
