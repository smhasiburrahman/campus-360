/**
 * Campus 360 - AI CampusBot Floating Widget
 * Token-optimized, multi-turn, free-tier resilient assistant.
 */
(function () {
    const STORAGE_KEY = 'campus360_chat_history';
    const MAX_SAVED_TURNS = 3; // 3 turns (6 messages max) to save tokens
    const API_ENDPOINT = (typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://localhost:8080/api/v1') + '/chat/message';

    let isOpen = false;
    let isWaitingForAi = false;
    let rateLimitTimer = null;

    // Zero-token instant shortcuts (matches exact chip clicks or simple navigations)
    const LOCAL_SHORTCUTS = {
        '🚌 shuttles': {
            reply: 'You can view live bus routes, stops, and real-time GPS locations on the **Shuttle Tracking** page.',
            actions: [{ label: 'Open Shuttle Map', url: 'shuttle.html', icon: 'fa-bus' }]
        },
        '📚 course planner': {
            reply: 'Plan your trimesters, check prerequisites, and generate AI-recommended schedules in the **Course Planner**.',
            actions: [{ label: 'Course Planner', url: 'course-planner.html', icon: 'fa-wand-magic-sparkles' }]
        },
        '📢 events': {
            reply: 'Check out official club activities, seminars, and university fests on the **Events** board.',
            actions: [{ label: 'View Events', url: 'events.html', icon: 'fa-calendar' }]
        },
        '📝 complaints': {
            reply: 'Submit campus issues, track authority resolution progress, and upvote student grievances at **Complaints**.',
            actions: [{ label: 'File Complaint', url: 'complaints.html', icon: 'fa-flag' }]
        },
        '🔍 lost & found': {
            reply: 'Report lost IDs, keys, or wallets, or browse found items on the **Lost & Found** portal.',
            actions: [{ label: 'Lost & Found', url: 'lost-found.html', icon: 'fa-magnifying-glass' }]
        }
    };

    function initWidget() {
        if (document.getElementById('campusbot-fab')) return;

        // Create Widget DOM
        const widgetContainer = document.createElement('div');
        widgetContainer.id = 'campusbot-root';
        widgetContainer.innerHTML = `
            <!-- Floating Action Button -->
            <button id="campusbot-fab" class="campusbot-fab" title="Chat with CampusBot AI" aria-label="Open AI Assistant">
                <i class="fa-solid fa-wand-magic-sparkles"></i>
                <span class="fab-badge">AI</span>
            </button>

            <!-- Chat Window -->
            <div id="campusbot-window" class="campusbot-window" role="dialog" aria-hidden="true">
                <!-- Header -->
                <div class="campusbot-header">
                    <div class="campusbot-header-left">
                        <div class="campusbot-avatar">
                            <i class="fa-solid fa-robot"></i>
                            <span class="status-dot"></span>
                        </div>
                        <div>
                            <div class="campusbot-title">CampusBot AI</div>
                            <div class="campusbot-subtitle">
                                <span class="status-dot-inline" style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#10b981;margin-right:4px;"></span>
                                <span>Always here to help</span>
                            </div>
                        </div>
                    </div>
                    <div class="campusbot-header-actions">
                        <a href="chatbot.html" class="campusbot-header-btn" title="Full Page Chat" aria-label="Expand to full page">
                            <i class="fa-solid fa-up-right-and-down-left-from-center"></i>
                        </a>
                        <button id="campusbot-clear-btn" class="campusbot-header-btn" title="Clear Chat History">
                            <i class="fa-solid fa-rotate-right"></i>
                        </button>
                        <button id="campusbot-close-btn" class="campusbot-header-btn" title="Minimize Chat">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                </div>

                <!-- Quick Starter Chips -->
                <div class="campusbot-quick-chips">
                    <button class="campusbot-chip" data-query="🚌 Shuttles"><i class="fa-solid fa-bus"></i> Shuttles</button>
                    <button class="campusbot-chip" data-query="📚 Course Planner"><i class="fa-solid fa-wand-magic-sparkles"></i> Courses</button>
                    <button class="campusbot-chip" data-query="📢 Events"><i class="fa-solid fa-calendar"></i> Events</button>
                    <button class="campusbot-chip" data-query="📝 Complaints"><i class="fa-solid fa-flag"></i> Complaints</button>
                    <button class="campusbot-chip" data-query="🔍 Lost & Found"><i class="fa-solid fa-magnifying-glass"></i> Lost & Found</button>
                </div>

                <!-- Rate Limit Banner (hidden by default) -->
                <div id="campusbot-banner" class="campusbot-banner" style="display: none;">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <span>Rate limit reached. Retry in <span id="campusbot-countdown" class="countdown-num">30</span>s.</span>
                </div>

                <!-- Message Stream -->
                <div id="campusbot-messages" class="campusbot-messages"></div>

                <!-- Input Bar -->
                <div class="campusbot-input-bar">
                    <textarea id="campusbot-input" class="campusbot-textarea" placeholder="Ask about routes, courses, events..." rows="1"></textarea>
                    <button id="campusbot-send-btn" class="campusbot-send-btn" title="Send Message">
                        <i class="fa-solid fa-paper-plane"></i>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(widgetContainer);

        attachEventListeners();
        renderStoredMessages();
    }

    function attachEventListeners() {
        const fab = document.getElementById('campusbot-fab');
        const closeBtn = document.getElementById('campusbot-close-btn');
        const clearBtn = document.getElementById('campusbot-clear-btn');
        const sendBtn = document.getElementById('campusbot-send-btn');
        const input = document.getElementById('campusbot-input');
        const chipsContainer = document.querySelector('.campusbot-quick-chips');

        fab.addEventListener('click', toggleChat);
        closeBtn.addEventListener('click', closeChat);
        clearBtn.addEventListener('click', clearHistory);

        sendBtn.addEventListener('click', () => handleSend());

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            }
        });

        // Auto resize textarea
        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 90) + 'px';
        });

        // Chips click
        chipsContainer.addEventListener('click', (e) => {
            const chip = e.target.closest('.campusbot-chip');
            if (!chip) return;
            const query = chip.getAttribute('data-query');
            handleSend(query);
        });
    }

    function toggleChat() {
        isOpen = !isOpen;
        const win = document.getElementById('campusbot-window');
        if (isOpen) {
            win.classList.add('open');
            win.setAttribute('aria-hidden', 'false');
            setTimeout(() => document.getElementById('campusbot-input').focus(), 150);
            scrollToBottom();
        } else {
            win.classList.remove('open');
            win.setAttribute('aria-hidden', 'true');
        }
    }

    function closeChat() {
        isOpen = false;
        const win = document.getElementById('campusbot-window');
        win.classList.remove('open');
        win.setAttribute('aria-hidden', 'true');
    }

    function getHistory() {
        try {
            const raw = sessionStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function saveHistory(history) {
        try {
            // Keep at most MAX_SAVED_TURNS * 2 entries
            const trimmed = history.slice(-MAX_SAVED_TURNS * 2);
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
        } catch (e) {}
    }

    function clearHistory() {
        sessionStorage.removeItem(STORAGE_KEY);
        const container = document.getElementById('campusbot-messages');
        container.innerHTML = '';
        appendWelcomeMessage();
    }

    function renderStoredMessages() {
        const container = document.getElementById('campusbot-messages');
        container.innerHTML = '';
        const history = getHistory();
        if (history.length === 0) {
            appendWelcomeMessage();
        } else {
            history.forEach(item => {
                appendMessageBubble(item.role === 'user' ? 'user' : 'bot', item.text, item.actions || []);
            });
            scrollToBottom();
        }
    }

    function appendWelcomeMessage() {
        const welcomeText = "Hello! 👋 I'm **CampusBot**, your Campus 360 AI assistant. Ask me about shuttles, course planning, events, or university complaints!";
        appendMessageBubble('bot', welcomeText, [
            { label: '🚌 Track Shuttles', url: 'shuttle.html' },
            { label: '📚 Course Planner', url: 'course-planner.html' }
        ]);
    }

    function appendMessageBubble(type, text, actions = []) {
        const container = document.getElementById('campusbot-messages');
        const msgDiv = document.createElement('div');
        msgDiv.className = `campusbot-message ${type}`;

        const avatarHtml = type === 'bot' 
            ? `<div class="campusbot-msg-avatar"><i class="fa-solid fa-robot"></i></div>` 
            : '';

        let actionsHtml = '';
        if (actions && actions.length > 0) {
            actionsHtml = `<div class="campusbot-actions-row">` +
                actions.map(act => `
                    <a href="${act.url}" class="campusbot-action-btn">
                        ${act.icon ? `<i class="fa-solid ${act.icon}"></i>` : '<i class="fa-solid fa-arrow-up-right-from-square"></i>'}
                        ${act.label}
                    </a>
                `).join('') +
                `</div>`;
        }

        msgDiv.innerHTML = `
            ${avatarHtml}
            <div class="campusbot-bubble">
                <div>${formatMarkdown(text)}</div>
                ${actionsHtml}
            </div>
        `;

        container.appendChild(msgDiv);
        scrollToBottom();
    }

    function showTypingIndicator() {
        const container = document.getElementById('campusbot-messages');
        const typingDiv = document.createElement('div');
        typingDiv.id = 'campusbot-typing-indicator';
        typingDiv.className = 'campusbot-message bot';
        typingDiv.innerHTML = `
            <div class="campusbot-msg-avatar"><i class="fa-solid fa-robot"></i></div>
            <div class="campusbot-typing">
                <div class="campusbot-dot"></div>
                <div class="campusbot-dot"></div>
                <div class="campusbot-dot"></div>
            </div>
        `;
        container.appendChild(typingDiv);
        scrollToBottom();
    }

    function removeTypingIndicator() {
        const el = document.getElementById('campusbot-typing-indicator');
        if (el) el.remove();
    }

    function scrollToBottom() {
        const container = document.getElementById('campusbot-messages');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }

    async function handleSend(forcedQuery) {
        if (isWaitingForAi) return;

        const input = document.getElementById('campusbot-input');
        const message = (forcedQuery || input.value || '').trim();
        if (!message) return;

        if (!forcedQuery) {
            input.value = '';
            input.style.height = 'auto';
        }

        // 1. Render User Message
        appendMessageBubble('user', message);

        // Save to session history
        const history = getHistory();
        history.push({ role: 'user', text: message });
        saveHistory(history);

        // 2. Check Zero-Token Local FAQ Shortcuts
        const lower = message.toLowerCase();
        if (LOCAL_SHORTCUTS[lower]) {
            const local = LOCAL_SHORTCUTS[lower];
            setTimeout(() => {
                appendMessageBubble('bot', local.reply, local.actions);
                history.push({ role: 'model', text: local.reply, actions: local.actions });
                saveHistory(history);
            }, 100);
            return;
        }

        // 3. Call Backend API
        isWaitingForAi = true;
        setFormDisabled(true);
        showTypingIndicator();

        // Pass only previous turns as history (excluding the one just typed)
        const previousHistory = history.slice(0, -1).map(h => ({
            role: h.role === 'user' ? 'user' : 'model',
            text: h.text
        }));

        const headers = { 'Content-Type': 'application/json' };
        const token = localStorage.getItem('token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const resp = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    message: message,
                    history: previousHistory
                })
            });

            removeTypingIndicator();

            if (!resp.ok) {
                if (resp.status === 429) {
                    handleRateLimit(30);
                    return;
                }
                throw new Error(`Server returned ${resp.status}`);
            }

            const data = await resp.json();

            if (data.rateLimited) {
                handleRateLimit(data.retryAfterSeconds || 30);
            }

            appendMessageBubble('bot', data.reply, data.suggestedActions || []);

            // Save bot reply
            history.push({ role: 'model', text: data.reply, actions: data.suggestedActions });
            saveHistory(history);

        } catch (err) {
            console.error('CampusBot error:', err);
            removeTypingIndicator();
            appendMessageBubble('bot', "I couldn't reach the AI server right now. You can still navigate using the quick links below:", [
                { label: 'Shuttle Tracking', url: 'shuttle.html', icon: 'fa-bus' },
                { label: 'Course Planner', url: 'course-planner.html', icon: 'fa-wand-magic-sparkles' }
            ]);
        } finally {
            isWaitingForAi = false;
            setFormDisabled(false);
            scrollToBottom();
        }
    }

    function setFormDisabled(disabled) {
        const input = document.getElementById('campusbot-input');
        const btn = document.getElementById('campusbot-send-btn');
        if (input) input.disabled = disabled;
        if (btn) btn.disabled = disabled;
    }

    function handleRateLimit(seconds) {
        const banner = document.getElementById('campusbot-banner');
        const countdownEl = document.getElementById('campusbot-countdown');
        if (!banner || !countdownEl) return;

        banner.style.display = 'flex';
        let remaining = seconds;
        countdownEl.innerText = remaining;
        setFormDisabled(true);

        if (rateLimitTimer) clearInterval(rateLimitTimer);

        rateLimitTimer = setInterval(() => {
            remaining--;
            if (remaining <= 0) {
                clearInterval(rateLimitTimer);
                banner.style.display = 'none';
                setFormDisabled(false);
            } else {
                countdownEl.innerText = remaining;
            }
        }, 1000);
    }

    // Lightweight Markdown formatter
    function formatMarkdown(text) {
        if (!text) return '';
        let escaped = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // Code blocks: `code`
        escaped = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Bold: **text**
        escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

        // Italic: *text*
        escaped = escaped.replace(/\*([^*]+)\*/g, '<em>$1</em>');

        // Links: [label](url)
        escaped = escaped.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

        // Line breaks, headings, dividers & bullet points
        const lines = escaped.split('\n');
        let inList = false;
        let formattedLines = [];

        for (let line of lines) {
            line = line.trim();
            if (line === '---' || line === '***') {
                if (inList) { formattedLines.push('</ul>'); inList = false; }
                formattedLines.push('<hr>');
            } else if (line.startsWith('### ')) {
                if (inList) { formattedLines.push('</ul>'); inList = false; }
                formattedLines.push(`<h4>${line.substring(4)}</h4>`);
            } else if (line.startsWith('## ') || line.startsWith('# ')) {
                if (inList) { formattedLines.push('</ul>'); inList = false; }
                formattedLines.push(`<h3>${line.replace(/^#+\s*/, '')}</h3>`);
            } else if (line.startsWith('- ') || line.startsWith('* ')) {
                if (!inList) {
                    formattedLines.push('<ul>');
                    inList = true;
                }
                formattedLines.push(`<li>${line.substring(2)}</li>`);
            } else {
                if (inList) {
                    formattedLines.push('</ul>');
                    inList = false;
                }
                if (line) {
                    formattedLines.push(`<p>${line}</p>`);
                }
            }
        }
        if (inList) formattedLines.push('</ul>');

        return formattedLines.join('');
    }

    // Auto-init on DOMContentLoaded or immediate if already loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWidget);
    } else {
        initWidget();
    }
})();
