import React, { useState, useEffect } from 'react';
import { FaArrowLeft, FaPlus, FaEdit, FaTrash, FaClock, FaCalendarAlt } from 'react-icons/fa';
import { conversationService } from '../../services/conversationService';
import toast from 'react-hot-toast';
import { DEFAULT_AVATAR } from '../../utils/constants';


export function ReminderListPage({ 
  conversationId, 
  conversationName,
  onBack, 
  onCreateNew,
  onEdit,
  onDelete,
  userId 
}) {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReminder, setSelectedReminder] = useState(null);

  useEffect(() => {
    fetchReminders();
  }, [conversationId]);

  const fetchReminders = async () => {
    try {
      setLoading(true);
      const res = await conversationService.getReminders(conversationId);
      setReminders(res.data || []);
    } catch (err) {
      toast.error('Lỗi tải danh sách nhắc hẹn');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (reminderId) => {
    try {
      await conversationService.joinReminder(reminderId);
      fetchReminders();
      toast.success('Đã tham gia nhắc hẹn');
    } catch (err) {
      toast.error('Lỗi tham gia nhắc hẹn');
    }
  };

  const handleDecline = async (reminderId) => {
    try {
      await conversationService.declineReminder(reminderId);
      fetchReminders();
      toast.success('Đã từ chối nhắc hẹn');
    } catch (err) {
      toast.error('Lỗi từ chối nhắc hẹn');
    }
  };

  const formatReminderTime = (dateStr) => {
    const d = new Date(dateStr);
    const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    return {
      day,
      month,
      dayName: dayNames[d.getDay()],
      time,
      fullDate: `${dayNames[d.getDay()]} ${day}/${month}/${year} lúc ${time}`
    };
  };

  const groupedReminders = reminders.reduce((acc, reminder) => {
    const status = reminder.status === 'done' ? 'Đã qua' : 'Sắp tới';
    if (!acc[status]) acc[status] = [];
    acc[status].push(reminder);
    return acc;
  }, {});

  if (selectedReminder) {
    const rem = selectedReminder;
    const timeInfo = formatReminderTime(rem.remindAt);
    const hasJoined = (rem.participants || []).some(p => String(p._id || p) === String(userId));
    const hasDeclined = (rem.declinedBy || []).some(p => String(p._id || p) === String(userId));
    const isCreator = String(rem.createdBy?._id || rem.createdBy) === String(userId);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--z-bg-main)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--z-border)', background: 'var(--z-bg-sidebar)' }}>
          <button onClick={() => setSelectedReminder(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 8, marginRight: 12 }}>
            <FaArrowLeft size={20} color="var(--z-text-primary)" />
          </button>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--z-text-primary)' }}>Chi tiết nhắc hẹn</span>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {/* Calendar card */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
            <div style={{ background: 'var(--z-primary)', borderRadius: 12, padding: '12px 16px', textAlign: 'center', minWidth: 80, flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{timeInfo.dayName}</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: 'white', lineHeight: 1 }}>{timeInfo.day}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>Tháng {timeInfo.month}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--z-text-primary)', marginBottom: 8 }}>{rem.title}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--z-text-secondary)', marginBottom: 4 }}>
                <FaClock size={14} />
                <span>{timeInfo.fullDate}</span>
              </div>
              <div style={{ fontSize: 14, color: 'var(--z-text-secondary)' }}>
                {rem.participants?.length || 0} người tham gia
              </div>
            </div>
          </div>

          {/* Status */}
          {hasJoined && (
            <div style={{ background: 'rgba(0,104,255,0.08)', border: '1px solid var(--z-primary)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--z-primary)', fontSize: 14, fontWeight: 600 }}>✓ Bạn xác nhận: Tham gia</span>
              <button onClick={() => handleDecline(rem._id)} style={{ border: 'none', background: 'none', color: 'var(--z-primary)', cursor: 'pointer', fontSize: 13, textDecoration: 'underline' }}>Thay đổi</button>
            </div>
          )}
          {hasDeclined && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid #ef4444', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#ef4444', fontSize: 14, fontWeight: 600 }}>✗ Bạn xác nhận: Từ chối</span>
              <button onClick={() => handleJoin(rem._id)} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 13, textDecoration: 'underline' }}>Thay đổi</button>
            </div>
          )}

          {/* Actions */}
          {!hasJoined && !hasDeclined && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
              <button onClick={() => handleJoin(rem._id)} style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: 'var(--z-primary)', color: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                Tham gia
              </button>
              <button onClick={() => handleDecline(rem._id)} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid var(--z-border)', background: 'transparent', color: 'var(--z-text-secondary)', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                Từ chối
              </button>
            </div>
          )}

          {/* Participants */}
          <div style={{ background: 'var(--z-bg-sidebar)', borderRadius: 12, padding: '16px', marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--z-text-primary)', marginBottom: 12 }}>
              Người tham gia ({rem.participants?.length || 0})
            </div>
            {(rem.participants || []).map(p => (
              <div key={p._id || p} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
                <img src={p.avatarUrl || DEFAULT_AVATAR} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} alt="" />
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--z-text-primary)' }}>{p.username || 'Người dùng'}</span>
              </div>
            ))}
          </div>

          {/* Edit/Delete buttons for creator */}
          {isCreator && (
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setSelectedReminder(null); onEdit(rem); }} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid var(--z-border)', background: 'transparent', color: 'var(--z-text-primary)', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <FaEdit size={14} />
                Chỉnh sửa
              </button>
              <button onClick={() => { setSelectedReminder(null); onDelete(rem._id); }} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <FaTrash size={14} />
                Xóa
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--z-bg-main)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--z-border)', background: 'var(--z-bg-sidebar)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 8 }}>
            <FaArrowLeft size={20} color="var(--z-text-primary)" />
          </button>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--z-text-primary)' }}>Danh sách nhắc hẹn</span>
        </div>
        <button onClick={onCreateNew} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 8 }}>
          <FaPlus size={20} color="var(--z-primary)" />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--z-text-secondary)' }}>Đang tải...</div>
        ) : reminders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <FaCalendarAlt size={48} color="var(--z-text-muted)" style={{ marginBottom: 16 }} />
            <div style={{ fontSize: 15, color: 'var(--z-text-secondary)', marginBottom: 8 }}>Chưa có nhắc hẹn nào</div>
            <div style={{ fontSize: 13, color: 'var(--z-text-muted)' }}>Tạo nhắc hẹn mới để không bỏ lỡ sự kiện quan trọng</div>
          </div>
        ) : (
          <>
            {Object.entries(groupedReminders).map(([status, items]) => (
              <div key={status} style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--z-text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {status}
                </div>
                {items.map(rem => {
                  const timeInfo = formatReminderTime(rem.remindAt);
                  const hasJoined = (rem.participants || []).some(p => String(p._id || p) === String(userId));
                  const hasDeclined = (rem.declinedBy || []).some(p => String(p._id || p) === String(userId));
                  
                  return (
                    <div 
                      key={rem._id} 
                      onClick={() => setSelectedReminder(rem)}
                      style={{ 
                        background: 'var(--z-bg-sidebar)', 
                        borderRadius: 12, 
                        padding: '14px 16px', 
                        marginBottom: 12, 
                        cursor: 'pointer',
                        border: '1px solid var(--z-border)',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--z-primary)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--z-border)'}
                    >
                      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                        <div style={{ background: rem.status === 'done' ? '#9ca3af' : 'var(--z-primary)', borderRadius: 8, padding: '8px 10px', textAlign: 'center', minWidth: 56, flexShrink: 0 }}>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{timeInfo.dayName.slice(0, 3)}</div>
                          <div style={{ fontSize: 22, fontWeight: 700, color: 'white', lineHeight: 1.1 }}>{timeInfo.day}</div>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)' }}>Th {timeInfo.month}</div>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--z-text-primary)', marginBottom: 6 }}>{rem.title}</div>
                          <div style={{ fontSize: 13, color: 'var(--z-text-secondary)', marginBottom: 4 }}>
                            {timeInfo.time} {timeInfo.day}/{timeInfo.month}/{new Date(rem.remindAt).getFullYear()}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--z-text-muted)' }}>
                            {rem.participants?.length || 0} người tham gia
                          </div>
                          {hasJoined && (
                            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--z-primary)', fontWeight: 600 }}>✓ Đã tham gia</div>
                          )}
                          {hasDeclined && (
                            <div style={{ marginTop: 6, fontSize: 12, color: '#ef4444', fontWeight: 600 }}>✗ Đã từ chối</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
