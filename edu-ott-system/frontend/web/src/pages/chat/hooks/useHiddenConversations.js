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
  // Modes: 'unlock' | 'setup' | 'change' | 'forgot'
  const [pinModalMode, setPinModalMode] = useState('unlock');
  const [pinInput, setPinInput] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinCurrentInput, setPinCurrentInput] = useState('');
  const [pinError, setPinError] = useState('');
  // Steps per mode:
  //   unlock: 1=enter PIN
  //   setup:  1=enter new PIN, 2=confirm new PIN
  //   change: 1=enter current PIN (verified immediately), 2=enter new PIN, 3=confirm new PIN
  //   forgot: 1=enter account password (verified + clears PIN), 2=enter new PIN, 3=confirm new PIN
  const [pinStep, setPinStep] = useState(1);
  const [hasPin, setHasPin] = useState(false); // from backend
  // Forgot-PIN: store account password across steps
  const [forgotPassword, setForgotPassword] = useState('');

  // ── Load hasPin status from backend on mount ────────────────────────────
  useEffect(() => {
    if (!token) return;
    axios
      .get(`${API_BASE_URL}/settings/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        setHasPin(!!(res.data?.data?.hasHiddenPin));
      })
      .catch(() => { });
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

  // ── Reset all PIN modal state ────────────────────────────────────────────
  const resetPinModal = useCallback(() => {
    setPinInput('');
    setPinConfirm('');
    setPinCurrentInput('');
    setPinError('');
    setPinStep(1);
    setForgotPassword('');
  }, []);

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
    resetPinModal();
    setPinModalMode(hasPin ? 'unlock' : 'setup');
    setShowPinModal(true);
  }, [showHidden, hasPin, openHiddenList, resetPinModal]);

  // ── Switch to "change PIN" mode — always requires current PIN (no session bypass) ─────
  const handleEnterChangeMode = useCallback(() => {
    resetPinModal();
    setPinModalMode('change');
    setShowPinModal(true);
  }, [resetPinModal]);

  // ── Switch to "forgot PIN" mode ──────────────────────────────────────────
  const handleEnterForgotMode = useCallback(() => {
    resetPinModal();
    setPinModalMode('forgot');
    setPinStep(1);
    setShowPinModal(true);
  }, [resetPinModal]);

  // ── Handle PIN form submission ───────────────────────────────────────────
  const handlePinSubmit = useCallback(async () => {
    // --- SETUP mode (no PIN yet) ---
    if (pinModalMode === 'setup') {
      if (pinInput.length !== 4 || !/^\d{4}$/.test(pinInput)) {
        setPinError('PIN phải là 4 chữ số');
        return;
      }
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
      return;
    }

    // --- CHANGE mode (must already be unlocked — gate enforced in handleEnterChangeMode) ---
    if (pinModalMode === 'change') {
      // Step 1: verify current PIN immediately via backend
      if (pinStep === 1) {
        if (pinInput.length !== 4 || !/^\d{4}$/.test(pinInput)) {
          setPinError('PIN phải là 4 chữ số');
          return;
        }
        try {
          await axios.post(
            `${API_BASE_URL}/settings/hidden-pin/verify`,
            { pin: pinInput },
            { headers: { Authorization: `Bearer ${token}` } },
          );
          // Verified — store and advance
          setPinCurrentInput(pinInput);
          setPinStep(2);
          setPinInput('');
          setPinError('');
        } catch (err) {
          const code = err.response?.data?.code;
          setPinError(code === 'WRONG_PIN' ? 'PIN hiện tại không đúng' : (err.response?.data?.message || 'Xác minh thất bại'));
          setPinInput('');
        }
        return;
      }
      // Step 2: enter new PIN
      if (pinStep === 2) {
        if (pinInput.length !== 4 || !/^\d{4}$/.test(pinInput)) {
          setPinError('PIN phải là 4 chữ số');
          return;
        }
        setPinStep(3);
        setPinConfirm(pinInput);
        setPinInput('');
        setPinError('');
        return;
      }
      // Step 3: confirm new PIN + save
      if (pinInput.length !== 4 || !/^\d{4}$/.test(pinInput)) {
        setPinError('PIN phải là 4 chữ số');
        return;
      }
      if (pinInput !== pinConfirm) {
        setPinError('PIN mới không khớp, nhập lại');
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
        toast.success('✅ Đã đổi mã PIN thành công');
      } catch (err) {
        setPinError(err.response?.data?.message || 'Đổi PIN thất bại');
        setPinInput('');
        setPinStep(1);
      }
      return;
    }

    // --- FORGOT mode: step 1 = account password → reset PIN, step 2-3 = set new PIN ---
    if (pinModalMode === 'forgot') {
      if (pinStep === 1) {
        // pinInput is repurposed as password input in this step (text mode)
        if (!pinInput.trim()) {
          setPinError('Vui lòng nhập mật khẩu tài khoản');
          return;
        }
        try {
          await axios.post(
            `${API_BASE_URL}/settings/hidden-pin/reset`,
            { password: pinInput.trim() },
            { headers: { Authorization: `Bearer ${token}` } },
          );
          // Password verified, PIN cleared — now ask user to set a new PIN
          setForgotPassword(pinInput.trim());
          setHasPin(false);
          setPinStep(2);
          setPinInput('');
          setPinError('');
          toast('Xác minh thành công. Hãy đặt mã PIN mới.', { icon: '🔑' });
        } catch (err) {
          const code = err.response?.data?.code;
          setPinError(code === 'WRONG_PASSWORD' ? 'Mật khẩu tài khoản không đúng' : (err.response?.data?.message || 'Xác minh thất bại'));
          setPinInput('');
        }
        return;
      }
      // Step 2: enter new PIN
      if (pinStep === 2) {
        if (pinInput.length !== 4 || !/^\d{4}$/.test(pinInput)) {
          setPinError('PIN phải là 4 chữ số');
          return;
        }
        setPinStep(3);
        setPinConfirm(pinInput);
        setPinInput('');
        setPinError('');
        return;
      }
      // Step 3: confirm + save new PIN
      if (pinInput.length !== 4 || !/^\d{4}$/.test(pinInput)) {
        setPinError('PIN phải là 4 chữ số');
        return;
      }
      if (pinInput !== pinConfirm) {
        setPinError('PIN không khớp, nhập lại');
        setPinInput('');
        setPinStep(2);
        return;
      }
      try {
        await axios.put(
          `${API_BASE_URL}/settings/hidden-pin`,
          { pin: pinInput },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setHasPin(true);
        setUnlocked();
        setShowPinModal(false);
        toast.success('🔒 Đã đặt lại mã PIN mới');
        openHiddenList();
      } catch (err) {
        setPinError(err.response?.data?.message || 'Không thể lưu PIN mới');
        setPinInput('');
        setPinStep(2);
      }
      return;
    }

    // --- UNLOCK mode: verify via backend ---
    if (pinInput.length !== 4 || !/^\d{4}$/.test(pinInput)) {
      setPinError('PIN phải là 4 chữ số');
      return;
    }
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
      setPinError(code === 'WRONG_PIN' ? 'PIN không đúng, thử lại' : (err.response?.data?.message || 'Xác minh thất bại'));
      setPinInput('');
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
    forgotPassword,
    fetchHiddenConversations,
    openHiddenList,
    handlePinButtonClick,
    handlePinSubmit,
    handleUnhideConversation,
    handleEnterChangeMode,
    handleEnterForgotMode,
    resetPinModal,
  };
}