const tintColorLight = '#0068FF'; // Zalo Blue
const tintColorDark = '#4D94FF';

export default {
  light: {
    text: '#000000',
    background: '#F0F2F5', // Soft gray like Zalo/FB
    surface: '#FFFFFF',
    tint: tintColorLight,
    tabIconDefault: '#8E8E93',
    tabIconSelected: tintColorLight,
    border: '#E5E5EA',
    muted: '#8A8A8E',
    success: '#34C759',
    error: '#FF3B30'
  },
  dark: {
    text: '#FFFFFF',
    background: '#000000',
    surface: '#1C1C1E',
    tint: tintColorDark,
    tabIconDefault: '#8E8E93',
    tabIconSelected: tintColorDark,
    border: '#38383A',
    muted: '#8E8E93',
    success: '#30D158',
    error: '#FF453A'
  },
};

