import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

interface AudioBubbleMobileProps {
  url: string;
  isMe: boolean;
}

export const AudioBubbleMobile: React.FC<AudioBubbleMobileProps> = ({ url, isMe }) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis);
      setDuration(status.durationMillis || 0);
      setIsPlaying(status.isPlaying);
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
        sound?.setPositionAsync(0);
      }
    }
  };

  const togglePlayback = async () => {
    try {
      if (sound) {
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          if (isPlaying) {
            await sound.pauseAsync();
          } else {
            await sound.playAsync();
          }
        } else {
          // Reset if sound is in invalid state
          setSound(null);
          setIsPlaying(false);
          await togglePlayback(); // Try to reload
        }
      } else {
        setIsLoading(true);
        // Force audio to loudspeaker
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          staysActiveInBackground: false,
        });

        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: true },
          onPlaybackStatusUpdate
        );
        setSound(newSound);
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error('Lỗi khi phát âm thanh:', error);
      console.error('Audio URL:', url);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        domain: error.domain,
        nativeStackIOS: error.nativeStackIOS
      });
      setIsLoading(false);
      
      let msg = 'Không thể phát âm thanh này.';
      let title = 'Không thể phát audio';
      
      // Kiểm tra lỗi format không được hỗ trợ
      if (error.message?.includes('format is not supported') || 
          error.message?.includes('-11828') ||
          error.message?.includes('AVFoundationErrorDomain')) {
        title = '⚠️ Format không tương thích';
        msg = 'Tin nhắn audio này được ghi bằng định dạng không tương thích với iOS.\n\n' +
              '🔍 Nguyên nhân có thể:\n' +
              '• Ghi từ web với codec Opus (trong MP4)\n' +
              '• Ghi từ Firefox (dùng WebM)\n' +
              '• Codec không được iOS hỗ trợ\n\n' +
              '✅ Giải pháp:\n' +
              '• Yêu cầu người gửi dùng Chrome/Safari\n' +
              '• Hoặc ghi âm từ thiết bị iOS/Android\n' +
              '• Kiểm tra cài đặt trình duyệt';
      }
      
      import('react-native').then(({ Alert }) => {
        Alert.alert(title, msg, [
          { text: 'Đóng', style: 'cancel' }
        ]);
      });
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
          <ActivityIndicator size="small" color={isMe ? "#0068FF" : "#fff"} />
        ) : (
          <Ionicons 
            name={isPlaying ? "pause" : "play"} 
            size={20} 
            color={isMe ? "#0068FF" : "#fff"} 
            style={{ marginLeft: isPlaying ? 0 : 2 }}
          />
        )}
      </TouchableOpacity>

      <View style={styles.waveformContainer}>
        <View style={styles.waveformBg}>
          <View style={[
            styles.waveformProgress, 
            { width: `${progress}%`, backgroundColor: isMe ? "rgba(255,255,255,0.4)" : "rgba(0,104,255,0.2)" }
          ]} />
          {/* Fake waveform bars */}
          <View style={styles.bars}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((i) => (
              <View 
                key={i} 
                style={[
                  styles.bar, 
                  { 
                    height: 10 + Math.sin(i * 0.8) * 6,
                    backgroundColor: isMe ? "#fff" : "#0068FF",
                    opacity: i / 15 <= progress / 100 ? 1 : 0.4
                  }
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
    shadowColor: "#000",
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
    inset: 0,
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
    color: '#fff',
  },
  timeTextThem: {
    color: '#4B5563',
  },
});
