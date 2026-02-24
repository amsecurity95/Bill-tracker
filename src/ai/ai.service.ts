import { BadGatewayException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ChatDto } from './dto/chat.dto';

interface OllamaModel {
  model?: string;
  name?: string;
}

interface OllamaTagsResponse {
  models?: OllamaModel[];
}

interface OllamaChatResponse {
  model?: string;
  created_at?: string;
  done?: boolean;
  total_duration?: number;
  message?: {
    role?: string;
    content?: string;
  };
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly baseUrl = (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/+$/, '');
  private readonly defaultModel = process.env.OLLAMA_MODEL || 'llama3.1';
  private readonly timeoutMs = Number.parseInt(process.env.OLLAMA_TIMEOUT_MS || '30000', 10);
  private readonly mockMode = process.env.AI_MOCK_MODE === 'true';
  private readonly mockFallbackOnError = process.env.AI_MOCK_FALLBACK_ON_ERROR === 'true';

  async health() {
    if (this.mockMode) {
      return {
        status: 'ok',
        mode: 'mock',
        reachable: true,
        ollamaBaseUrl: this.baseUrl,
        defaultModel: this.defaultModel,
        availableModels: [this.defaultModel],
        message: 'AI mock mode is enabled. Ollama is not being called.',
        suggestion: 'Set AI_MOCK_MODE=false to call Ollama directly.',
      };
    }

    try {
      const response = await this.fetchWithTimeout('/api/tags', {
        method: 'GET',
      });

      if (!response.ok) {
        const rawBody = await this.safeReadBody(response);
        return {
          status: 'error',
          reachable: false,
          ollamaBaseUrl: this.baseUrl,
          defaultModel: this.defaultModel,
          availableModels: [],
          message: `Ollama responded with HTTP ${response.status}. ${rawBody || ''}`.trim(),
          suggestion:
            'Make sure the OLLAMA_BASE_URL is correct and Ollama is running. For local usage run: ollama serve',
        };
      }

      const body = (await response.json()) as OllamaTagsResponse;
      const availableModels = (body.models || [])
        .map((item) => item.model || item.name)
        .filter((name): name is string => Boolean(name));

      const hasDefaultModel = availableModels.some((name) => name === this.defaultModel);

      return {
        status: 'ok',
        reachable: true,
        ollamaBaseUrl: this.baseUrl,
        defaultModel: this.defaultModel,
        availableModels,
        message: hasDefaultModel
          ? 'Ollama is reachable and default model is available.'
          : 'Ollama is reachable, but the default model was not found.',
        suggestion: hasDefaultModel
          ? undefined
          : `Pull model with: ollama pull ${this.defaultModel}`,
      };
    } catch (error) {
      const reason = this.getErrorReason(error);
      return {
        status: 'error',
        reachable: false,
        ollamaBaseUrl: this.baseUrl,
        defaultModel: this.defaultModel,
        availableModels: [],
        message: `Could not reach Ollama: ${reason}`,
        suggestion:
          'Start Ollama and check network connectivity. Example: ollama serve (for local dev) and set OLLAMA_BASE_URL for remote hosts.',
      };
    }
  }

  async chat(chatDto: ChatDto) {
    const selectedModel = chatDto.model || this.defaultModel;

    if (this.mockMode) {
      return this.buildMockChatResponse(chatDto.prompt, selectedModel);
    }

    const messages = [
      ...(chatDto.systemPrompt ? [{ role: 'system', content: chatDto.systemPrompt }] : []),
      { role: 'user', content: chatDto.prompt },
    ];

    let response: Response;
    try {
      response = await this.fetchWithTimeout('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          stream: false,
          messages,
        }),
      });
    } catch (error) {
      const reason = this.getErrorReason(error);
      this.logger.error(`Ollama connectivity error (${this.baseUrl}): ${reason}`);

      if (this.mockFallbackOnError) {
        return this.buildMockChatResponse(
          chatDto.prompt,
          selectedModel,
          `Ollama unreachable (${reason}). Returned mock response instead.`,
        );
      }

      throw new ServiceUnavailableException({
        message: `Ollama is unreachable at ${this.baseUrl}. ${reason}`,
        suggestion:
          'Start Ollama (ollama serve) or set OLLAMA_BASE_URL to a reachable host:port.',
      });
    }

    if (!response.ok) {
      const rawBody = await this.safeReadBody(response);
      const modelHint =
        response.status === 404
          ? ` The model "${selectedModel}" may be missing. Try: ollama pull ${selectedModel}`
          : '';

      if (this.mockFallbackOnError) {
        return this.buildMockChatResponse(
          chatDto.prompt,
          selectedModel,
          `Ollama HTTP ${response.status}. Returned mock response instead.`,
        );
      }

      throw new BadGatewayException({
        message: `Ollama request failed with HTTP ${response.status}.${modelHint}`,
        ollamaError: rawBody || 'No response body',
      });
    }

    const body = (await response.json()) as OllamaChatResponse;
    const reply = body.message?.content;

    if (!reply) {
      throw new BadGatewayException({
        message: 'Ollama response was missing message content.',
        ollamaResponse: body,
      });
    }

    return {
      model: body.model || selectedModel,
      reply,
      createdAt: body.created_at,
      done: body.done,
      totalDuration: body.total_duration,
    };
  }

  private buildMockChatResponse(prompt: string, model: string, note?: string) {
    return {
      model: `mock:${model}`,
      reply: this.generateMockReply(prompt),
      done: true,
      mock: true,
      note,
    };
  }

  private generateMockReply(prompt: string): string {
    const normalized = prompt.trim();
    if (!normalized) {
      return 'Tell me what you need help with, and I will suggest a simple next step.';
    }

    const shortPrompt = normalized.length > 220 ? `${normalized.slice(0, 220)}...` : normalized;
    return [
      'Mock mode reply (Ollama fallback):',
      `I received: "${shortPrompt}"`,
      'Quick financial guidance:',
      '1) List your fixed bills due in the next 7 days.',
      '2) Prioritize essentials first (housing, utilities, debt minimums).',
      '3) Set reminders for 7, 3, and 1 day before each due date.',
    ].join('\n');
  }

  private async fetchWithTimeout(path: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = Number.isFinite(this.timeoutMs) && this.timeoutMs > 0 ? this.timeoutMs : 30000;
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      return await fetch(`${this.baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private async safeReadBody(response: Response): Promise<string> {
    try {
      return await response.text();
    } catch {
      return '';
    }
  }

  private getErrorReason(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }
}

