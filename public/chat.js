(function () {
  const state = {
    history: [],
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
  };

  const defaultModel = (window.localStorage.getItem('chat.model') || '').trim();
  elements.model.value = defaultModel;

  elements.model.addEventListener('blur', () => {
    window.localStorage.setItem('chat.model', elements.model.value.trim());
  });

  elements.newChatBtn.addEventListener('click', () => {
    resetConversation();
  });

  elements.form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (state.pending) return;

    const prompt = elements.prompt.value.trim();
    if (!prompt) return;

    pushHistory(prompt);
    addMessage('user', prompt);
    elements.prompt.value = '';
    autoResizeTextarea();

    const typingId = addTypingMessage();
    state.pending = true;
    setComposerDisabled(true);

    try {
      const payload = {
        prompt,
        systemPrompt:
          'You are a practical financial assistant. Be clear, concise, and suggest actionable next steps.',
      };

      const model = elements.model.value.trim();
      if (model) payload.model = model;

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
      addMessage('assistant', body.reply || 'No response content was returned.');
    } catch (error) {
      removeTypingMessage(typingId);
      const message = error instanceof Error ? error.message : 'Unexpected error';
      addMessage('assistant', `I could not complete the request.\n${message}`);
    } finally {
      state.pending = false;
      setComposerDisabled(false);
      elements.prompt.focus();
    }
  });

  elements.prompt.addEventListener('input', autoResizeTextarea);
  elements.prompt.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      elements.form.requestSubmit();
    }
  });

  init();

  async function init() {
    resetConversation();
    await refreshHealth();
    setInterval(refreshHealth, 30_000);
  }

  function resetConversation() {
    state.history = [];
    renderHistory();
    elements.messages.innerHTML = '';
    addMessage(
      'assistant',
      'Hi! I can help with budgeting, bill planning, and due-date reminders.\nWhat would you like to work on today?',
    );
    elements.prompt.focus();
  }

  function pushHistory(prompt) {
    state.history.unshift(prompt);
    state.history = state.history.slice(0, 12);
    renderHistory();
  }

  function renderHistory() {
    elements.historyList.innerHTML = '';
    for (const item of state.history) {
      const li = document.createElement('li');
      li.className = 'history-item';
      li.textContent = item;
      elements.historyList.appendChild(li);
    }
  }

  function setComposerDisabled(disabled) {
    elements.send.disabled = disabled;
    elements.prompt.disabled = disabled;
  }

  function autoResizeTextarea() {
    elements.prompt.style.height = 'auto';
    elements.prompt.style.height = `${Math.min(elements.prompt.scrollHeight, 180)}px`;
  }

  function addMessage(role, text) {
    const fragment = elements.messageTemplate.content.cloneNode(true);
    const row = fragment.querySelector('.message-row');
    const avatar = fragment.querySelector('.avatar');
    const bubble = fragment.querySelector('.bubble');

    row.classList.add(role);
    avatar.textContent = role === 'user' ? 'You' : 'AI';
    bubble.textContent = text;

    elements.messages.appendChild(fragment);
    scrollToBottom();
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

  function scrollToBottom() {
    elements.messages.scrollTop = elements.messages.scrollHeight;
  }

  async function refreshHealth() {
    try {
      const response = await fetch('/ai/health', { method: 'GET' });
      const body = await response.json();
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
})();

