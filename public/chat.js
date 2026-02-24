(function () {
  const STORAGE_KEY = 'chat.conversations.v2';
  const MODEL_STORAGE_KEY = 'chat.model';
  const MAX_CONVERSATIONS = 30;
  const DEFAULT_SYSTEM_PROMPT =
    'You are a practical financial assistant. Be clear, concise, and suggest actionable next steps.';
  const WELCOME_MESSAGE =
    'Hi! I can help with budgeting, bill planning, and due-date reminders.\nWhat would you like to work on today?';

  const state = {
    conversations: [],
    currentConversationId: '',
    pending: false,
  };

  const elements = {
    messages: document.getElementById('messages'),
    form: document.getElementById('composerForm'),
    prompt: document.getElementById('promptInput'),
    send: document.getElementById('sendBtn'),
    model: document.getElementById('modelInput'),
    healthDot: document.getElementById('healthDot'),
    healthText: document.getElementById('healthText'),
    historyList: document.getElementById('historyList'),
    newChatBtn: document.getElementById('newChatBtn'),
    messageTemplate: document.getElementById('messageTemplate'),
    chatTitle: document.getElementById('chatTitle'),
  };

  init();

  function init() {
    elements.model.value = (window.localStorage.getItem(MODEL_STORAGE_KEY) || '').trim();

    bindEvents();
    hydrateConversations();
    renderConversationList();
    renderCurrentConversation();

    refreshHealth();
    setInterval(refreshHealth, 30_000);
    elements.prompt.focus();
  }

  function bindEvents() {
    elements.model.addEventListener('blur', () => {
      window.localStorage.setItem(MODEL_STORAGE_KEY, elements.model.value.trim());
    });

    elements.newChatBtn.addEventListener('click', () => {
      if (state.pending) return;
      createConversation(true);
      renderConversationList();
      renderCurrentConversation();
    });

    elements.historyList.addEventListener('click', (event) => {
      const button = event.target.closest('[data-conversation-id]');
      if (!button || state.pending) return;
      switchConversation(button.getAttribute('data-conversation-id'));
    });

    elements.messages.addEventListener('click', async (event) => {
      const button = event.target.closest('.copy-code-btn');
      if (!button) return;
      await copyCode(button);
    });

    elements.form.addEventListener('submit', handleSubmitPrompt);

    elements.prompt.addEventListener('input', autoResizeTextarea);
    elements.prompt.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        elements.form.requestSubmit();
      }
    });
  }

  function hydrateConversations() {
    const parsed = loadConversations();
    state.conversations = parsed;

    if (state.conversations.length === 0) {
      createConversation(true);
      return;
    }

    state.currentConversationId =
      state.conversations[0]?.id ||
      createConversation(true).id;
  }

  function createConversation(includeWelcome) {
    const now = Date.now();
    const conversation = {
      id: `conv-${now}-${Math.random().toString(16).slice(2, 9)}`,
      title: 'New chat',
      updatedAt: now,
      messages: includeWelcome
        ? [
            {
              role: 'assistant',
              text: WELCOME_MESSAGE,
              createdAt: now,
            },
          ]
        : [],
    };

    state.conversations.unshift(conversation);
    state.conversations = state.conversations.slice(0, MAX_CONVERSATIONS);
    state.currentConversationId = conversation.id;
    saveConversations();
    return conversation;
  }

  function switchConversation(conversationId) {
    if (!conversationId) return;
    const exists = state.conversations.some((conversation) => conversation.id === conversationId);
    if (!exists) return;
    state.currentConversationId = conversationId;
    renderConversationList();
    renderCurrentConversation();
  }

  async function handleSubmitPrompt(event) {
    event.preventDefault();
    if (state.pending) return;

    const prompt = elements.prompt.value.trim();
    if (!prompt) return;

    const conversation = getCurrentConversation();
    if (!conversation) return;

    appendMessageToConversation(conversation, 'user', prompt);
    touchConversation(conversation, prompt);
    saveConversations();
    renderConversationList();
    renderCurrentConversation();

    elements.prompt.value = '';
    autoResizeTextarea();

    const typingId = addTypingMessage();
    state.pending = true;
    setComposerDisabled(true);

    try {
      const payload = {
        prompt,
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
      };

      const model = elements.model.value.trim();
      if (model) {
        payload.model = model;
      }

      const response = await fetch('/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.message || `Request failed (${response.status})`);
      }

      removeTypingMessage(typingId);

      const assistantText = body.note
        ? `${body.reply || ''}\n\n> ${body.note}`
        : body.reply || 'No response content was returned.';

      appendMessageToConversation(conversation, 'assistant', assistantText);
      touchConversation(conversation);
      saveConversations();
      renderConversationList();
      renderCurrentConversation();
    } catch (error) {
      removeTypingMessage(typingId);
      const message = error instanceof Error ? error.message : 'Unexpected error';
      appendMessageToConversation(conversation, 'assistant', `I could not complete the request.\n${message}`);
      touchConversation(conversation);
      saveConversations();
      renderConversationList();
      renderCurrentConversation();
    } finally {
      state.pending = false;
      setComposerDisabled(false);
      elements.prompt.focus();
    }
  }

  function appendMessageToConversation(conversation, role, text) {
    conversation.messages.push({
      role,
      text,
      createdAt: Date.now(),
    });
  }

  function touchConversation(conversation, userPromptForTitle) {
    conversation.updatedAt = Date.now();
    if (
      userPromptForTitle &&
      (!conversation.title || conversation.title === 'New chat')
    ) {
      conversation.title = buildConversationTitle(userPromptForTitle);
    }
  }

  function buildConversationTitle(prompt) {
    const firstLine = prompt.split('\n')[0].trim();
    const compact = firstLine.replace(/\s+/g, ' ');
    if (!compact) return 'New chat';
    return compact.length > 44 ? `${compact.slice(0, 44)}…` : compact;
  }

  function getCurrentConversation() {
    return state.conversations.find((conversation) => conversation.id === state.currentConversationId) || null;
  }

  function renderConversationList() {
    const sorted = [...state.conversations].sort((a, b) => b.updatedAt - a.updatedAt);
    elements.historyList.innerHTML = '';

    for (const conversation of sorted) {
      const li = document.createElement('li');
      li.className = 'history-item';

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'history-item-button';
      button.setAttribute('data-conversation-id', conversation.id);
      if (conversation.id === state.currentConversationId) {
        button.classList.add('active');
      }

      const title = document.createElement('span');
      title.className = 'history-item-title';
      title.textContent = conversation.title || 'New chat';

      const time = document.createElement('span');
      time.className = 'history-item-time';
      time.textContent = formatRelativeTime(conversation.updatedAt);

      button.appendChild(title);
      button.appendChild(time);
      li.appendChild(button);
      elements.historyList.appendChild(li);
    }
  }

  function renderCurrentConversation() {
    const conversation = getCurrentConversation();
    if (!conversation) return;

    elements.chatTitle.textContent = conversation.title || 'New chat';
    elements.messages.innerHTML = '';

    for (const message of conversation.messages) {
      addMessageRow(message.role, message.text);
    }

    scrollToBottom();
  }

  function setComposerDisabled(disabled) {
    elements.send.disabled = disabled;
    elements.prompt.disabled = disabled;
    elements.model.disabled = disabled;
  }

  function autoResizeTextarea() {
    elements.prompt.style.height = 'auto';
    elements.prompt.style.height = `${Math.min(elements.prompt.scrollHeight, 180)}px`;
  }

  function addMessageRow(role, text) {
    const fragment = elements.messageTemplate.content.cloneNode(true);
    const row = fragment.querySelector('.message-row');
    const avatar = fragment.querySelector('.avatar');
    const bubble = fragment.querySelector('.bubble');

    row.classList.add(role);
    avatar.textContent = role === 'user' ? 'You' : 'AI';

    if (role === 'assistant') {
      bubble.classList.add('markdown');
      bubble.innerHTML = renderMarkdown(text || '');
    } else {
      bubble.textContent = text || '';
    }

    elements.messages.appendChild(fragment);
  }

  function addTypingMessage() {
    const id = `typing-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const fragment = elements.messageTemplate.content.cloneNode(true);
    const row = fragment.querySelector('.message-row');
    const avatar = fragment.querySelector('.avatar');
    const bubble = fragment.querySelector('.bubble');

    row.classList.add('assistant', 'typing');
    row.dataset.typingId = id;
    avatar.textContent = 'AI';
    bubble.textContent = 'Thinking...';

    elements.messages.appendChild(fragment);
    scrollToBottom();
    return id;
  }

  function removeTypingMessage(typingId) {
    const node = elements.messages.querySelector(`[data-typing-id="${typingId}"]`);
    if (node) node.remove();
  }

  function renderMarkdown(inputText) {
    const text = String(inputText || '').replace(/\r\n?/g, '\n');
    if (!text.trim()) return '<p></p>';

    const codeFenceRegex = /```([a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;
    let html = '';

    while ((match = codeFenceRegex.exec(text)) !== null) {
      const before = text.slice(lastIndex, match.index);
      html += renderTextBlocks(before);

      const language = (match[1] || 'code').trim();
      const code = match[2] || '';
      html += renderCodeBlock(language, code.replace(/\n$/, ''));
      lastIndex = codeFenceRegex.lastIndex;
    }

    html += renderTextBlocks(text.slice(lastIndex));
    return html.trim() || '<p></p>';
  }

  function renderTextBlocks(text) {
    if (!text) return '';

    const lines = text.split('\n');
    let html = '';
    let openList = '';

    const closeList = () => {
      if (!openList) return;
      html += openList === 'ul' ? '</ul>' : '</ol>';
      openList = '';
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (!line) {
        closeList();
        continue;
      }

      const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
      if (headingMatch) {
        closeList();
        const level = headingMatch[1].length;
        html += `<h${level}>${parseInline(headingMatch[2])}</h${level}>`;
        continue;
      }

      const quoteMatch = line.match(/^>\s?(.*)$/);
      if (quoteMatch) {
        closeList();
        html += `<blockquote>${parseInline(quoteMatch[1])}</blockquote>`;
        continue;
      }

      const unorderedMatch = line.match(/^[-*]\s+(.+)$/);
      if (unorderedMatch) {
        if (openList !== 'ul') {
          closeList();
          openList = 'ul';
          html += '<ul>';
        }
        html += `<li>${parseInline(unorderedMatch[1])}</li>`;
        continue;
      }

      const orderedMatch = line.match(/^\d+\.\s+(.+)$/);
      if (orderedMatch) {
        if (openList !== 'ol') {
          closeList();
          openList = 'ol';
          html += '<ol>';
        }
        html += `<li>${parseInline(orderedMatch[1])}</li>`;
        continue;
      }

      closeList();
      html += `<p>${parseInline(line)}</p>`;
    }

    closeList();
    return html;
  }

  function parseInline(rawText) {
    const inlineCodeTokens = [];
    let textWithTokens = rawText.replace(/`([^`\n]+)`/g, (_, code) => {
      const token = `@@INLINE_CODE_${inlineCodeTokens.length}@@`;
      inlineCodeTokens.push(`<code class="inline-code">${escapeHtml(code)}</code>`);
      return token;
    });

    textWithTokens = escapeHtml(textWithTokens);

    textWithTokens = textWithTokens.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      (_, label, url) =>
        `<a href="${escapeAttribute(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`,
    );

    textWithTokens = textWithTokens.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    textWithTokens = textWithTokens.replace(/(^|[\s(])\*(.+?)\*(?=[\s).,!?:;]|$)/g, '$1<em>$2</em>');

    for (let i = 0; i < inlineCodeTokens.length; i += 1) {
      textWithTokens = textWithTokens.replace(`@@INLINE_CODE_${i}@@`, inlineCodeTokens[i]);
    }

    return textWithTokens;
  }

  function renderCodeBlock(language, code) {
    return [
      '<div class="code-block">',
      '  <div class="code-header">',
      `    <span>${escapeHtml(language || 'code')}</span>`,
      `    <button type="button" class="copy-code-btn" data-code="${encodeURIComponent(code)}">Copy</button>`,
      '  </div>',
      `  <pre class="code-content"><code>${escapeHtml(code)}</code></pre>`,
      '</div>',
    ].join('');
  }

  async function copyCode(button) {
    const encoded = button.getAttribute('data-code');
    if (!encoded) return;

    let decoded = '';
    try {
      decoded = decodeURIComponent(encoded);
    } catch {
      decoded = '';
    }
    if (!decoded) return;

    const original = button.textContent || 'Copy';

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(decoded);
      } else {
        fallbackCopy(decoded);
      }
      button.textContent = 'Copied';
      window.setTimeout(() => {
        button.textContent = original;
      }, 1200);
    } catch {
      fallbackCopy(decoded);
      button.textContent = 'Copied';
      window.setTimeout(() => {
        button.textContent = original;
      }, 1200);
    }
  }

  function fallbackCopy(text) {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', 'readonly');
    area.style.position = 'absolute';
    area.style.left = '-9999px';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    document.body.removeChild(area);
  }

  function formatRelativeTime(timestamp) {
    const diffMs = Date.now() - Number(timestamp || 0);
    const seconds = Math.floor(diffMs / 1000);
    if (seconds < 60) return 'Just now';

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;

    return new Date(Number(timestamp || 0)).toLocaleDateString();
  }

  function scrollToBottom() {
    elements.messages.scrollTop = elements.messages.scrollHeight;
  }

  function loadConversations() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      const normalized = parsed
        .map((item) => normalizeConversation(item))
        .filter((item) => item !== null);

      return normalized.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch {
      return [];
    }
  }

  function normalizeConversation(input) {
    if (!input || typeof input !== 'object') return null;
    if (typeof input.id !== 'string' || !input.id) return null;

    const messages = Array.isArray(input.messages)
      ? input.messages
          .map((message) => normalizeMessage(message))
          .filter((message) => message !== null)
      : [];

    if (messages.length === 0) {
      messages.push({
        role: 'assistant',
        text: WELCOME_MESSAGE,
        createdAt: Date.now(),
      });
    }

    return {
      id: input.id,
      title: typeof input.title === 'string' && input.title.trim() ? input.title.trim() : 'New chat',
      updatedAt: Number(input.updatedAt) || Date.now(),
      messages,
    };
  }

  function normalizeMessage(input) {
    if (!input || typeof input !== 'object') return null;
    if (input.role !== 'assistant' && input.role !== 'user') return null;
    if (typeof input.text !== 'string') return null;

    return {
      role: input.role,
      text: input.text,
      createdAt: Number(input.createdAt) || Date.now(),
    };
  }

  function saveConversations() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.conversations));
  }

  async function refreshHealth() {
    try {
      const response = await fetch('/ai/health', { method: 'GET' });
      const body = await response.json().catch(() => ({}));
      const ok = response.ok && body.status === 'ok';

      elements.healthDot.classList.remove('ok', 'error');
      elements.healthDot.classList.add(ok ? 'ok' : 'error');

      if (body.mode === 'mock') {
        elements.healthText.textContent = 'Mock mode active';
      } else if (ok) {
        elements.healthText.textContent = 'Ollama connected';
      } else {
        elements.healthText.textContent = 'AI unavailable';
      }
    } catch {
      elements.healthDot.classList.remove('ok');
      elements.healthDot.classList.add('error');
      elements.healthText.textContent = 'AI unavailable';
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }
})();

