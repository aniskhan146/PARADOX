import { GoogleGenAI, Modality, MediaResolution } from '@google/genai';

export interface GeminiLiveConfig {
  apiKey: string;
  model?: string;
  voiceName?: string;
  systemInstruction?: string;
}

export type LiveEventCallback = {
  onAudioData?: (base64Pcm: string) => void;
  onTextDelta?: (text: string) => void;
  onTurnComplete?: () => void;
  onToolCall?: (functionCalls: Array<{ id: string; name: string; args: any }>) => void;
  onError?: (error: any) => void;
  onClose?: () => void;
  onOpen?: () => void;
};

export class GeminiLiveService {
  private session: any = null;
  private isConnected = false;

  async connect(config: GeminiLiveConfig, callbacks: LiveEventCallback) {
    if (!config.apiKey) {
      throw new Error('API Key is missing');
    }

    const ai = new GoogleGenAI({ apiKey: config.apiKey });
    const model = config.model || 'models/gemini-2.0-flash-exp';

    const tools = [
      {
        functionDeclarations: [
          {
            name: 'runDiagnostics',
            description: 'Run system diagnostics on CPU, RAM, GPU and active workers.',
            parameters: { type: 'OBJECT', properties: {} },
          },
          {
            name: 'toggleMute',
            description: 'Mute or unmute microphone.',
            parameters: {
              type: 'OBJECT',
              properties: {
                mute: { type: 'BOOLEAN', description: 'True to mute, false to unmute' },
              },
              required: ['mute'],
            },
          },
          {
            name: 'getSystemInfo',
            description: 'Get real-time system metrics (CPU, RAM, GPU, Disk, Net).',
            parameters: { type: 'OBJECT', properties: {} },
          },
          {
            name: 'clearChatHistory',
            description: 'Clear local chat history and transcript logs.',
            parameters: { type: 'OBJECT', properties: {} },
          },
        ],
      },
    ];

    const sessionConfig = {
      responseModalities: [Modality.AUDIO, Modality.TEXT],
      mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM,
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: config.voiceName || 'Charon',
          },
        },
      },
      systemInstruction: config.systemInstruction || 'You are PARADOX, a native AI assistant operating hands-free on Windows desktop. You provide concise, intelligent responses and help execute system commands.',
      tools,
    };

    try {
      this.session = await ai.live.connect({
        model,
        callbacks: {
          onopen: () => {
            this.isConnected = true;
            callbacks.onOpen?.();
          },
          onmessage: (message: any) => {
            if (message.toolCall?.functionCalls) {
              callbacks.onToolCall?.(message.toolCall.functionCalls);
            }

            if (message.serverContent?.modelTurn?.parts) {
              for (const part of message.serverContent.modelTurn.parts) {
                if (part.inlineData && part.inlineData.mimeType?.startsWith('audio/pcm')) {
                  callbacks.onAudioData?.(part.inlineData.data);
                }
                if (part.text) {
                  callbacks.onTextDelta?.(part.text);
                }
              }
            }

            if (message.serverContent?.turnComplete) {
              callbacks.onTurnComplete?.();
            }
          },
          onerror: (err: any) => {
            callbacks.onError?.(err);
          },
          onclose: () => {
            this.isConnected = false;
            callbacks.onClose?.();
          },
        },
        config: sessionConfig,
      });
    } catch (err) {
      callbacks.onError?.(err);
      throw err;
    }
  }

  sendAudioChunk(base64Pcm: string) {
    if (this.session && this.isConnected) {
      this.session.sendRealtimeInput({
        mimeType: 'audio/pcm;rate=16000',
        data: base64Pcm,
      });
    }
  }

  sendText(text: string) {
    if (this.session && this.isConnected) {
      this.session.sendClientContent({
        turns: [
          {
            role: 'user',
            parts: [{ text }],
          },
        ],
        turnComplete: true,
      });
    }
  }

  sendToolResponse(functionResponses: Array<{ id: string; name: string; response: any }>) {
    if (this.session && this.isConnected) {
      this.session.sendToolResponse({ functionResponses });
    }
  }

  disconnect() {
    if (this.session) {
      try {
        this.session.close();
      } catch (e) {
        console.error(e);
      }
      this.session = null;
      this.isConnected = false;
    }
  }

  get active() {
    return this.isConnected;
  }
}

export const geminiLiveService = new GeminiLiveService();
