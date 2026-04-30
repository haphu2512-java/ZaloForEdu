import { useState, useEffect } from 'react';
import { FaBell, FaComments, FaUsers, FaVolumeUp, FaSpinner, FaCheck } from 'react-icons/fa';
import { settingsService } from '../services/settingsService';
import './NotificationSettings.css';

/**
 * NotificationSettings Component
 * Manages user notification preferences with real-time API sync
 * Settings are persisted to database and synced across devices
 */
export default function NotificationSettings() {
  const [settings, setSettings] = useState({
    pushEnabled: true,
    messageEnabled: true,
    groupEnabled: true,
    soundEnabled: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load settings from API on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await settingsService.getMySettings();
      const notifSettings = res.data?.data?.notifications;
      if (notifSettings) {
        setSettings(notifSettings);
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = async (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await settingsService.updateMySettings({
        notifications: newSettings,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      // Revert on error
      setSettings(settings);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="notif-settings-loading">
        <FaSpinner className="spin" size={20} />
        <span>Đang tải cài đặt...</span>
      </div>
    );
  }

  const NOTIFICATION_OPTIONS = [
    {
      key: 'pushEnabled',
      icon: FaBell,
      label: 'Thông báo đẩy',
      description: 'Nhận thông báo đẩy trên trình duyệt',
      color: '#0068FF',
    },
    {
      key: 'messageEnabled',
      icon: FaComments,
      label: 'Tin nhắn mới',
      description: 'Thông báo khi có tin nhắn mới',
      color: '#16a34a',
    },
    {
      key: 'groupEnabled',
      icon: FaUsers,
      label: 'Hoạt động nhóm',
      description: 'Thông báo về hoạt động trong nhóm',
      color: '#f59e0b',
    },
    {
      key: 'soundEnabled',
      icon: FaVolumeUp,
      label: 'Âm thanh',
      description: 'Phát âm thanh khi có thông báo',
      color: '#8b5cf6',
    },
  ];

  return (
    <div className="notif-settings">
      <div className="notif-settings-header">
        <h3>Cài đặt thông báo</h3>
        <p className="notif-settings-desc">
          Quản lý các loại thông báo bạn muốn nhận. Cài đặt sẽ được đồng bộ trên tất cả thiết bị.
        </p>
      </div>

      <div className="notif-settings-list">
        {NOTIFICATION_OPTIONS.map((option) => (
          <div key={option.key} className="notif-setting-item">
            <div className="notif-setting-icon" style={{ background: `${option.color}15` }}>
              <option.icon size={18} color={option.color} />
            </div>
            <div className="notif-setting-content">
              <div className="notif-setting-label">{option.label}</div>
              <div className="notif-setting-description">{option.description}</div>
            </div>
            <label className="notif-toggle-switch">
              <input
                type="checkbox"
                checked={settings[option.key]}
                onChange={(e) => updateSetting(option.key, e.target.checked)}
                disabled={isSaving}
              />
              <span className="notif-toggle-slider" />
            </label>
          </div>
        ))}
      </div>

      {/* Save status */}
      <div className="notif-settings-status">
        {isSaving && (
          <span className="notif-status-saving">
            <FaSpinner className="spin" size={12} />
            Đang lưu...
          </span>
        )}
        {saveSuccess && !isSaving && (
          <span className="notif-status-success">
            <FaCheck size={12} />
            Đã lưu thành công
          </span>
        )}
      </div>
    </div>
  );
}
