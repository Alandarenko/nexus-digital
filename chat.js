(function () {
    'use strict';

    var LIMIT = 20;
    var isOpen = false;
    var sending = false;

    // --- Create DOM ---
    var toggle = document.createElement('button');
    toggle.className = 'chat-toggle';
    toggle.setAttribute('aria-label', 'Открыть чат');
    toggle.innerHTML =
        '<svg class="chat-icon-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
        '<svg class="chat-icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>';

    var panel = document.createElement('div');
    panel.className = 'chat-panel';
    panel.innerHTML =
        '<div class="chat-header">' +
            '<span class="chat-header-title">AI-консультант</span>' +
            '<div class="chat-header-actions">' +
                '<a href="https://t.me/myway_nikita" target="_blank" rel="noopener" class="chat-tg-link" title="Написать в Telegram">' +
                    '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>' +
                '</a>' +
                '<button class="chat-close" aria-label="Закрыть чат">&times;</button>' +
            '</div>' +
        '</div>' +
        '<div class="chat-messages" id="chatMessages"></div>' +
        '<div class="chat-limit" id="chatLimit">Осталось: ' + LIMIT + ' из ' + LIMIT + '</div>' +
        '<div class="chat-input-area">' +
            '<textarea class="chat-input" id="chatInput" placeholder="Напишите сообщение..." rows="1"></textarea>' +
            '<button class="chat-send" id="chatSend" aria-label="Отправить">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>' +
            '</button>' +
        '</div>';

    document.body.appendChild(toggle);
    document.body.appendChild(panel);

    var messagesEl = document.getElementById('chatMessages');
    var inputEl = document.getElementById('chatInput');
    var sendBtn = document.getElementById('chatSend');
    var limitEl = document.getElementById('chatLimit');
    var closeBtn = panel.querySelector('.chat-close');

    // --- Session state ---
    var history = [];
    var sentCount = 0;

    function loadSession() {
        try {
            var saved = sessionStorage.getItem('devorra_chat');
            if (saved) {
                var data = JSON.parse(saved);
                history = data.history || [];
                sentCount = data.sentCount || 0;
            }
        } catch (e) { /* ignore */ }
    }

    function saveSession() {
        try {
            sessionStorage.setItem('devorra_chat', JSON.stringify({ history: history, sentCount: sentCount }));
        } catch (e) { /* ignore */ }
    }

    function updateLimit(remaining) {
        if (typeof remaining === 'number') {
            limitEl.textContent = 'Осталось: ' + remaining + ' из ' + LIMIT;
            if (remaining <= 3) {
                limitEl.classList.add('chat-limit-warn');
            }
        }
    }

    // --- Messages ---
    function addMessage(role, text) {
        var div = document.createElement('div');
        div.className = 'chat-msg ' + (role === 'user' ? 'chat-msg-user' : 'chat-msg-bot');
        div.textContent = text;
        messagesEl.appendChild(div);
        messagesEl.scrollTop = messagesEl.scrollHeight;
        return div;
    }

    function showTyping() {
        var div = document.createElement('div');
        div.className = 'chat-msg chat-msg-bot chat-typing';
        div.innerHTML = '<span></span><span></span><span></span>';
        div.id = 'chatTyping';
        messagesEl.appendChild(div);
        messagesEl.scrollTop = messagesEl.scrollHeight;
        return div;
    }

    function removeTyping() {
        var el = document.getElementById('chatTyping');
        if (el) el.remove();
    }

    function renderHistory() {
        messagesEl.innerHTML = '';
        addMessage('bot', 'Привет! Я AI-консультант Devorra. Могу рассказать об услугах, ценах и сроках. Спрашивайте!');
        for (var i = 0; i < history.length; i++) {
            addMessage(history[i].role === 'user' ? 'user' : 'bot', history[i].text);
        }
    }

    // --- Send ---
    function send() {
        if (sending) return;
        var text = inputEl.value.trim();
        if (!text) return;

        if (sentCount >= LIMIT) {
            addMessage('bot', 'Лимит сообщений исчерпан. Напишите нам в Telegram (@myway_nikita) или оставьте заявку на сайте.');
            return;
        }

        inputEl.value = '';
        autoResize();
        addMessage('user', text);
        history.push({ role: 'user', text: text });
        sentCount++;
        saveSession();

        sending = true;
        sendBtn.disabled = true;
        showTyping();

        fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: text,
                history: history.slice(0, -1)
            })
        })
        .then(function (r) { return r.json(); })
        .then(function (data) {
            removeTyping();
            if (data.limited) {
                addMessage('bot', 'Лимит сообщений исчерпан. Напишите нам в Telegram (@myway_nikita) или оставьте заявку на сайте.');
                sentCount = LIMIT;
                saveSession();
                updateLimit(0);
                return;
            }
            if (!data.ok) {
                addMessage('bot', 'Произошла ошибка. Попробуйте позже или напишите в Telegram @myway_nikita.');
                return;
            }
            var reply = data.reply;
            addMessage('bot', reply);
            history.push({ role: 'assistant', text: reply });
            saveSession();
            if (typeof data.remaining === 'number') updateLimit(data.remaining);
        })
        .catch(function () {
            removeTyping();
            addMessage('bot', 'Ошибка сети. Проверьте подключение и попробуйте снова.');
        })
        .finally(function () {
            sending = false;
            sendBtn.disabled = false;
            inputEl.focus();
        });
    }

    // --- Auto-resize textarea ---
    function autoResize() {
        inputEl.style.height = 'auto';
        inputEl.style.height = Math.min(inputEl.scrollHeight, 100) + 'px';
    }

    // --- Toggle ---
    function openChat() {
        isOpen = true;
        panel.classList.add('chat-panel-open');
        toggle.classList.add('chat-toggle-active');
        toggle.setAttribute('aria-label', 'Закрыть чат');
        inputEl.focus();
    }

    function closeChat() {
        isOpen = false;
        panel.classList.remove('chat-panel-open');
        toggle.classList.remove('chat-toggle-active');
        toggle.setAttribute('aria-label', 'Открыть чат');
    }

    // --- Events ---
    toggle.addEventListener('click', function () {
        if (isOpen) closeChat(); else openChat();
    });

    closeBtn.addEventListener('click', closeChat);

    sendBtn.addEventListener('click', send);

    inputEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    });

    inputEl.addEventListener('input', autoResize);

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && isOpen) closeChat();
    });

    // --- Init ---
    loadSession();
    renderHistory();
    updateLimit(LIMIT - sentCount);
})();
