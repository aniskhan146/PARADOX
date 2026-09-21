export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private audioProcessor: ScriptProcessorNode | null = null;
  private audioInputSource: MediaStreamAudioSourceNode | null = null;
  private playbackQueue: Float32Array[] = [];
  private isPlaying = false;
  private nextStartTime = 0;

  private onMicrophoneAudioCallback: ((base64Pcm: string) => void) | null = null;
  private onSpeakerLevelCallback: ((level: number) => void) | null = null;
  private onMicLevelCallback: ((level: number) => void) | null = null;

  async init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000,
      });
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  async startMicrophone(onAudioChunk: (base64Pcm: string) => void) {
    await this.init();
    this.onMicrophoneAudioCallback = onAudioChunk;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      const micContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });

      this.audioInputSource = micContext.createMediaStreamSource(this.mediaStream);
      this.audioProcessor = micContext.createScriptProcessor(2048, 1, 1);

      this.audioProcessor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);

        // Calculate Mic Level
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        this.onMicLevelCallback?.(rms);

        // Convert Float32Array to 16-bit PCM Base64
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        const base64Pcm = this.arrayBufferToBase64(pcm16.buffer);
        this.onMicrophoneAudioCallback?.(base64Pcm);
      };

      this.audioInputSource.connect(this.audioProcessor);
      this.audioProcessor.connect(micContext.destination);
    } catch (err) {
      console.error('Failed to access microphone:', err);
      throw err;
    }
  }

  stopMicrophone() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.audioProcessor) {
      this.audioProcessor.disconnect();
      this.audioProcessor = null;
    }
    if (this.audioInputSource) {
      this.audioInputSource.disconnect();
      this.audioInputSource = null;
    }
  }

  playChunk(base64Pcm: string, sampleRate = 24000) {
    this.init();
    if (!this.audioContext) return;

    const arrayBuffer = this.base64ToArrayBuffer(base64Pcm);
    const int16Array = new Int16Array(arrayBuffer);
    const float32Array = new Float32Array(int16Array.length);

    let sum = 0;
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
      sum += float32Array[i] * float32Array[i];
    }

    const rms = Math.sqrt(sum / float32Array.length);
    this.onSpeakerLevelCallback?.(rms);

    const buffer = this.audioContext.createBuffer(1, float32Array.length, sampleRate);
    buffer.getChannelData(0).set(float32Array);

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);

    const currentTime = this.audioContext.currentTime;
    if (this.nextStartTime < currentTime) {
      this.nextStartTime = currentTime;
    }

    source.start(this.nextStartTime);
    this.nextStartTime += buffer.duration;
  }

  setOnSpeakerLevel(cb: (level: number) => void) {
    this.onSpeakerLevelCallback = cb;
  }

  setOnMicLevel(cb: (level: number) => void) {
    this.onMicLevelCallback = cb;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

export const audioEngine = new AudioEngine();
