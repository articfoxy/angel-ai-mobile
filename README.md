# Angel AI — iOS Mobile App

A React Native iOS app built with Expo SDK 54, TypeScript, and React Navigation. Connects to the Angel AI backend for real-time conversation intelligence with native AirPods audio capture.

## Features

- **5-Tab Navigation**: Dashboard, Memory, Session/Record, Digest, Settings
- **Real-time Audio Streaming**: Native microphone capture with AirPods/Bluetooth support via `expo-av`
- **Socket.IO Live Sessions**: Real-time transcript streaming, whisper cards, and AI inference indicators
- **Dark Theme**: Full dark UI matching the Angel AI design system
- **Secure Auth**: JWT authentication with `expo-secure-store` for token persistence
- **7 Conversation Modes**: Meeting, Translator, Think, Sales, Learning, Coach, Builder

## Tech Stack

- **Framework**: Expo SDK 54 + React Native 0.81
- **Language**: TypeScript (strict mode)
- **Navigation**: React Navigation 7 (bottom tabs + native stack)
- **Real-time**: Socket.IO client
- **Audio**: expo-av (short-segment WAV recording at 16kHz mono 16-bit PCM)
- **Storage**: expo-secure-store
- **Animations**: react-native-reanimated
- **Icons**: @expo/vector-icons (Ionicons)

## Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- EAS CLI (for builds): `npm install -g eas-cli`
- Apple Developer Account (for TestFlight)
- Xcode 15+ (for local iOS builds)

## Quick Start

### 1. Install Dependencies

```bash
cd angel-ai-mobile
npm install
```

### 2. Start Development Server

```bash
npx expo start
```

Scan the QR code with the **Expo Go** app on your iOS device, or press `i` to open in the iOS Simulator.

> **Note**: Audio recording features require a physical device. The iOS Simulator does not support real microphone input.

### 3. Test Accounts

| Email               | Password      |
|---------------------|---------------|
| test@angelai.dev    | TestPass123!  |
| demo@angelai.dev    | DemoPass123!  |

### 4. Type Check

```bash
npx tsc --noEmit
```

## Project Structure

```
angel-ai-mobile/
├── App.tsx                        # Root: providers + navigation
├── app.json                       # Expo config (iOS, audio permissions)
├── src/
│   ├── theme.ts                   # Colors, spacing, typography
│   ├── config.ts                  # API_URL, WS_URL
│   ├── types.ts                   # Shared TypeScript types
│   ├── services/
│   │   ├── api.ts                 # REST API client (fetch + JWT)
│   │   ├── auth.ts                # Login/register + secure token storage
│   │   ├── socket.ts              # Socket.IO client wrapper
│   │   └── audio.ts               # Native audio capture (expo-av)
│   ├── hooks/
│   │   ├── useAuth.ts             # Auth context + state
│   │   ├── useSocket.ts           # Socket connection management
│   │   ├── useSession.ts          # Live session state machine
│   │   └── useApi.ts              # Generic API fetch hook
│   ├── components/
│   │   ├── LiveTranscript.tsx      # Scrolling transcript view
│   │   ├── WhisperCard.tsx         # AI whisper cards with actions
│   │   ├── ModeSelector.tsx        # Mode selection grid
│   │   ├── ModePill.tsx            # Active mode indicator pill
│   │   ├── ThinkingIndicator.tsx   # Animated thinking dots
│   │   ├── StatCard.tsx            # Dashboard stat card
│   │   └── TabBar.tsx              # Custom bottom tab bar
│   ├── screens/
│   │   ├── LoginScreen.tsx         # Auth (login + register)
│   │   ├── DashboardScreen.tsx     # Home tab
│   │   ├── SessionScreen.tsx       # Record tab (3 states)
│   │   ├── MemoryScreen.tsx        # Memory tab
│   │   ├── DigestScreen.tsx        # Daily digest tab
│   │   └── SettingsScreen.tsx      # Settings tab
│   └── navigation/
│       └── AppNavigator.tsx        # Tab + stack navigation
```

