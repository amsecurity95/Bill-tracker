#!/usr/bin/env node
/**
 * Self-Hosted LLM Chat Server
 * Proxies requests to Ollama - all data stays on your machine
 */

import express from 'express';
import cors from 'cors';
import { Readable } from 'stream';

const app = express();
const PORT = process.env.PORT || 3001;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Proxy chat (streaming, with conversation history) to Ollama
app.post('/api/chat', async (req, res) => {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    res.setHeader('Content-Type', 'application/json');
    Readable.fromWeb(response.body).pipe(res);
  } catch (err) {
    console.error('Ollama error:', err.message);
    res.status(503).json({
      error: 'Cannot connect to Ollama',
      hint: 'Run "ollama serve" and "ollama pull llama3.2" to get started',
    });
  }
});

// Proxy generate (streaming, single prompt) to Ollama
app.post('/api/generate', async (req, res) => {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    res.setHeader('Content-Type', 'application/json');
    Readable.fromWeb(response.body).pipe(res);
  } catch (err) {
    console.error('Ollama error:', err.message);
    res.status(503).json({
      error: 'Cannot connect to Ollama',
      hint: 'Run "ollama serve" to start your local LLM',
    });
  }
});

// Health check - verify Ollama is reachable
app.get('/api/health', async (req, res) => {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`);
    const data = await response.json();
    res.json({
      status: 'ok',
      ollama: 'connected',
      models: data.models?.map(m => m.name) || [],
    });
  } catch (err) {
    res.status(503).json({
      status: 'error',
      ollama: 'disconnected',
      message: 'Run "ollama serve" to start your local LLM',
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  🤖 Self-Hosted LLM Chat
  ───────────────────────
  Server:  http://localhost:${PORT}
  Ollama:  ${OLLAMA_URL}
  
  Open the URL above to start chatting.
  Your data never leaves your machine.
  `);
});
