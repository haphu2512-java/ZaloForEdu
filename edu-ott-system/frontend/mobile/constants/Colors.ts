const tintColorLight = '#007AFF'; // Brighter soft blue for education
const educationalGreen = '#34C759'; // Positive color for learning progress
const softBackground = '#F5F7FA'; // Very soft, friendly background

export default {
  light: {
    text: '#111827',
    background: softBackground, 
    surface: '#FFFFFF',
    tint: tintColorLight,
    tabIconDefault: '#9CA3AF',
    tabIconSelected: tintColorLight,
    border: '#E5E7EB',
    muted: '#6B7280',
    success: educationalGreen,
    error: '#EF4444',
    secondaryBackground: '#E0F2FE' // light blue for active items
  },
  dark: { // Making dark mode softer or similar
    text: '#F9FAFB',
    background: '#1F2937',
    surface: '#374151',
    tint: '#60A5FA',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: '#60A5FA',
    border: '#4B5563',
    muted: '#9CA3AF',
    success: '#34D399',
    error: '#F87171',
    secondaryBackground: '#1E3A8A'
  },
};
