/**
 * Audio Capture & Playback Helpers
 * Optimized for Gemini Live (16kHz PCM In, 24kHz PCM Out)
 */

export function float32ToInt16(float32Array: Float32Array): Int16Array {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16Array;
}

export function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array | ArrayBufferLike): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer as ArrayBuffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Resample audio buffer if client browser microphone runs at 44.1k or 48k to 16k
export function downsampleTo16k(
  buffer: Float32Array,
  sourceSampleRate: number
): Float32Array {
  if (sourceSampleRate === 16000) return buffer;
  const ratio = sourceSampleRate / 16000;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

/**
 * Audio Player for Live Output (24kHz Raw PCM or WAV)
 * Handles queued chunks and instantaneous interruption.
 */
export class RealtimeAudioPlayer {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  // Measures what is actually being played so the UI can visualise the interpreter's voice
  private analyser: AnalyserNode | null = null;
  private levelBuffer: Float32Array<ArrayBuffer> | null = null;
  private nextPlayTime: number = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private isInterrupted: boolean = false;
  private playbackEndTimeout: ReturnType<typeof setTimeout> | null = null;
  private onPlaybackStateChange?: (isPlaying: boolean) => void;

  constructor(onPlaybackStateChange?: (isPlaying: boolean) => void) {
    this.onPlaybackStateChange = onPlaybackStateChange;
  }

  public isPlaying(): boolean {
    if (!this.audioCtx) return false;
    return this.activeSources.length > 0 || this.audioCtx.currentTime < this.nextPlayTime;
  }

  private notifyPlaybackState(playing: boolean) {
    if (this.onPlaybackStateChange) {
      this.onPlaybackStateChange(playing);
    }
  }

  private initContext() {
    if (!this.audioCtx) {
      const audioWindow = window as unknown as { webkitAudioContext?: typeof AudioContext };
      const AudioCtxClass = window.AudioContext || audioWindow.webkitAudioContext;
      if (AudioCtxClass) {
        try {
          this.audioCtx = new AudioCtxClass({ sampleRate: 24000 });
        } catch {
          // Fallback for mobile browsers (iOS Safari, Huawei Browser, older Android) that only accept native hardware rate
          try {
            this.audioCtx = new AudioCtxClass();
          } catch (inner) {
            console.warn('AudioContext creation note:', inner);
          }
        }
      }
    }
    if (this.audioCtx) {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }

      // Build hardware-accelerated audio processing chain for rock-solid loudness and zero fluctuations
      if (!this.compressor || !this.masterGain) {
        try {
          // DynamicsCompressor: Smooths volume dips and prevents distortion
          this.compressor = this.audioCtx.createDynamicsCompressor();
          this.compressor.threshold.setValueAtTime(-26, this.audioCtx.currentTime); // dB
          this.compressor.knee.setValueAtTime(10, this.audioCtx.currentTime); // dB
          this.compressor.ratio.setValueAtTime(12, this.audioCtx.currentTime); // 12:1 compression
          this.compressor.attack.setValueAtTime(0.003, this.audioCtx.currentTime); // 3ms fast attack
          this.compressor.release.setValueAtTime(0.20, this.audioCtx.currentTime); // 200ms smooth decay

          // Master Gain: Boosts overall volume so the AI voice is always loud and intelligible
          this.masterGain = this.audioCtx.createGain();
          this.masterGain.gain.setValueAtTime(1.9, this.audioCtx.currentTime); // 1.9x volume boost

          // Routing: Source -> Compressor -> Master Gain -> Analyser -> Audio Destination
          this.analyser = this.audioCtx.createAnalyser();
          this.analyser.fftSize = 512;
          this.analyser.smoothingTimeConstant = 0.6;
          this.levelBuffer = new Float32Array(this.analyser.fftSize);
          this.compressor.connect(this.masterGain);
          this.masterGain.connect(this.analyser);
          this.analyser.connect(this.audioCtx.destination);
        } catch (chainErr) {
          console.warn('Audio compressor chain setup note:', chainErr);
        }
      }
    }
  }

  public playPcmChunk(base64Pcm: string) {
    if (this.isInterrupted) return;
    this.initContext();
    if (!this.audioCtx) return;

    try {
      const rawBytes = base64ToArrayBuffer(base64Pcm);
      const int16 = new Int16Array(rawBytes);

      // Analyze peak amplitude to detect quiet whispered or fluctuating phrases
      let peak = 0;
      for (let i = 0; i < int16.length; i++) {
        const abs = Math.abs(int16[i]);
        if (abs > peak) peak = abs;
      }

      // Pre-normalization boost factor: Elevate low-amplitude speech to reference target
      const boostFactor = peak > 1000 ? Math.min(2.8, 30500 / peak) : 1.0;

      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        const sample = (int16[i] * boostFactor) / 32768.0;
        // Soft-clip safety threshold to avoid digital buzzing
        float32[i] = Math.max(-0.99, Math.min(0.99, sample));
      }

      const audioBuffer = this.audioCtx.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      const source = this.audioCtx.createBufferSource();
      source.buffer = audioBuffer;

      // Route through compressor + master gain chain
      if (this.compressor) {
        source.connect(this.compressor);
      } else {
        source.connect(this.audioCtx.destination);
      }

      const currentTime = this.audioCtx.currentTime;
      const startTime = Math.max(currentTime, this.nextPlayTime);
      source.start(startTime);
      this.nextPlayTime = startTime + audioBuffer.duration;

      this.notifyPlaybackState(true);
      if (this.playbackEndTimeout) clearTimeout(this.playbackEndTimeout);
      const remainingMs = Math.max(0, (this.nextPlayTime - currentTime) * 1000) + 300;
      this.playbackEndTimeout = setTimeout(() => {
        if (!this.isPlaying()) {
          this.notifyPlaybackState(false);
        }
      }, remainingMs);

      this.activeSources.push(source);
      source.onended = () => {
        const idx = this.activeSources.indexOf(source);
        if (idx !== -1) {
          this.activeSources.splice(idx, 1);
        }
        if (this.activeSources.length === 0 && (!this.audioCtx || this.audioCtx.currentTime >= this.nextPlayTime)) {
          this.notifyPlaybackState(false);
        }
      };
    } catch (err) {
      console.error('Failed to play PCM chunk:', err);
    }
  }

  public async playWavAudio(base64Wav: string): Promise<void> {
    this.initContext();
    const ctx = this.audioCtx;
    if (!ctx) return;

    return new Promise<void>((resolve) => {
      (async () => {
        try {
          const arrayBuf = base64ToArrayBuffer(base64Wav);
          const audioBuffer = await ctx.decodeAudioData(arrayBuf);
          if (this.isInterrupted) {
            resolve();
            return;
          }

          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;

          // Route through compressor + master gain chain
          if (this.compressor) {
            source.connect(this.compressor);
          } else {
            source.connect(ctx.destination);
          }

          this.notifyPlaybackState(true);
          source.start(0);
          this.activeSources.push(source);

          source.onended = () => {
            const idx = this.activeSources.indexOf(source);
            if (idx !== -1) {
              this.activeSources.splice(idx, 1);
            }
            if (this.activeSources.length === 0) {
              this.notifyPlaybackState(false);
            }
            resolve();
          };
        } catch (err) {
          console.error('Failed to play WAV audio:', err);
          this.notifyPlaybackState(false);
          resolve();
        }
      })();
    });
  }

  /** Current playback loudness, 0–1 (RMS of the last ~20 ms). */
  public getOutputLevel(): number {
    if (!this.analyser || !this.levelBuffer || this.activeSources.length === 0) return 0;
    this.analyser.getFloatTimeDomainData(this.levelBuffer);
    let sum = 0;
    for (let i = 0; i < this.levelBuffer.length; i++) sum += this.levelBuffer[i] * this.levelBuffer[i];
    return Math.min(1, Math.sqrt(sum / this.levelBuffer.length) * 3.2);
  }

  // Immediately cancel all scheduled or currently playing audio
  public interrupt() {
    this.isInterrupted = true;
    if (this.playbackEndTimeout) {
      clearTimeout(this.playbackEndTimeout);
      this.playbackEndTimeout = null;
    }
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // already stopped
      }
    }
    this.activeSources = [];
    if (this.audioCtx) {
      this.nextPlayTime = this.audioCtx.currentTime;
    }
    this.notifyPlaybackState(false);
    // Release interruption flag shortly after stopping
    setTimeout(() => {
      this.isInterrupted = false;
    }, 100);
  }

  public close() {
    this.interrupt();
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
    }
    // Nodes belong to the closed context; drop them so a later initContext() builds a fresh chain
    this.audioCtx = null;
    this.compressor = null;
    this.masterGain = null;
    this.analyser = null;
    this.levelBuffer = null;
  }
}

// Global shared audio player for consistent volume-boosted, compressed speech playback across the app
let sharedGlobalAudioPlayer: RealtimeAudioPlayer | null = null;

export function getSharedAudioPlayer(): RealtimeAudioPlayer {
  if (!sharedGlobalAudioPlayer) {
    sharedGlobalAudioPlayer = new RealtimeAudioPlayer();
  }
  return sharedGlobalAudioPlayer;
}

/** Loudness of on-demand playback (replay / fallback speech), 0–1. */
export function getSharedOutputLevel(): number {
  return sharedGlobalAudioPlayer?.getOutputLevel() ?? 0;
}

/** Stops any on-demand playback started through playNormalizedAudioWav(). */
export function stopNormalizedAudio(): void {
  sharedGlobalAudioPlayer?.interrupt();
}

export async function playNormalizedAudioWav(base64Wav: string): Promise<void> {
  const player = getSharedAudioPlayer();
  await player.playWavAudio(base64Wav);
}
