import React, { useMemo, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Modal, ScrollView, Image,
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

function getVoteUserId(v: any): string {
  if (!v) return '';
  if (typeof v === 'string') return v;
  return String(v._id || v.id || v.userId || '');
}

function getVoteUserName(v: any): string {
  if (!v || typeof v === 'string') return 'Unknown';
  return v.username || v.fullName || 'Unknown';
}

function getVoteUserAvatar(v: any): string {
  if (!v || typeof v === 'string') {
    return 'https://ui-avatars.com/api/?name=U&background=0068ff&color=fff&size=60';
  }
  const name = getVoteUserName(v);
  return v.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0068ff&color=fff&size=60`;
}

export default function PollBubble({
  poll: initialPoll,
  currentUserId,
  colors,
  brand,
  isMyMessage,
  onPollUpdated,
}: PollBubbleProps) {
  const [poll, setPoll] = useState<Poll>(initialPoll);
  const [voting, setVoting] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);

  const voteCountByOption = useMemo(
    () => poll.options.map((opt) => (Array.isArray(opt.votes) ? opt.votes.length : Number(opt.votes) || 0)),
    [poll.options],
  );

  const totalVotes = useMemo(
    () => voteCountByOption.reduce((sum, c) => sum + c, 0),
    [voteCountByOption],
  );

  const myVotedIndexes = useMemo(
    () => poll.options.reduce<number[]>((acc, opt, idx) => {
      if (!Array.isArray(opt.votes)) return acc;
      if (opt.votes.some((v: any) => getVoteUserId(v) === currentUserId)) acc.push(idx);
      return acc;
    }, []),
    [poll.options, currentUserId],
  );

  const getPercent = (count: number) => (totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 100));

  const handleVote = useCallback(async (idx: number) => {
    if (poll.isClosed) {
      Alert.alert('Thông báo', 'Bình ch?n này dã k?t thúc');
      return;
    }
    if (poll.expiredAt && new Date(poll.expiredAt) < new Date()) {
      Alert.alert('Thông báo', 'Bình ch?n này dã h?t h?n');
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
      Alert.alert('L?i', err.message || 'Không th? g?i bình ch?n');
    } finally {
      setVoting(false);
    }
  }, [poll, myVotedIndexes, onPollUpdated]);

  const isExpired = !!(poll.expiredAt && new Date(poll.expiredAt) < new Date());
  const isClosed = poll.isClosed || isExpired;

  return (
    <>
      <View
        style={[
          styles.container,
          {
            backgroundColor: isMyMessage ? '#E8F2FF' : colors.surface,
            borderColor: isMyMessage ? '#9FC4FF' : colors.border,
          },
        ]}
      >
        <View style={styles.header}>
          <Ionicons name="bar-chart" size={18} color={brand} />
          <Text style={[styles.typeLabel, { color: brand }]}>Bình ch?n</Text>
          {poll.isAnonymous && <Ionicons name="eye-off" size={14} color={colors.muted} style={{ marginLeft: 4 }} />}
          {isClosed && <Text style={styles.closedText}>ÐÃ K?T THÚC</Text>}
        </View>

        <Text style={[styles.question, { color: colors.text }]}>{poll.question}</Text>

        <View style={styles.options}>
          {poll.options.map((opt, idx) => {
            const count = voteCountByOption[idx];
            const percent = getPercent(count);
            const isVoted = myVotedIndexes.includes(idx);

            return (
              <TouchableOpacity
                key={opt._id || idx}
                onPress={() => handleVote(idx)}
                disabled={voting || isClosed}
                activeOpacity={0.8}
                style={[
                  styles.option,
                  { borderColor: isVoted ? brand : colors.border },
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    { width: `${percent}%`, backgroundColor: isVoted ? `${brand}26` : `${colors.border}66` },
                  ]}
                />
                <View style={styles.optionContent}>
                  <View style={[styles.bullet, isVoted && { backgroundColor: brand, borderColor: brand }]}>
                    {isVoted ? <Ionicons name="checkmark" size={12} color="#fff" /> : null}
                  </View>
                  <Text style={[styles.optionText, { color: colors.text }]} numberOfLines={2}>{opt.text}</Text>
                  <Text style={[styles.optionStats, { color: isVoted ? brand : colors.muted }]}>{count} • {percent}%</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.footer}>
          <Text style={{ color: colors.muted, fontSize: 12 }}>{totalVotes} lu?t bình ch?n</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {voting ? <ActivityIndicator size="small" color={brand} /> : null}
            {!poll.isAnonymous && totalVotes > 0 ? (
              <TouchableOpacity onPress={() => setDetailVisible(true)}>
                <Text style={{ color: brand, fontSize: 12, fontWeight: '700' }}>Xem chi ti?t</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>

      {!poll.isAnonymous && (
        <Modal visible={detailVisible} transparent animationType="fade" onRequestClose={() => setDetailVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.surface }]}> 
              <View style={styles.modalHeader}>
                <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>Chi ti?t bình ch?n</Text>
                <TouchableOpacity onPress={() => setDetailVisible(false)}>
                  <Ionicons name="close" size={22} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 420 }}>
                {poll.options.map((opt, idx) => {
                  const voters = Array.isArray(opt.votes) ? opt.votes : [];
                  return (
                    <View key={opt._id || idx} style={[styles.detailOption, { borderColor: colors.border }]}> 
                      <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 8 }}>{opt.text} ({voters.length})</Text>
                      {voters.length === 0 ? (
                        <Text style={{ color: colors.muted, fontSize: 12 }}>Chua có ai ch?n</Text>
                      ) : (
                        voters.map((v: any, i: number) => (
                          <View key={`${idx}-${i}-${getVoteUserId(v) || i}`} style={styles.voterRow}>
                            <Image source={{ uri: getVoteUserAvatar(v) }} style={styles.voterAvatar} />
                            <Text style={{ color: colors.text, fontSize: 13 }}>{getVoteUserName(v)}</Text>
                          </View>
                        ))
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    maxWidth: 320,
    minWidth: 240,
    gap: 10,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  closedText: {
    marginLeft: 'auto',
    fontSize: 10,
    fontWeight: '700',
    color: '#EF4444',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  question: { fontSize: 19, fontWeight: '700', lineHeight: 25 },
  options: { gap: 8 },
  option: { borderWidth: 1.5, borderRadius: 10, overflow: 'hidden' },
  progressFill: { position: 'absolute', top: 0, left: 0, bottom: 0 },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
  },
  bullet: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: { flex: 1, fontSize: 16, fontWeight: '500' },
  optionStats: { fontSize: 13, fontWeight: '700', minWidth: 62, textAlign: 'right' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 18,
  },
  modalCard: { borderRadius: 14, padding: 14 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailOption: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  voterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  voterAvatar: { width: 24, height: 24, borderRadius: 12 },
});
