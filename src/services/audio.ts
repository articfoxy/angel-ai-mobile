import { Audio } from 'expo-av';
import type { Socket } from 'socket.io-client';

const CHUNK_DURATION_MS = 200;

export async function configureAudioSession(): Promise<void> {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
    staysActiveInBackground: true,
  });
}

export async function requestMicPermission(): Promise<boolean> {
  const { granted } = await Audio.requestPermissionsAsync();
  return granted;
}

export class AudioStreamer {
  private isStreaming = false;
  private socket: Socket;
  private currentRecording: Audio.Recording | null = null;

  constructor(socket: Socket) {
    this.socket = socket;
  }

  async start(): Promise<void> {
    await configureAudioSession();
    this.isStreaming = true;
    this.recordChunk();
  }

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
          const reader = new FileReader();
          reader.onloadend = () => {
            if (reader.result && this.isStreaming) {
              const arrayBuffer = reader.result as ArrayBuffer;
              // Strip 44-byte WAV header — backend expects raw PCM (16kHz, mono, 16-bit)
              const pcmData = arrayBuffer.byteLength > 44
                ? arrayBuffer.slice(44)
                : arrayBuffer;
              this.socket.emit('audio:chunk', pcmData);
            }
          };
          reader.readAsArrayBuffer(blob);
        } catch {
          // Silently handle read errors during streaming
        }
      }

      this.currentRecording = null;

      // Schedule next chunk
      if (this.isStreaming) {
        setTimeout(() => this.recordChunk(), CHUNK_DURATION_MS);
      }
    } catch {
      // If recording fails, try again after a brief delay
      if (this.isStreaming) {
        setTimeout(() => this.recordChunk(), 100);
      }
    }
  }

  async stop(): Promise<void> {
    this.isStreaming = false;

    if (this.currentRecording) {
      try {
        await this.currentRecording.stopAndUnloadAsync();
      } catch {
        // Recording might already be stopped
      }
      this.currentRecording = null;
    }

    // Reset audio mode
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: false,
    });
  }
}
