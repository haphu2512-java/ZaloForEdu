import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { conversationService } from '../../services/conversationService';
import toast from 'react-hot-toast';

export default function JoinGroupPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const isAuthenticated = !!localStorage.getItem('token');
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    conversationService
      .previewGroupByInviteCode(code)
      .then((res) => setGroup(res.data))
      .catch(() => setError('Link moi khong hop le hoac da het han.'))
      .finally(() => setLoading(false));
  }, [code]);

  const handleJoin = async () => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(`/join/${code}`)}`);
      return;
    }

    setJoining(true);
    try {
      const res = await conversationService.joinGroupByInviteCode(code);
      const joinedConversationId = res.data?._id;

      if (res.data?.requiresApproval) {
        toast.success('Da gui yeu cau tham gia. Vui long cho truong/pho nhom duyet.');
        navigate('/chat');
      } else {
        toast.success(`Da tham gia nhom "${group?.name || ''}" thanh cong!`);
        navigate(joinedConversationId ? `/chat/${joinedConversationId}` : '/chat');
      }
    } catch (err) {
      const errorCode = err.response?.data?.error?.code;
      if (errorCode === 'ALREADY_MEMBER') {
        toast('Ban da la thanh vien cua nhom nay roi.');
        navigate('/chat');
      } else if (errorCode === 'REQUEST_ALREADY_SENT') {
        toast('Yeu cau cua ban dang cho duoc duyet.');
        navigate('/chat');
      } else if (errorCode === 'UNAUTHORIZED') {
        navigate(`/login?redirect=${encodeURIComponent(`/join/${code}`)}`);
      } else {
        toast.error('Khong the tham gia nhom. Vui long thu lai.');
      }
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--z-bg-main)' }}>
        <div style={{ color: 'var(--z-text-secondary)' }}>Dang tai...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--z-bg-main)', gap: 16 }}>
        <div style={{ fontSize: 48 }}>:(</div>
        <div style={{ fontSize: 16, color: 'var(--z-text-primary)', fontWeight: 600 }}>{error}</div>
        <button onClick={() => navigate('/chat')} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: 'var(--z-primary)', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          Ve trang chat
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--z-bg-main)' }}>
      <div style={{ background: 'var(--z-bg-sidebar)', borderRadius: 16, padding: '32px 28px', maxWidth: 360, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', textAlign: 'center' }}>
        <img
          src={group?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(group?.name || 'G')}&background=0068ff&color=fff&size=80`}
          alt="avatar"
          style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', marginBottom: 16 }}
        />
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--z-text-primary)', marginBottom: 8 }}>{group?.name}</div>
        <div style={{ fontSize: 14, color: 'var(--z-text-secondary)', marginBottom: 4 }}>
          {group?.memberCount} thanh vien
        </div>
        {group?.isApprovalRequired && (
          <div style={{ fontSize: 13, color: '#f59e0b', background: '#fef3c7', borderRadius: 8, padding: '6px 12px', margin: '12px 0', display: 'inline-block' }}>
            Nhom yeu cau phe duyet thanh vien
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button
            onClick={() => navigate('/chat')}
            style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid var(--z-border)', background: 'transparent', color: 'var(--z-text-primary)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Huy
          </button>
          <button
            onClick={handleJoin}
            disabled={joining}
            style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: 'var(--z-primary)', color: 'white', fontSize: 14, fontWeight: 600, cursor: joining ? 'not-allowed' : 'pointer', opacity: joining ? 0.7 : 1 }}
          >
            {joining
              ? 'Dang xu ly...'
              : !isAuthenticated
                ? 'Dang nhap de tham gia'
                : group?.isApprovalRequired
                  ? 'Gui yeu cau'
                  : 'Tham gia ngay'}
          </button>
        </div>
      </div>
    </div>
  );
}
