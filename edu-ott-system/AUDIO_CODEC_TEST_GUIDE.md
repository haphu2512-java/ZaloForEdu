# 🎵 Hướng dẫn Test Audio Codec Compatibility

## Vấn đề đã sửa
- **Trước:** Web ghi audio với Opus codec trong MP4 → iOS không phát được (lỗi -11828)
- **Sau:** Web ưu tiên AAC codec (mp4a.40.2) → iOS có thể phát được

## Cách test

### 1. Kiểm tra codec support của trình duyệt
```bash
# Mở file test trong trình duyệt
open test-codec-support.html
```

### 2. Test cross-platform audio
1. **Web → iOS:**
   - Ghi âm từ web (Chrome/Safari)
   - Kiểm tra console log: `🎤 Recording with format: audio/mp4;codecs=mp4a.40.2`
   - Gửi tin nhắn audio
   - Mở app iOS và thử phát audio

2. **Mobile → Web:**
   - Ghi âm từ app iOS/Android
   - Mở web và thử phát audio (should work)

### 3. Kiểm tra logs

#### Web Console (F12):
```
🔍 Codec support check: {
  MP4+AAC: true/false,
  MP4: true/false,
  MP3: true/false,
  ...
}
🎤 Recording with format: audio/mp4;codecs=mp4a.40.2
🎵 Audio recorded: {
  mimeType: "audio/mp4;codecs=mp4a.40.2",
  size: 150000,  // Should be reasonable size (not 30MB+)
  duration: 5,
  sizePerSecond: 30000,
  isLargeFile: false
}
```

#### iOS App Logs:
- **Success:** No error, audio plays normally
- **Failure:** `Lỗi khi phát âm thanh: [Error: This media format is not supported. - The AVPlayerItem instance has failed with the error code -11828]`

### 4. Expected Results

| Scenario | Before Fix | After Fix |
|----------|------------|-----------|
| Mobile → Mobile | ✅ Works | ✅ Works |
| Mobile → Web | ✅ Works | ✅ Works |
| Web → Web | ✅ Works | ✅ Works |
| Web → iOS | ❌ Error -11828 | ✅ Should work |

### 5. File Size Comparison

| Source | Format | Typical Size (5s audio) |
|--------|--------|-------------------------|
| Mobile | .m4a (AAC) | 80-200KB |
| Web (Fixed) | .mp4 (AAC) | 100-300KB |
| Web (Broken) | .mp4 (Opus) | 30MB+ |

## Troubleshooting

### Nếu vẫn lỗi:
1. **Kiểm tra trình duyệt:** Chrome/Safari support AAC tốt hơn Firefox
2. **Kiểm tra console logs:** Xem codec nào được sử dụng
3. **Kiểm tra file size:** Nếu > 1MB cho vài giây → codec sai
4. **Test fallback:** Nếu AAC không support, sẽ fallback sang MP3/WAV

### Browser Support:
- **Chrome:** ✅ MP4+AAC, MP3, WebM
- **Safari:** ✅ MP4+AAC, MP3
- **Firefox:** ⚠️ Có thể không support AAC, fallback sang MP3

## Next Steps
Nếu vẫn có vấn đề, có thể implement server-side audio conversion:
- Upload audio as-is
- Server convert sang AAC format
- Serve converted version cho iOS clients