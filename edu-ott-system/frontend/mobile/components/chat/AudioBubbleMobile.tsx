import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

// Global audio manager to ensure only one audio plays at a time
let currentlyPlayingPlayer: any = null;

interface AudioBubbleMobileProps {
  url: string;
  isMe: boolean;
  duration?: number; // Duration in seconds from backend
}

export const AudioBubbleMobile: React.FC<AudioBubbleMobileProps> = ({ url, isMe, duration: propDuration }) => {
  const [player, setPlayer] = useState<any | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState((propDuration || 0) * 1000); // Convert to milliseconds

  useEffect(() => {
    return () => {
      if (player) {
        if (isPlaying) player.pause();
        player.remove();
      }
    };
  }, [player, isPlaying]);

  useEffect(() => {
    if (player) {
      if (isPlaying) player.pause();
      player.remove();
    }
    setPlayer(null);
    setIsPlaying(false);
    setIsLoading(false);
    setPosition(0);
    setDuration((propDuration || 0) * 1000); // Reset to prop duration
  }, [url, propDuration]);

  const onPlaybackStatusUpdate = (status: any, activePlayer?: any) => {
    if (status?.isLoaded) {
      const newPosition = Math.floor((status.currentTime || 0) * 1000);
      const newDuration = Math.floor((status.duration || 0) * 1000);
      
      // Only update if changed to avoid unnecessary re-renders
      if (newPosition !== position) {
        setPosition(newPosition);
      }
      if (newDuration !== duration && newDuration > 0) {
        setDuration(newDuration);
      }
      
      setIsPlaying(!!status.playing);
      
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
        activePlayer?.seekTo?.(0)?.catch?.(() => null);
      }
      return;
    }

    if (status?.error) {
      console.error('Playback status error:', status.error);
      setIsLoading(false);
      setIsPlaying(false);
      Alert.alert('Khong the phat audio', 'File audio khong tuong thich voi thiet bi.');
    }
  };

  const togglePlayback = async () => {
    try {
      if (player) {
        if (!player.isLoaded) {
          player.remove();
          setPlayer(null);
          setIsPlaying(false);
          setPosition(0);
          setDuration((propDuration || 0) * 1000);
          if (currentlyPlayingPlayer === player) {
            currentlyPlayingPlayer = null;
          }
          return;
        }

        if (isPlaying) {
          player.pause();
          if (currentlyPlayingPlayer === player) {
            currentlyPlayingPlayer = null;
          }
          return;
        }

        // Pause any currently playing audio
        if (currentlyPlayingPlayer && currentlyPlayingPlayer !== player) {
          currentlyPlayingPlayer.pause();
        }

        const nearEnd = !!duration && position >= duration - 250;
        if (nearEnd) {
          await player.seekTo?.(0).catch?.(() => null);
          setPosition(0);
        }
        player.play();
        currentlyPlayingPlayer = player;
        return;
      }

      setIsLoading(true);

      // Pause any currently playing audio
      if (currentlyPlayingPlayer) {
        currentlyPlayingPlayer.pause();
      }

      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
      });

      const newPlayer = createAudioPlayer({ uri: url }, { downloadFirst: true, updateInterval: 100 });
      newPlayer.addListener('playbackStatusUpdate', (status: any) => onPlaybackStatusUpdate(status, newPlayer));
      newPlayer.play();
      setPlayer(newPlayer);
      currentlyPlayingPlayer = newPlayer;
      setIsLoading(false);
    } catch (error: any) {
      console.error('Loi khi phat am thanh:', error);
      setIsLoading(false);
      setIsPlaying(false);
      Alert.alert('Khong the phat audio', 'Khong the phat am thanh nay.');
    }
  };

  const formatTime = (millis: number) => {
    const totalSeconds = millis / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const progress = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <View style={[styles.container, isMe ? styles.containerMe : styles.containerThem]}>
      <TouchableOpacity
        onPress={togglePlayback}
        style={[styles.playBtn, isMe ? styles.playBtnMe : styles.playBtnThem]}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={isMe ? '#0068FF' : '#fff'} />
        ) : (
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={20}
            color={isMe ? '#0068FF' : '#fff'}
            style={{ marginLeft: isPlaying ? 0 : 2 }}
          />
        )}
      </TouchableOpacity>

      <View style={styles.waveformContainer}>
        <View style={styles.waveformBg}>
          <View
            style={[
              styles.waveformProgress,
              { width: `${progress}%`, backgroundColor: isMe ? 'rgba(255,255,255,0.4)' : 'rgba(0,104,255,0.2)' },
            ]}
          />
          <View style={styles.bars}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((i) => (
              <View
                key={i}
                style={[
                  styles.bar,
                  {
                    height: 10 + Math.sin(i * 0.8) * 6,
                    backgroundColor: isMe ? '#fff' : '#0068FF',
                    opacity: i / 15 <= progress / 100 ? 1 : 0.4,
                  },
                ]}
              />
            ))}
          </View>
        </View>
      </View>

      <Text style={[styles.timeText, isMe ? styles.timeTextMe : styles.timeTextThem]}>
        {formatTime(isPlaying || position > 0 ? position : duration || 0)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 16,
    minWidth: 200,
    gap: 10,
  },
  containerMe: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  containerThem: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  playBtnMe: {
    backgroundColor: '#fff',
  },
  playBtnThem: {
    backgroundColor: '#0068FF',
  },
  waveformContainer: {
    flex: 1,
    height: 24,
    justifyContent: 'center',
  },
  waveformBg: {
    height: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  waveformProgress: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  bars: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
  },
  bar: {
    width: 2,
    borderRadius: 1,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '600',
    minWidth: 32,
  },
  timeTextMe: {
    color: '#DBEAFE',
  },
  timeTextThem: {
    color: '#6B7280',
  },
});
