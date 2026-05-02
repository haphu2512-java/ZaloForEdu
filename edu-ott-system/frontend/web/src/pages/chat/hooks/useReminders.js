import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { conversationService } from '../../../services/conversationService';
import { pollService } from '../../../services/pollService';

export function useReminders({ activeConversation, setMessages }) {
  const [reminders, setReminders] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [triggeredReminder, setTriggeredReminder] = useState(null);
  const [polls, setPolls] = useState([]);
  const [loadingPolls, setLoadingPolls] = useState(false);

  useEffect(() => {
    if (activeConversation && activeConversation.type === 'group') {
      fetchReminders(activeConversation._id);
      fetchJoinRequests(activeConversation._id);
      fetchPolls(activeConversation._id);
    } else {
      setReminders([]);
      setJoinRequests([]);
      setPolls([]);
    }
  }, [activeConversation?._id]);

  const fetchPolls = async (convId) => {
    setLoadingPolls(true);
    try {
      const res = await pollService.getPolls(convId, 10);
      setPolls(res.data?.items || res.items || []);
    } catch (err) {
      console.error('Lỗi lấy danh sách bình chọn:', err);
    } finally {
      setLoadingPolls(false);
    }
  };

  const fetchReminders = async (convId) => {
    try {
      const res = await conversationService.getReminders(convId);
      setReminders(res.data || []);
    } catch (err) {
      console.error('Lỗi lấy danh sách nhắc hẹn:', err);
    }
  };

  const fetchJoinRequests = async (convId) => {
    try {
      const res = await conversationService.listJoinRequests(convId);
      setJoinRequests(res.data?.items || []);
    } catch {
      // not admin — ignore
    }
  };

  const handleCreateReminder = async (title, remindAt) => {
    if (!activeConversation) return;
    try {
      await conversationService.createReminder({
        conversationId: activeConversation._id,
        title,
        remindAt: remindAt.toISOString(),
      });
    } catch {
      toast.error('Lỗi tạo nhắc hẹn');
    }
  };

  const handleUpdateReminder = async (reminderId, title, remindAt) => {
    try {
      const res = await conversationService.updateReminder(reminderId, {
        title,
        remindAt: new Date(remindAt).toISOString(),
      });
      setReminders(prev => prev.map(r => r._id === reminderId ? (res.data || r) : r));
      toast.success('Đã cập nhật nhắc hẹn');
    } catch {
      toast.error('Lỗi cập nhật nhắc hẹn');
    }
  };

  const handleDeleteReminder = async (reminderId) => {
    try {
      const res = await conversationService.deleteReminder(reminderId);
      const deletedTitle = res.data?.title || '';
      setReminders(prev => prev.filter(r => r._id !== reminderId));
      const sysMsgId = `sys_rem_del_${Date.now()}`;
      setMessages(prev => [...prev, {
        _id: sysMsgId,
        type: 'system',
        content: `Bạn đã xóa nhắc hẹn "${deletedTitle}"`,
        createdAt: new Date().toISOString(),
        conversationId: activeConversation._id,
      }]);
    } catch {
      toast.error('Lỗi xóa nhắc hẹn');
    }
  };

  const handleJoinReminder = async (reminderId) => {
    try {
      const res = await conversationService.joinReminder(reminderId);
      setReminders(prev => prev.map(r => r._id === reminderId ? (res.data || r) : r));
    } catch {
      toast.error('Lỗi xác nhận tham gia');
    }
  };

  const handleDeclineReminder = async (reminderId) => {
    try {
      const res = await conversationService.declineReminder(reminderId);
      setReminders(prev => prev.map(r => r._id === reminderId ? (res.data || r) : r));
    } catch {
      toast.error('Lỗi từ chối nhắc hẹn');
    }
  };

  const handleProcessJoinRequest = async (requestId, action, { activeConversation, fetchConversationsData }) => {
    if (!activeConversation) return;
    try {
      await conversationService.processJoinRequest(activeConversation._id, requestId, action);
      setJoinRequests(prev => prev.filter(r => r._id !== requestId));
      if (action === 'approve') {
        toast.success('Đã duyệt thành viên');
        fetchConversationsData();
      } else {
        toast.success('Đã từ chối yêu cầu');
      }
    } catch {
      toast.error('Lỗi xử lý yêu cầu');
    }
  };

  const handleCreatePoll = async (pollData, { activeConversation, setShowCreatePollModal }) => {
    if (!activeConversation) return;
    try {
      await pollService.createPoll({ ...pollData, conversationId: activeConversation._id });
      toast.success('📊 Đã tạo bình chọn');
      fetchPolls(activeConversation._id);
      setShowCreatePollModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi tạo bình chọn');
    }
  };

  const handlePollVoted = (updatedPoll, { setMessages }) => {
    if (!updatedPoll) return;
    setMessages(prev => prev.map(m => {
      if (m.type === 'poll' && String(m.pollId?._id || m.pollId) === String(updatedPoll._id)) {
        return { ...m, pollId: updatedPoll };
      }
      return m;
    }));
    setPolls(prev => prev.map(p => String(p._id) === String(updatedPoll._id) ? updatedPoll : p));
  };

  return {
    reminders, setReminders,
    joinRequests, setJoinRequests,
    triggeredReminder, setTriggeredReminder,
    polls, setPolls,
    loadingPolls,
    fetchPolls,
    fetchReminders,
    fetchJoinRequests,
    handleCreateReminder,
    handleUpdateReminder,
    handleDeleteReminder,
    handleJoinReminder,
    handleDeclineReminder,
    handleProcessJoinRequest,
    handleCreatePoll,
    handlePollVoted,
  };
}
