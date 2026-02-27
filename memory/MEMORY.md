# IPTV Player Project Memory

## Project Structure
```
iptv-player/
├── electron/        ← Electron + React + Vite desktop app
├── react-native/    ← Expo (managed) React Native mobile app (NEW)
└── src/             ← shared hooks/utils
```

## Mobile App (react-native/)
- **Framework**: Expo SDK 55, managed workflow
- **Video**: `expo-video` with `nativeControls` for HLS/MP4 playback
- **Navigation**: React Navigation v7 (Stack + Bottom Tabs)
- **Storage**: `@react-native-async-storage/async-storage` (replaces localStorage)
- **Auth/DB**: Supabase via `@supabase/supabase-js` (same as desktop)
- **Key polyfill**: `react-native-url-polyfill` imported in App.js

## Env Variables (mobile)
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Copy `.env.example` → `.env` to configure

## Running the Mobile App
```bash
cd react-native
npx expo start
# Scan QR with Expo Go app on phone
```

## Important Notes
- HTTP IPTV streams: `NSAllowsArbitraryLoads: true` (iOS) + `usesCleartextTraffic: true` (Android) set in app.json
- Video player uses `expo-video` `useVideoPlayer` hook + `VideoView` component
- `playVideo(video)` sets context state, then call `navigation.navigate('VideoPlayer')` in each screen
- AsyncStorage saves: `iptv_users`, `iptv_channels`, `iptv_watch_history`

## Desktop App (electron/)
- Electron + React + Vite, port 3001
- Uses `hls.js` for HLS video
- Same Supabase backend
