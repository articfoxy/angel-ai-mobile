import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import { AppState, type AppStateStatus } from 'react-native';
import type { Socket } from 'socket.io-client';

const CHUNK_DURATION_MS = 200;
const WAV_HEADER_SIZE = 44;

export async function configureAudioSession(): Promise<void> {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
    staysActiveInBackground: true,
    interruptionModeIOS: InterruptionModeIOS.DuckOthers,
    interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });
}

export async function resetAudioSession(): Promise<void> {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: false,
    staysActiveInBackground: false,
    interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
    interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });
}

export async function requestMicPermission(): Promise<boolean> {
  const { granted } = await Audio.requestPermissionsAsync();
  return granted;
}

function readBlobAsArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read blob as ArrayBuffer'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

function stripWavHeader(buffer: ArrayBuffer): ArrayBuffer {
  if (buffer.byteLength <= WAV_HEADER_SIZE) return buffer;
  return buffer.slice(WAV_HEADER_SIZE);
}

export class AudioStreamer {
  private isStreaming = false;
  private socket: Socket;
  private currentRecording: Audio.Recording | null = null;
  private appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
  private wasStreamingBeforeBackground = false;
  private interruptedByOS = false;

  constructor(socket: Socket) {
    this.socket = socket;
  }

  async start(): Promise<void> {
    await configureAudioSession();
    this.isStreaming = true;
    this.interruptedByOS = false;

    // Monitor app state for background/foreground transitions
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);

    this.recordChunk();
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'background' || nextAppState === 'inactive') {
      // App going to background — recording continues via staysActiveInBackground
      this.wasStreamingBeforeBackground = this.isStreaming;
    } else if (nextAppState === 'active') {
      // App returning to foreground
      if (this.wasStreamingBeforeBackground && this.isStreaming && this.interruptedByOS) {
        // Reconfigure audio session after an interruption (e.g., phone call ended)
        this.interruptedByOS = false;
        configureAudioSession().catch(() => {
          // Best effort — if reconfigure fails, recording loop will retry
        });
      }
    }
  };

  private async recordChunk(): Promise<void> {
    if (!this.isStreaming) return;

    try {
      const recording = new Audio.Recording();
      this.currentRecording = recording;

      await recording.prepareToRecordAsync({
        isMeteringEnabled: false,
        android: {
          extension: '.wav',
          outputFormat: Audio.AndroidOutputFormat.DEFAULT,
          audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 256000,
        },
        ios: {
          extension: '.wav',
          audioQuality: Audio.IOSAudioQuality.LOW,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 256000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/wav',
          bitsPerSecond: 256000,
        },
      });

      await recording.startAsync();

      await new Promise<void>((resolve) => {
        setTimeout(resolve, CHUNK_DURATION_MS);
      });

      if (!this.isStreaming) {
        try {
          await recording.stopAndUnloadAsync();
        } catch {
          // Recording might already be stopped
        }
        return;
      }

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (uri && this.isStreaming) {
        try {
          const response = await fetch(uri);
          const blob = await response.blob();
          const fullBuffer = await readBlobAsArrayBuffer(blob);
          const pcmData = stripWavHeader(fullBuffer);
          if (this.isStreaming && pcmData.byteLength > 0) {
            this.socket.emit('audio:chunk', pcmData);
          }
        } catch {
          // Silently handle read errors during streaming
        }
      }

      this.currentRecording = null;

      // Schedule next chunk
      if (this.isStreaming) {
        setTimeout(() => this.recordChunk(), 0);
      }
    } catch {
      this.currentRecording = null;
      // If recording fails (e.g., audio interruption), mark and retry after a brief delay
      if (this.isStreaming) {
        this.interruptedByOS = true;
        // Attempt to reconfigure audio session before retrying
        try {
          await configureAudioSession();
        } catch {
          // Will retry on next chunk attempt
        }
        setTimeout(() => this.recordChunk(), 500);
      }
    }
  }

  async stop(): Promise<void> {
    this.isStreaming = false;

    // Remove app state listener
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    if (this.currentRecording) {
      try {
        await this.currentRecording.stopAndUnloadAsync();
      } catch {
        // Recording might already be stopped
      }
      this.currentRecording = null;
    }

    // Reset audio mode for non-recording state
    await resetAudioSession();
  }
}
