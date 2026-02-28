# Self-Hosted LLM Chat

A minimal chat interface for running LLMs locally with [Ollama](https://ollama.ai). **Your data never leaves your machine.**

Inspired by the [XDA-Developers article](https://www.xda-developers.com/i-stick-to-my-self-hosted-llms-instead-of-chatgpt/) on self-hosted LLMs vs ChatGPT.

## Quick Start

### Option 1: Run locally (recommended for GPU)

1. **Install Ollama** – [ollama.ai](https://ollama.ai)

2. **Start Ollama and pull a model:**
   ```bash
   ollama serve          # Usually runs automatically
   ollama pull llama3.2  # Or: mistral, deepseek, qwen2, etc.
   ```

3. **Run the chat server:**
   ```bash
   cd llm-chat
   npm install
   npm start
   ```

4. Open **http://localhost:3001**

### Option 2: Docker (CPU-only by default)

```bash
cd llm-chat
docker compose up -d
```

Then pull a model:
```bash
docker exec -it ollama ollama pull llama3.2
```

Open **http://localhost:3001**

## Why Self-Host?

| | ChatGPT Plus | Self-Hosted |
|---|---|---|
| **Cost** | ~$240/year | One-time hardware |
| **Privacy** | Data on OpenAI servers | Everything stays local |
| **Offline** | No | Yes |
| **Rate limits** | Yes | No |
| **Model choice** | Limited | 100+ open models |

## Hardware

- **Small models** (1–3B): Raspberry Pi, older laptops
- **Medium models** (7–8B): GTX 1070, 12GB VRAM
- **Larger models**: RTX 3060 12GB+, Apple Silicon

## Environment Variables

- `PORT` – Server port (default: 3001)
- `OLLAMA_URL` – Ollama API URL (default: http://localhost:11434)

## License

MIT
