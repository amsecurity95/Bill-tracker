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

  async health() {
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

