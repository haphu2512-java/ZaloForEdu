import { useState, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const getPinKey = (userId) => `hidden_pin_${userId || 'guest'}`;
const hashPin = (pin) => { let h = 5381; for (let i = 0; i < pin.length; i++) h = (h * 33) ^ pin.charCodeAt(i); return String(h >>> 0); };
const isUnlocked = () => sessionStorage.getItem('hidden_unlocked') === '1';
const setUnlocked = () => sessionStorage.setItem('hidden_unlocked', '1');
const clearUnlocked = () => sessionStorage.removeItem('hidden_unlocked');

export function useHiddenConversations({ token, userId, fetchConversationsData }) {
  const [showHidden, setShowHidden] = useState(false);
  const [hiddenConvs, setHiddenConvs] = useState([]);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinModalMode, setPinModalMode] = useState('unlock');
  const [pinInput, setPinInput] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinStep, setPinStep] = useState(1);

  const getSavedPin = useCallback(() => localStorage.getItem(getPinKey(userId)), [userId]);
  const savePin = useCallback((pin) => localStorage.setItem(getPinKey(userId), hashPin(pin)), [userId]);

  const fetchHiddenConversations = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/conversations/archived`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHiddenConvs(res.data?.data?.items || res.data?.items || []);
    } catch {
      setHiddenConvs([]);
    }
  }, [token]);

  const openHiddenList = async () => {
    await fetchHiddenConversations();
    setShowHidden(true);
  };

  const handlePinButtonClick = () => {
    if (showHidden) { setShowHidden(false); clearUnlocked(); return; }
    if (isUnlocked()) { openHiddenList(); return; }
    setPinInput(''); setPinConfirm(''); setPinError(''); setPinStep(1);
    setPinModalMode(getSavedPin() ? 'unlock' : 'setup');
    setShowPinModal(true);
  };

  const handlePinSubmit = async () => {
    if (pinInput.length !== 4) { setPinError('PIN phải đúng 4 chữ số'); return; }
    if (pinModalMode === 'setup') {
      if (pinStep === 1) { setPinStep(2); setPinConfirm(pinInput); setPinInput(''); return; }
      if (pinInput !== pinConfirm) { setPinError('PIN không khớp, thử lại'); setPinInput(''); setPinStep(1); return; }
      savePin(pinInput); setUnlocked(); setShowPinModal(false); openHiddenList();
    } else {
      if (hashPin(pinInput) !== getSavedPin()) { setPinError('PIN không đúng'); setPinInput(''); return; }
      setUnlocked(); setShowPinModal(false); openHiddenList();
    }
  };

  const handleUnhideConversation = useCallback(async (conv) => {
    try {
      await axios.put(
        `${API_BASE_URL}/conversations/${conv._id}/preferences`,
        { isHidden: false },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setHiddenConvs(prev => prev.filter(c => String(c._id) !== String(conv._id)));
      fetchConversationsData();
      toast.success('Đã hiện lại hội thoại');
    } catch {
      toast.error('Không thể bỏ ẩn');
    }
  }, [token, fetchConversationsData]);

  return {
    showHidden, setShowHidden,
    hiddenConvs, setHiddenConvs,
    showPinModal, setShowPinModal,
    pinModalMode, setPinModalMode,
    pinInput, setPinInput,
    pinConfirm, setPinConfirm,
    pinError, setPinError,
    pinStep, setPinStep,
    getSavedPin,
    fetchHiddenConversations,
    openHiddenList,
    handlePinButtonClick,
    handlePinSubmit,
    handleUnhideConversation,
  };
}
