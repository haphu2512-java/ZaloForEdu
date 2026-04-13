/**
 * PollBubble.tsx
 * Hiển thị bình chọn dạng bubble trong chat
 * Feature 1: Polls
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Poll } from '@/utils/pollService';
import { votePoll } from '@/utils/pollService';

type PollBubbleProps = {
  poll: Poll;
  currentUserId: string;
  colors: any;
  brand: string;
  isMyMessage?: boolean;
  onPollUpdated?: (poll: Poll) => void;
};

export default function PollBubble({
  poll: initialPoll, currentUserId, colors, brand, isMyMessage, onPollUpdated
}: PollBubbleProps) {
  const [poll, setPoll] = useState<Poll>(initialPoll);
  const [voting, setVoting] = useState(false);

  const totalVotes = poll.options.reduce((sum, opt) => {
    const count = typeof opt.votes === 'number' ? opt.votes : opt.votes.length;
    return sum + count;
  }, 0);

  const myVotedIndexes = poll.isAnonymous ? [] : poll.options.reduce<number[]>((acc, opt, idx) => {
    const votes = opt.votes as string[];
    if (votes.includes(currentUserId)) acc.push(idx);
    return acc;
  }, []);

  const getVoteCount = (opt: Poll['options'][0]) =>
    typeof opt.votes === 'number' ? opt.votes : opt.votes.length;

  const getPercent = (count: number) =>
    totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 100);

  const handleVote = useCallback(async (idx: number) => {
    if (poll.isClosed) {
      Alert.alert('Thông báo', 'Bình chọn này đã kết thúc');
      return;
    }
    if (poll.expiredAt && new Date(poll.expiredAt) < new Date()) {
      Alert.alert('Thông báo', 'Bình chọn này đã hết hạn');
      return;
    }

    let newIndexes: number[];
    if (poll.isMultipleChoice) {
      newIndexes = myVotedIndexes.includes(idx)
        ? myVotedIndexes.filter((i) => i !== idx)
        : [...myVotedIndexes, idx];
      if (newIndexes.length === 0) return;
    } else {
      newIndexes = [idx];
    }

    try {
      setVoting(true);
      const updated = await votePoll(poll._id, newIndexes);
      setPoll(updated);
      onPollUpdated?.(updated);
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể gửi bình chọn');
    } finally {
      setVoting(false);
    }
  }, [poll, myVotedIndexes, onPollUpdated]);

  const isExpired = !!(poll.expiredAt && new Date(poll.expiredAt) < new Date());
  const isClosed = poll.isClosed || isExpired;

  return (
    <View style={[
      styles.container,
      isMyMessage
        ? { backgroundColor: brand + '20', borderColor: brand + '40' }
        : { backgroundColor: colors.surface, borderColor: colors.border }
    ]}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="bar-chart" size={16} color={brand} />
        <Text style={[styles.typeLabel, { color: brand }]}>Bình chọn</Text>
        {isClosed && (
          <View style={[styles.closedBadge, { backgroundColor: '#EF4444' + '20' }]}>
            <Text style={{ color: '#EF4444', fontSize: 10, fontWeight: '700' }}>ĐÃ KẾT THÚC</Text>
          </View>
        )}
        {poll.isAnonymous && (
          <Ionicons name="eye-off" size={14} color={colors.muted} style={{ marginLeft: 4 }} />
        )}
        {poll.isMultipleChoice && (
          <Text style={{ color: colors.muted, fontSize: 11, marginLeft: 4 }}>• Nhiều lựa chọn</Text>
        )}
      </View>

      {/* Question */}
      <Text style={[styles.question, { color: colors.text }]}>{poll.question}</Text>

      {/* Options */}
      <View style={styles.options}>
        {poll.options.map((opt, idx) => {
          const count = getVoteCount(opt);
          const percent = getPercent(count);
          const isVoted = myVotedIndexes.includes(idx);

          return (
            <TouchableOpacity
              key={opt._id || idx}
              onPress={() => handleVote(idx)}
              disabled={voting || isClosed}
              activeOpacity={0.7}
              style={[
                styles.option,
                isVoted && { borderColor: brand },
                { borderColor: isVoted ? brand : colors.border + '80' }
              ]}
            >
              {/* Progress bar fill */}
              <View
                style={[
                  styles.progressFill,
                  { width: `${percent}%`, backgroundColor: isVoted ? brand + '35' : colors.border + '50' }
                ]}
              />
              {/* Content */}
              <View style={styles.optionContent}>
                <View style={[
                  styles.checkbox,
                  poll.isMultipleChoice
                    ? { borderRadius: 4 }
                    : { borderRadius: 10 },
                  isVoted && { backgroundColor: brand, borderColor: brand }
                ]}>
                  {isVoted && <Ionicons name="checkmark" size={12} color="#fff" />}
                </View>
                <Text style={[styles.optionText, { color: colors.text }]} numberOfLines={2}>
                  {opt.text}
                </Text>
                <Text style={[styles.optionCount, { color: isVoted ? brand : colors.muted }]}>
                  {percent}%
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          {totalVotes} lượt bình chọn
        </Text>
        {voting && <ActivityIndicator size="small" color={brand} />}
        {poll.expiredAt && !isClosed && (
          <Text style={{ color: '#F59E0B', fontSize: 11 }}>
            Hết hạn: {new Date(poll.expiredAt).toLocaleDateString('vi-VN')}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    maxWidth: 300,
    minWidth: 220,
    gap: 10,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  closedBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 4 },
  question: { fontSize: 15, fontWeight: '700', lineHeight: 22 },
  options: { gap: 8 },
  option: {
    borderWidth: 1.5,
    borderRadius: 10,
    overflow: 'hidden',
    minHeight: 42,
    justifyContent: 'center',
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: 8,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: { flex: 1, fontSize: 14, fontWeight: '500' },
  optionCount: { fontSize: 13, fontWeight: '700', minWidth: 36, textAlign: 'right' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
});