## Backend API

All API calls go to:
```
https://angel-ai-server-production.up.railway.app/api/...
```

Socket.IO connects to the same URL with JWT in `handshake.auth.token`.

### Key Endpoints

| Method | Endpoint                  | Description              |
|--------|---------------------------|--------------------------|
| POST   | /api/auth/login           | Sign in                  |
| POST   | /api/auth/register        | Create account           |
| GET    | /api/auth/me              | Current user             |
| GET    | /api/stats/dashboard      | Dashboard stats          |
| GET    | /api/engagement/streak    | User streak              |
| GET    | /api/sessions?limit=N     | Recent sessions          |
| GET    | /api/modes                | Available modes          |
| GET    | /api/memories?type=X      | Filtered memories        |
| GET    | /api/memories/search?q=X  | Search memories          |
| GET    | /api/memories/stats       | Memory counts            |
| DELETE | /api/memories/:id         | Delete a memory          |
| GET    | /api/digest/today         | Today's digest           |
| GET    | /api/digest/:date         | Historical digest        |
| GET    | /api/preferences          | User preferences         |
| PUT    | /api/preferences          | Update preferences       |

### Socket Events

| Event                | Direction | Description                     |
|----------------------|-----------|---------------------------------|
| session:prepare      | Emit      | Pre-connect Deepgram            |
| session:start-live   | Emit      | Start live session              |
| audio:chunk          | Emit      | Send audio buffer (ArrayBuffer) |
| session:stop-live    | Emit      | Stop session                    |
| transcript:delta     | Listen    | Interim transcript              |
| transcript:final     | Listen    | Final transcript segment        |
| whisper:card         | Listen    | AI whisper card                 |
| inference:thinking   | Listen    | Thinking state                  |
| session:live-status  | Listen    | Connection status               |
| session:status       | Listen    | Session completed               |
| debrief:ready        | Listen    | Debrief data available          |

## Building for TestFlight

### 1. Install EAS CLI

```bash
npm install -g eas-cli
eas login
```

### 2. Configure EAS

```bash
eas build:configure
```

This creates an `eas.json` file. Update it if needed.

### 3. Add Apple Team ID

In `app.json`, add your Apple Developer Team ID:
```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.angelai.app",
      "buildNumber": "1"
    }
  }
}
```

### 4. Build for iOS

```bash
eas build --platform ios --profile production
```

EAS will:
- Manage certificates and provisioning profiles automatically
- Build the app in the cloud
- Provide a download link for the `.ipa` file

### 5. Submit to TestFlight

```bash
eas submit --platform ios
```

Or submit manually:
1. Download the `.ipa` from EAS
2. Open **Transporter** on macOS
3. Upload the `.ipa`
4. Go to App Store Connect → TestFlight → manage testers

### 6. Invite Testers

In App Store Connect:
1. Go to your app → TestFlight
2. Create a testing group
3. Add tester emails
4. Testers will receive an email to install via TestFlight app

## Audio Architecture

The app uses a **short-segment recording** approach for audio streaming:

1. Record 200ms WAV chunks using `expo-av`
2. Each chunk: 16kHz sample rate, mono, 16-bit PCM
3. Read the recorded file as an ArrayBuffer
4. Send via `socket.emit('audio:chunk', buffer)`
5. Immediately start recording the next chunk

This approach works in Expo Go for development and in production builds. For lower latency in production, consider upgrading to `react-native-live-audio-stream` with a custom dev client.

### AirPods Support

The audio session is configured with `allowsRecordingIOS: true` and `playsInSilentModeIOS: true`, which enables Bluetooth (AirPods) input automatically on iOS.

## Development Notes

- **Dark theme only** — no light mode toggle
- **iOS only** — Android is not targeted
- **React Navigation** (not Expo Router) for navigation
- TypeScript strict mode is enabled
- All API errors are handled gracefully with user-facing alerts
- Token refresh is handled automatically on 401 responses

## License

Proprietary — Angel AI
