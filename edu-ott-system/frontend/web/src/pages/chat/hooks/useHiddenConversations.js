import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

// Session-level unlock flag (resets when browser tab closes — intentional security behaviour)
const SESSION_KEY = 'hidden_unlocked';
const isUnlocked = () => sessionStorage.getItem(SESSION_KEY) === '1';
const setUnlocked = () => sessionStorage.setItem(SESSION_KEY, '1');
const clearUnlocked = () => sessionStorage.removeItem(SESSION_KEY);

export function useHiddenConversations({ token, fetchConversationsData }) {
  const [showHidden, setShowHidden] = useState(false);
  const [hiddenConvs, setHiddenConvs] = useState([]);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinModalMode, setPinModalMode] = useState('unlock'); // 'unlock' | 'setup' | 'change'
  const [pinInput, setPinInput] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinCurrentInput, setPinCurrentInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinStep, setPinStep] = useState(1); // 1=enter, 2=confirm (setup mode)
  const [hasPin, setHasPin] = useState(false); // from backend

  // ── Load hasPin status from backend on mount ────────────────────────────
  useEffect(() => {
    if (!token) return;
    axios
      .get(`${API_BASE_URL}/settings/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        setHasPin(!!(res.data?.data?.hasHiddenPin));
      })
      .catch(() => {});
  }, [token]);

  // ── Fetch hidden conversations from backend ─────────────────────────────
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

  const openHiddenList = useCallback(async () => {
    await fetchHiddenConversations();
    setShowHidden(true);
  }, [fetchHiddenConversations]);

  // ── Called when user clicks the lock button in sidebar ──────────────────
  const handlePinButtonClick = useCallback(() => {
    if (showHidden) {
      setShowHidden(false);
      clearUnlocked();
      return;
    }
    if (isUnlocked()) {
      openHiddenList();
      return;
    }
    setPinInput('');
    setPinConfirm('');
    setPinCurrentInput('');
    setPinError('');
    setPinStep(1);
    setPinModalMode(hasPin ? 'unlock' : 'setup');
    setShowPinModal(true);
  }, [showHidden, hasPin, openHiddenList]);

  // ── Handle PIN form submission ───────────────────────────────────────────
  const handlePinSubmit = useCallback(async () => {
    if (pinInput.length !== 4 || !/^\d{4}$/.test(pinInput)) {
      setPinError('PIN phải là 4 chữ số');
      return;
    }

    if (pinModalMode === 'setup') {
      // Step 1: first entry
      if (pinStep === 1) {
        setPinStep(2);
        setPinConfirm(pinInput);
        setPinInput('');
        setPinError('');
        return;
      }
      // Step 2: confirm
      if (pinInput !== pinConfirm) {
        setPinError('PIN không khớp, nhập lại từ đầu');
        setPinInput('');
        setPinStep(1);
        return;
      }
      // Save to backend
      try {
        await axios.put(
          `${API_BASE_URL}/settings/hidden-pin`,
          { pin: pinInput },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setHasPin(true);
        setUnlocked();
        setShowPinModal(false);
        toast.success('🔒 Đã thiết lập mã PIN');
        openHiddenList();
      } catch (err) {
        setPinError(err.response?.data?.message || 'Không thể lưu PIN');
        setPinInput('');
        setPinStep(1);
      }
    } else if (pinModalMode === 'change') {
      // 3-step: step 1 = current PIN, step 2 = new PIN, step 3 = confirm new PIN
      if (pinStep === 1) {
        // Just store current PIN and advance — actual verification happens on final submit
        setPinCurrentInput(pinInput);
        setPinStep(2);
        setPinInput('');
        setPinError('');
        return;
      }
      if (pinStep === 2) {
        setPinStep(3);
        setPinConfirm(pinInput);
        setPinInput('');
        setPinError('');
        return;
      }
      // Step 3: confirm match + API call
      if (pinInput !== pinConfirm) {
        setPinError('PIN mới không khớp');
        setPinInput('');
        setPinStep(2);
        return;
      }
      try {
        await axios.put(
          `${API_BASE_URL}/settings/hidden-pin`,
          { pin: pinInput, currentPin: pinCurrentInput },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setHasPin(true);
        setShowPinModal(false);
        toast.success('Đã đổi mã PIN');
      } catch (err) {
        setPinError(err.response?.data?.message || 'Đổi PIN thất bại');
        setPinInput('');
        setPinCurrentInput('');
        setPinStep(1);
      }
    } else {
      // Unlock mode: verify via backend
      try {
        await axios.post(
          `${API_BASE_URL}/settings/hidden-pin/verify`,
          { pin: pinInput },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setUnlocked();
        setShowPinModal(false);
        openHiddenList();
      } catch (err) {
        const code = err.response?.data?.code;
        if (code === 'WRONG_PIN') {
          setPinError('PIN không đúng, thử lại');
        } else {
          setPinError(err.response?.data?.message || 'Xác minh thất bại');
        }
        setPinInput('');
      }
    }
  }, [pinModalMode, pinStep, pinInput, pinConfirm, pinCurrentInput, token, openHiddenList]);

  // ── Unhide a conversation (set isHidden: false in backend) ───────────────
  const handleUnhideConversation = useCallback(
    async (conv) => {
      try {
        await axios.put(
          `${API_BASE_URL}/conversations/${conv._id}/preferences`,
          { isHidden: false },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setHiddenConvs((prev) => prev.filter((c) => String(c._id) !== String(conv._id)));
        fetchConversationsData?.();
        toast.success('Đã hiện lại hội thoại');
      } catch {
        toast.error('Không thể bỏ ẩn');
      }
    },
    [token, fetchConversationsData],
  );

  return {
    showHidden, setShowHidden,
    hiddenConvs, setHiddenConvs,
    showPinModal, setShowPinModal,
    pinModalMode, setPinModalMode,
    pinInput, setPinInput,
    pinConfirm, setPinConfirm,
    pinCurrentInput, setPinCurrentInput,
    pinError, setPinError,
    pinStep, setPinStep,
    hasPin, setHasPin,
    fetchHiddenConversations,
    openHiddenList,
    handlePinButtonClick,
    handlePinSubmit,
    handleUnhideConversation,
  };
}
