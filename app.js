// ============= LUNA PWA - Main Application =============
class LunaApp {
  constructor() {
    this.currentPage = 'home';
    this.alarmCheckInterval = null;
    this.reminderCheckInterval = null;
    this.calendarDate = new Date();
    this.activeAlarm = null;
    this.snoozeTimer = null;
  }

  async init() {
    try {
      // Init DB
      await lunaDB.init();
      console.log('✓ DB ready');

      // Init voice
      await voiceSystem.init();
      console.log('✓ Voice ready, mic permission:', voiceSystem.micPermission);

      // Load settings
      await this.loadSettings();
      console.log('✓ Settings loaded');

      // Load personality
      const personality = await lunaDB.getSetting('personality', 'smart');
      lunaAI.setPersonality(personality);
      this.setActivePersonality(personality);

      // Load user name
      const userName = await lunaDB.getSetting('userName', 'Saša');
      lunaAI.setUserName(userName);
      document.getElementById('user-name-display').textContent = userName;
      document.getElementById('setting-username').value = userName;

      // Load API key
      const apiKey = await lunaDB.getSetting('groqApiKey', '');
      if (apiKey) {
        document.getElementById('setting-groq-key').value = apiKey;
        lunaAI.setApiKey(apiKey);
      }

      // Apply theme
      await this.applyTheme();

      // Register service worker
      this.registerSW();

      // Setup event listeners
      this.setupEventListeners();
      console.log('✓ Listeners ready');

      // Initial data load
      await this.refreshHomeStats();
      await this.renderAll();

      // Setup alarm/reminder checks
      this.startAlarmChecker();
      this.startReminderChecker();
      console.log('✓ Alarm checker started');

      // Voice greeting
      const greetingEnabled = await lunaDB.getSetting('voiceGreeting', true);
      if (greetingEnabled) {
        setTimeout(() => this.voiceGreeting(), 1000);
      }

      // Update online status
      this.updateOnlineStatus();
      this.updateStatusPanel();
      window.addEventListener('online', () => this.handleOnlineStatus(true));
      window.addEventListener('offline', () => this.handleOnlineStatus(false));

      // Hide splash
      document.body.classList.add('loaded');
      console.log('✓ Luna initialized successfully');
    } catch (e) {
      console.error('Init error:', e);
    }
  }

  registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').then(reg => {
        console.log('✓ Service worker registered');
      }).catch(err => {
        console.warn('SW registration failed:', err);
      });
    }
  }

  async loadSettings() {
    const designSettings = await lunaDB.getSetting('designSettings', null);
    if (designSettings) {
      this.applyDesignSettings(designSettings);
    }
  }

  async applyTheme() {
    const theme = await lunaDB.getSetting('theme', 'dark');
    this.setTheme(theme);
  }

  setTheme(theme) {
    let actualTheme = theme;
    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      actualTheme = prefersDark ? 'dark' : 'light';
    }

    document.documentElement.setAttribute('data-theme', actualTheme);
    document.body.setAttribute('data-mode', actualTheme);

    if (actualTheme === 'light') {
      document.body.style.color = '#1a1d2e';
    } else {
      document.body.style.color = '#ffffff';
    }

    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
      const svg = themeBtn.querySelector('svg');
      if (svg) {
        if (actualTheme === 'light') {
          svg.innerHTML = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
        } else {
          svg.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
        }
      }
    }
  }

  // ============= EVENT LISTENERS =============
  setupEventListeners() {
    // Bottom nav
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => this.navigateTo(btn.dataset.page));
    });

    // Card navigation
    document.querySelectorAll('[data-page]').forEach(card => {
      if (card.classList.contains('card') || card.classList.contains('back-btn')) {
        card.addEventListener('click', (e) => {
          if (!e.target.closest('button')) {
            this.navigateTo(card.dataset.page);
          }
        });
      }
    });

    document.querySelectorAll('.back-btn').forEach(btn => {
      btn.addEventListener('click', () => this.navigateTo(btn.dataset.page));
    });

    // Theme toggle
    document.getElementById('theme-toggle').addEventListener('click', () => {
      this.cycleTheme();
    });

    // User name display click - opens settings
    document.getElementById('user-name-display').addEventListener('click', () => {
      this.navigateTo('settings');
    });

    // Personality buttons
    document.querySelectorAll('.personality-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = btn.dataset.personality;
        lunaAI.setPersonality(p);
        lunaDB.setSetting('personality', p);
        this.setActivePersonality(p);
        voiceSystem.speak(this.getPersonalitySwitchMessage(p));
      });
    });

    // Mic button
    document.getElementById('mic-button').addEventListener('click', () => {
      this.handleMicPress();
    });

    // Global search
    document.getElementById('global-search').addEventListener('input', (e) => {
      this.globalSearch(e.target.value);
    });

    // Notes search
    const notesSearch = document.getElementById('notes-search');
    if (notesSearch) {
      notesSearch.addEventListener('input', (e) => {
        this.renderNotes(e.target.value);
      });
    }

    // Add buttons
    document.getElementById('add-note-btn').addEventListener('click', () => this.openModal('modal-note'));
    document.getElementById('add-alarm-btn').addEventListener('click', () => this.openModal('modal-alarm'));
    document.getElementById('add-task-btn').addEventListener('click', () => this.openModal('modal-task'));
    document.getElementById('add-event-btn').addEventListener('click', () => this.openModal('modal-event'));

    // Save buttons
    document.getElementById('save-note').addEventListener('click', () => this.saveNote());
    document.getElementById('save-alarm').addEventListener('click', () => this.saveAlarm());
    document.getElementById('save-task').addEventListener('click', () => this.saveTask());
    document.getElementById('save-event').addEventListener('click', () => this.saveEvent());

    // Modal close
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => this.closeModal(btn.dataset.close));
    });
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.closeModal(modal.id);
      });
    });

    // Task filters
    document.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.renderTasks(tab.dataset.filter);
      });
    });

    // Calendar nav
    document.getElementById('cal-prev').addEventListener('click', () => {
      this.calendarDate.setMonth(this.calendarDate.getMonth() - 1);
      this.renderCalendar();
    });
    document.getElementById('cal-next').addEventListener('click', () => {
      this.calendarDate.setMonth(this.calendarDate.getMonth() + 1);
      this.renderCalendar();
    });

    // Chat
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send-btn');
    const chatMicBtn = document.getElementById('chat-mic-btn');

    chatSendBtn.addEventListener('click', () => this.sendChat());
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendChat();
    });
    chatMicBtn.addEventListener('click', () => {
      this.handleChatMic(chatMicBtn);
    });

    document.getElementById('clear-chat-btn').addEventListener('click', async () => {
      if (confirm('Obriši sve razgovore?')) {
        await lunaDB.clear('conversations');
        this.renderChat();
      }
    });

    // Settings
    document.getElementById('setting-username').addEventListener('change', async (e) => {
      const name = e.target.value.trim() || 'Saša';
      lunaAI.setUserName(name);
      await lunaDB.setSetting('userName', name);
      document.getElementById('user-name-display').textContent = name;
    });

    document.getElementById('setting-groq-key').addEventListener('change', async (e) => {
      const key = e.target.value.trim();
      lunaAI.setApiKey(key);
      await lunaDB.setSetting('groqApiKey', key);
      this.updateStatusPanel();
    });

    document.getElementById('test-api-btn').addEventListener('click', async () => {
      const status = document.getElementById('api-status');
      status.textContent = 'Testiram...';
      status.className = 'api-status';
      const result = await lunaAI.testConnection();
      status.textContent = result.success ? '✓ ' + result.message : '✗ ' + result.message;
      status.className = 'api-status ' + (result.success ? 'success' : 'error');
      this.updateStatusPanel();
    });

    document.getElementById('setting-personality').addEventListener('change', async (e) => {
      const p = e.target.value;
      lunaAI.setPersonality(p);
      await lunaDB.setSetting('personality', p);
      this.setActivePersonality(p);
    });

    document.getElementById('setting-theme').addEventListener('change', async (e) => {
      await lunaDB.setSetting('theme', e.target.value);
      this.setTheme(e.target.value);
    });

    // Design settings
    const designControls = ['depth', 'height', 'width', 'inset', 'outer', 'opacity', 'glow', 'reflection', 'radius', 'glass'];
    designControls.forEach(ctrl => {
      const input = document.getElementById('setting-' + ctrl);
      const val = document.getElementById('val-' + ctrl);
      if (input && val) {
        input.addEventListener('input', () => {
          val.textContent = input.value;
          this.updateDesignSettings();
        });
        input.addEventListener('change', () => this.saveDesignSettings());
      }
    });

    // Notifications
    document.getElementById('enable-notif-btn').addEventListener('click', () => this.enableNotifications());
    document.getElementById('setting-voice-notif').addEventListener('change', async (e) => {
      await lunaDB.setSetting('voiceNotif', e.target.checked);
    });
    document.getElementById('setting-voice-greeting').addEventListener('change', async (e) => {
      await lunaDB.setSetting('voiceGreeting', e.target.checked);
    });

    // Backup
    document.getElementById('export-btn').addEventListener('click', () => this.exportData());
    document.getElementById('import-btn').addEventListener('click', () => document.getElementById('import-file').click());
    document.getElementById('import-file').addEventListener('change', (e) => this.importData(e.target.files[0]));
    document.getElementById('backup-btn').addEventListener('click', () => this.quickBackup());
    document.getElementById('wipe-btn').addEventListener('click', () => this.wipeData());

    // Alarm modal
    document.getElementById('snooze-alarm').addEventListener('click', () => this.snoozeAlarm());
    document.getElementById('dismiss-alarm').addEventListener('click', () => this.dismissAlarm());
  }

  cycleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const order = ['dark', 'light', 'amoled'];
    const next = order[(order.indexOf(current) + 1) % order.length];
    this.setTheme(next);
    lunaDB.setSetting('theme', next);
    document.getElementById('setting-theme').value = next;
  }

  navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + page).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navBtn = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (navBtn) navBtn.classList.add('active');
    this.currentPage = page;

    // Refresh page data
    if (page === 'notes') this.renderNotes();
    if (page === 'alarms') this.renderAlarms();
    if (page === 'tasks') this.renderTasks();
    if (page === 'planner') { this.renderCalendar(); this.renderEvents(); }
    if (page === 'chat') this.renderChat();
    if (page === 'settings') this.updateStatusPanel();
  }

  setActivePersonality(p) {
    document.querySelectorAll('.personality-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.personality === p);
    });
    const sel = document.getElementById('setting-personality');
    if (sel) sel.value = p;
  }

  getPersonalitySwitchMessage(p) {
    const messages = {
      smart: 'Prešla sam u pametni režim. Precizna i efikasna.',
      funny: 'Hej! Sad sam šaljiva. Spremna za zabavu! 😄',
      wise: 'Mudrost je izabrana. Spremna sam da delim znanje.',
      business: 'Poslovni režim aktivan. Idemo na posao.',
      friendly: 'Prijateljski režim. Tu sam za tebe! ♥️'
    };
    return messages[p];
  }

  // ============= VOICE =============
  async voiceGreeting() {
    try {
      const greeting = await lunaAI.generateDailyGreeting();
      voiceSystem.speak(greeting, { rate: 0.95 });
    } catch (e) {
      console.error('Greeting error:', e);
    }
  }

  handleMicPress() {
    if (voiceSystem.isSpeaking) {
      voiceSystem.stopSpeaking();
      return;
    }

    voiceSystem.startListening(
      (transcript) => this.processVoiceCommand(transcript),
      () => { /* end */ }
    );
  }

  async processVoiceCommand(text) {
    if (!text) return;
    this.navigateTo('chat');
    await new Promise(r => setTimeout(r, 300));
    this.addChatMessage('user', text);
    const reply = await lunaAI.chat(text);
    this.addChatMessage('luna', reply);
    voiceSystem.speak(reply);
  }

  handleChatMic(btn) {
    voiceSystem.startListening(
      (transcript) => {
        document.getElementById('chat-input').value = transcript;
        this.sendChat();
      },
      () => { /* end */ }
    );
    btn.classList.toggle('listening', voiceSystem.isListening);
  }

  // ============= CHAT =============
  async renderChat() {
    const container = document.getElementById('chat-messages');
    const conversations = await lunaDB.getAll('conversations');
    container.innerHTML = '';

    if (conversations.length === 0) {
      container.innerHTML = `
        <div class="chat-message luna">
          <div class="msg-avatar">🌙</div>
          <div class="msg-bubble">Zdravo ${lunaAI.userName}! Ja sam Luna. Pitaj me bilo šta!</div>
        </div>
      `;
      return;
    }

    conversations.forEach(c => {
      this.addChatMessage(c.role === 'user' ? 'user' : 'luna', c.content);
    });

    container.scrollTop = container.scrollHeight;
  }

  addChatMessage(role, text) {
    const container = document.getElementById('chat-messages');
    const msg = document.createElement('div');
    msg.className = 'chat-message ' + role;
    msg.innerHTML = `
      <div class="msg-avatar ${role === 'user' ? 'user-avatar' : ''}">${role === 'user' ? lunaAI.userName.charAt(0).toUpperCase() : '🌙'}</div>
      <div class="msg-bubble">${this.escapeHtml(text)}</div>
    `;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
  }

  async sendChat() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    this.addChatMessage('user', text);
    const typing = this.addChatMessage('luna', '...');
    typing.classList.add('typing');

    const reply = await lunaAI.chat(text);
    typing.remove();
    this.addChatMessage('luna', reply);
    voiceSystem.speak(reply);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/\n/g, '<br>');
  }

  // ============= NOTES =============
  async renderNotes(search = '') {
    const list = document.getElementById('notes-list');
    let notes = await lunaDB.getAll('notes');
    notes = notes.filter(n => !n.archived).sort((a, b) => new Date(b.date) - new Date(a.date));

    if (search) {
      notes = notes.filter(n => n.content.toLowerCase().includes(search.toLowerCase()));
    }

    if (notes.length === 0) {
      list.innerHTML = '<p class="empty-state">Nema beleški. Dodaj prvu!</p>';
      return;
    }

    list.innerHTML = notes.map(n => `
      <div class="list-item">
        <div class="list-item-content">
          <div class="item-title">${this.escapeHtml(n.content)}</div>
          <div class="item-meta">📅 ${new Date(n.date).toLocaleString('sr-RS')}</div>
        </div>
        <div class="item-actions">
          <button class="item-action-btn" onclick="lunaApp.editNote('${n.id}')">✏️</button>
          <button class="item-action-btn danger" onclick="lunaApp.deleteNote('${n.id}')">🗑️</button>
        </div>
      </div>
    `).join('');

    document.getElementById('notes-count').textContent = notes.length;
  }

  async saveNote() {
    const text = document.getElementById('note-text').value.trim();
    const datetime = document.getElementById('note-datetime').value;
    if (!text) return alert('Unesi tekst beleške');

    const note = {
      id: 'note_' + Date.now(),
      content: text,
      date: new Date().toISOString(),
      archived: false
    };

    if (datetime) {
      note.remindAt = new Date(datetime).toISOString();
      // Also create reminder
      await lunaDB.put('reminders', {
        id: 'rem_' + Date.now(),
        content: text,
        dateTime: note.remindAt,
        fired: false
      });
    }

    await lunaDB.put('notes', note);
    this.closeModal('modal-note');
    document.getElementById('note-text').value = '';
    document.getElementById('note-datetime').value = '';
    this.renderNotes();
    this.refreshHomeStats();
    voiceSystem.speak('Beleška sačuvana');
  }

  async deleteNote(id) {
    if (!confirm('Obriši belešku?')) return;
    await lunaDB.delete('notes', id);
    this.renderNotes();
    this.refreshHomeStats();
  }

  editNote(id) {
    lunaDB.get('notes', id).then(note => {
      document.getElementById('note-text').value = note.content;
      this.openModal('modal-note');
      // For simplicity, we delete and recreate
      lunaDB.delete('notes', id);
    });
  }

  // ============= ALARMS =============
  async renderAlarms() {
    const list = document.getElementById('alarms-list');
    const alarms = await lunaDB.getAll('alarms');
    alarms.sort((a, b) => a.time.localeCompare(b.time));

    if (alarms.length === 0) {
      list.innerHTML = '<p class="empty-state">Nema alarma. Dodaj prvi!</p>';
      return;
    }

    list.innerHTML = alarms.map(a => `
      <div class="list-item">
        <div class="item-checkbox ${a.active ? 'checked' : ''}" onclick="lunaApp.toggleAlarm('${a.id}')">
          ${a.active ? '✓' : ''}
        </div>
        <div class="list-item-content">
          <div class="item-title">⏰ ${a.time} - ${this.escapeHtml(a.label)}</div>
          <div class="item-meta">${a.repeat ? '🔁 Svaki dan' : '🔕 Jednom'}</div>
        </div>
        <div class="item-actions">
          <button class="item-action-btn danger" onclick="lunaApp.deleteAlarm('${a.id}')">🗑️</button>
        </div>
      </div>
    `).join('');
  }

  async saveAlarm() {
    const time = document.getElementById('alarm-time').value;
    const label = document.getElementById('alarm-label').value.trim() || 'Alarm';
    const repeat = document.getElementById('alarm-repeat').checked;

    if (!time) return alert('Unesi vreme');

    await lunaDB.put('alarms', {
      id: 'alarm_' + Date.now(),
      time,
      label,
      repeat,
      active: true,
      createdAt: Date.now()
    });

    this.closeModal('modal-alarm');
    document.getElementById('alarm-time').value = '08:00';
    document.getElementById('alarm-label').value = '';
    this.renderAlarms();
    this.refreshHomeStats();
    voiceSystem.speak(`Alarm postavljen za ${time}`);
  }

  async deleteAlarm(id) {
    if (!confirm('Obriši alarm?')) return;
    await lunaDB.delete('alarms', id);
    this.renderAlarms();
    this.refreshHomeStats();
  }

  async toggleAlarm(id) {
    const alarm = await lunaDB.get('alarms', id);
    alarm.active = !alarm.active;
    await lunaDB.put('alarms', alarm);
    this.renderAlarms();
  }

  startAlarmChecker() {
    this.alarmCheckInterval = setInterval(async () => {
      const now = new Date();
      const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
      const today = now.toDateString();

      const alarms = await lunaDB.getAll('alarms');
      for (const alarm of alarms) {
        if (alarm.active && alarm.time === currentTime && alarm.lastFired !== today) {
          alarm.lastFired = today;
          await lunaDB.put('alarms', alarm);
          this.fireAlarm(alarm);
        }
      }
    }, 30000); // Check every 30s
  }

  fireAlarm(alarm) {
    this.activeAlarm = alarm;
    document.getElementById('alarm-active-label').textContent = alarm.label;
    document.getElementById('alarm-active-time').textContent = alarm.time;
    this.openModal('modal-alarm-active');

    const message = `Alarm: ${alarm.label}. Vreme je ${alarm.time}.`;
    voiceSystem.speak(message, { rate: 1.0 });

    // Try to play notification sound
    this.playBeep();

    // Try push notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Luna - ' + alarm.label, {
        body: 'Vreme je ' + alarm.time,
        icon: './icons/icon-192.png',
        tag: 'alarm-' + alarm.id
      });
    }
  }

  playBeep() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.frequency.value = 880;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.5);

      setTimeout(() => {
        const o2 = audioCtx.createOscillator();
        const g2 = audioCtx.createGain();
        o2.connect(g2); g2.connect(audioCtx.destination);
        o2.frequency.value = 660; o2.type = 'sine';
        g2.gain.setValueAtTime(0.3, audioCtx.currentTime);
        g2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        o2.start(); o2.stop(audioCtx.currentTime + 0.5);
      }, 600);
    } catch (e) {}
  }

  snoozeAlarm() {
    if (!this.activeAlarm) return;
    voiceSystem.stopSpeaking();
    this.closeModal('modal-alarm-active');

    // Set new alarm in 5 min
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    const newTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

    setTimeout(() => {
      this.fireAlarm({ ...this.activeAlarm, label: this.activeAlarm.label + ' (odloženo)' });
    }, 5 * 60 * 1000);

    voiceSystem.speak('Alarm odložen za 5 minuta');
  }

  dismissAlarm() {
    voiceSystem.stopSpeaking();
    this.closeModal('modal-alarm-active');
    this.activeAlarm = null;
    voiceSystem.speak('Alarm ugašen');
  }

  // ============= REMINDERS =============
  startReminderChecker() {
    this.reminderCheckInterval = setInterval(async () => {
      const now = new Date();
      const reminders = await lunaDB.getAll('reminders');
      for (const r of reminders) {
        if (!r.fired && new Date(r.dateTime) <= now) {
          r.fired = true;
          await lunaDB.put('reminders', r);
          this.fireReminder(r);
        }
      }
    }, 30000);
  }

  fireReminder(reminder) {
    const message = `${lunaAI.userName}, podsetnik: ${reminder.content}`;
    voiceSystem.speak(message);

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Luna - Podsetnik', {
        body: reminder.content,
        icon: './icons/icon-192.png',
        tag: 'reminder-' + reminder.id
      });
    }
  }

  // ============= TASKS =============
  async renderTasks(filter = 'all') {
    const list = document.getElementById('tasks-list');
    let tasks = await lunaDB.getAll('tasks');

    if (filter === 'active') tasks = tasks.filter(t => !t.completed);
    if (filter === 'completed') tasks = tasks.filter(t => t.completed);

    tasks.sort((a, b) => {
      const priOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
      return (priOrder[a.priority] || 2) - (priOrder[b.priority] || 2);
    });

    if (tasks.length === 0) {
      list.innerHTML = '<p class="empty-state">Nema zadataka. Dodaj prvi!</p>';
      document.getElementById('tasks-count').textContent = 0;
      return;
    }

    list.innerHTML = tasks.map(t => `
      <div class="list-item ${t.completed ? 'completed' : ''}">
        <div class="item-checkbox ${t.completed ? 'checked' : ''}" onclick="lunaApp.toggleTask('${t.id}')">
          ${t.completed ? '✓' : ''}
        </div>
        <div class="list-item-content">
          <div class="item-title">${this.escapeHtml(t.content)}</div>
          <div class="item-meta">
            <span class="priority-badge priority-${t.priority}">${t.priority}</span>
            ${t.due ? '<span>📅 ' + new Date(t.due).toLocaleDateString('sr-RS') + '</span>' : ''}
          </div>
        </div>
        <div class="item-actions">
          <button class="item-action-btn danger" onclick="lunaApp.deleteTask('${t.id}')">🗑️</button>
        </div>
      </div>
    `).join('');

    const activeCount = (await lunaDB.getAll('tasks')).filter(t => !t.completed).length;
    document.getElementById('tasks-count').textContent = activeCount;
  }

  async saveTask() {
    const text = document.getElementById('task-text').value.trim();
    const priority = document.getElementById('task-priority').value;
    const due = document.getElementById('task-due').value;
    if (!text) return alert('Unesi opis zadatka');

    await lunaDB.put('tasks', {
      id: 'task_' + Date.now(),
      content: text,
      priority,
      due: due || null,
      completed: false,
      createdAt: Date.now()
    });

    this.closeModal('modal-task');
    document.getElementById('task-text').value = '';
    document.getElementById('task-priority').value = 'normal';
    document.getElementById('task-due').value = '';
    this.renderTasks();
    this.refreshHomeStats();
    voiceSystem.speak('Zadatak dodat');
  }

  async toggleTask(id) {
    const task = await lunaDB.get('tasks', id);
    task.completed = !task.completed;
    await lunaDB.put('tasks', task);
    this.renderTasks();
    this.refreshHomeStats();
    if (task.completed) voiceSystem.speak('Završeno!');
  }

  async deleteTask(id) {
    if (!confirm('Obriši zadatak?')) return;
    await lunaDB.delete('tasks', id);
    this.renderTasks();
    this.refreshHomeStats();
  }

  // ============= CALENDAR/EVENTS =============
  async renderCalendar() {
    const grid = document.getElementById('cal-grid');
    const title = document.getElementById('cal-title');
    const date = this.calendarDate;
    const month = date.getMonth();
    const year = date.getFullYear();

    title.textContent = date.toLocaleDateString('sr-RS', { month: 'long', year: 'numeric' });

    const dayNames = ['Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub', 'Ned'];
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = (firstDay.getDay() + 6) % 7; // Monday = 0

    const events = await lunaDB.getAll('events');
    const today = new Date();

    let html = dayNames.map(d => `<div class="cal-day-name">${d}</div>`).join('');

    // Previous month
    for (let i = startDay; i > 0; i--) {
      const d = new Date(year, month, 1 - i);
      html += `<div class="cal-day other-month">${d.getDate()}</div>`;
    }

    // Current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const cellDate = new Date(year, month, d);
      const dateStr = cellDate.toDateString();
      const isToday = cellDate.toDateString() === today.toDateString();
      const hasEvents = events.some(e => new Date(e.date).toDateString() === dateStr);

      html += `<div class="cal-day ${isToday ? 'today' : ''} ${hasEvents ? 'has-events' : ''}">${d}</div>`;
    }

    // Next month
    const totalCells = startDay + lastDay.getDate();
    const remaining = (7 - (totalCells % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      html += `<div class="cal-day other-month">${i}</div>`;
    }

    grid.innerHTML = html;
  }

  async renderEvents() {
    const list = document.getElementById('events-list');
    const events = await lunaDB.getAll('events');
    const today = new Date().toDateString();
    const todayEvents = events.filter(e => new Date(e.date).toDateString() === today);

    if (todayEvents.length === 0) {
      list.innerHTML = '<p class="empty-state">Nema događaja za danas.</p>';
      return;
    }

    list.innerHTML = todayEvents.map(e => `
      <div class="list-item">
        <div class="list-item-content">
          <div class="item-title">📌 ${this.escapeHtml(e.title)}</div>
          <div class="item-meta">${e.time ? '🕐 ' + e.time : '📅 Ceo dan'}</div>
        </div>
        <div class="item-actions">
          <button class="item-action-btn danger" onclick="lunaApp.deleteEvent('${e.id}')">🗑️</button>
        </div>
      </div>
    `).join('');
  }

  async saveEvent() {
    const title = document.getElementById('event-title').value.trim();
    const date = document.getElementById('event-date').value;
    const time = document.getElementById('event-time').value;

    if (!title || !date) return alert('Unesi naziv i datum');

    await lunaDB.put('events', {
      id: 'event_' + Date.now(),
      title,
      date: new Date(date).toISOString(),
      time
    });

    this.closeModal('modal-event');
    document.getElementById('event-title').value = '';
    document.getElementById('event-date').value = '';
    document.getElementById('event-time').value = '';
    this.renderCalendar();
    this.renderEvents();
  }

  async deleteEvent(id) {
    if (!confirm('Obriši događaj?')) return;
    await lunaDB.delete('events', id);
    this.renderCalendar();
    this.renderEvents();
  }

  // ============= HOME STATS =============
  async refreshHomeStats() {
    const notes = (await lunaDB.getAll('notes')).filter(n => !n.archived);
    const tasks = (await lunaDB.getAll('tasks')).filter(t => !t.completed);
    const alarms = (await lunaDB.getAll('alarms')).filter(a => a.active);

    document.getElementById('notes-count').textContent = notes.length;
    document.getElementById('tasks-count').textContent = tasks.length;

    // Show next event
    const events = await lunaDB.getAll('events');
    const now = new Date();
    const futureEvents = events
      .filter(e => new Date(e.date) >= now)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const nextEvEl = document.getElementById('next-event');
    if (futureEvents.length > 0) {
      const ev = futureEvents[0];
      const dateStr = new Date(ev.date).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit' });
      nextEvEl.innerHTML = `
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span>${dateStr} ${ev.title}</span>
      `;
    } else if (alarms.length > 0) {
      const sortedAlarms = alarms.sort((a, b) => a.time.localeCompare(b.time));
      nextEvEl.innerHTML = `
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        </svg>
        <span>${sortedAlarms[0].time} - ${sortedAlarms[0].label}</span>
      `;
    } else {
      nextEvEl.innerHTML = `
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span>Nema zakazanih obaveza</span>
      `;
    }
  }

  async renderAll() {
    await this.refreshHomeStats();
  }

  // ============= GLOBAL SEARCH =============
  async globalSearch(query) {
    if (!query || query.length < 2) return;
    // Simple: search notes, tasks, events
    const notes = await lunaDB.getAll('notes');
    const tasks = await lunaDB.getAll('tasks');
    const events = await lunaDB.getAll('events');

    const results = [];
    notes.filter(n => n.content.toLowerCase().includes(query.toLowerCase()))
      .forEach(n => results.push({ type: 'note', ...n }));
    tasks.filter(t => t.content.toLowerCase().includes(query.toLowerCase()))
      .forEach(t => results.push({ type: 'task', ...t }));
    events.filter(e => e.title.toLowerCase().includes(query.toLowerCase()))
      .forEach(e => results.push({ type: 'event', ...e }));

    // Could show a dropdown - for now just store
    this.lastSearchResults = results;
  }

  // ============= DESIGN SETTINGS =============
  updateDesignSettings() {
    const settings = {
      depth: document.getElementById('setting-depth').value,
      height: document.getElementById('setting-height').value,
      width: document.getElementById('setting-width').value,
      inset: document.getElementById('setting-inset').value,
      outer: document.getElementById('setting-outer').value,
      opacity: document.getElementById('setting-opacity').value,
      glow: document.getElementById('setting-glow').value,
      reflection: document.getElementById('setting-reflection').value,
      radius: document.getElementById('setting-radius').value,
      glass: document.getElementById('setting-glass').value
    };

    document.documentElement.style.setProperty('--depth', settings.depth + 'px');
    document.documentElement.style.setProperty('--height', settings.height + 'px');
    document.documentElement.style.setProperty('--width', settings.width + '%');
    document.documentElement.style.setProperty('--inset-shadow', settings.inset + 'px');
    document.documentElement.style.setProperty('--outer-shadow', settings.outer + 'px');
    document.documentElement.style.setProperty('--shadow-opacity', (settings.opacity / 100).toFixed(2));
    document.documentElement.style.setProperty('--glow', settings.glow + 'px');
    document.documentElement.style.setProperty('--reflection', settings.reflection + '%');
    document.documentElement.style.setProperty('--radius', settings.radius + 'px');
    document.documentElement.style.setProperty('--glass', settings.glass + '%');
  }

  applyDesignSettings(s) {
    if (!s) return;
    Object.entries(s).forEach(([k, v]) => {
      const el = document.getElementById('setting-' + k);
      const val = document.getElementById('val-' + k);
      if (el) el.value = v;
      if (val) val.textContent = v;
    });
    this.updateDesignSettings();
  }

  async saveDesignSettings() {
    const settings = {};
    ['depth', 'height', 'width', 'inset', 'outer', 'opacity', 'glow', 'reflection', 'radius', 'glass'].forEach(k => {
      settings[k] = document.getElementById('setting-' + k).value;
    });
    await lunaDB.setSetting('designSettings', settings);
  }

  // ============= NOTIFICATIONS =============
  async enableNotifications() {
    if (!('Notification' in window)) {
      alert('Tvoj pretraživač ne podržava notifikacije.');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      new Notification('Luna notifikacije aktivirane! 🌙', {
        body: 'Sada ću te obaveštavati o alarmima i podsetnicima.',
        icon: './icons/icon-192.png'
      });
    }
  }

  // ============= BACKUP / EXPORT / IMPORT =============
  async exportData() {
    const data = await lunaDB.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `luna-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    voiceSystem.speak('Podaci eksportovani');
  }

  async importData(file) {
    if (!file) return;
    if (!confirm('Uvoz podataka će zameniti sve trenutne podatke. Nastaviti?')) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await lunaDB.importAll(data);
      alert('Podaci uspešno uvezeni!');
      await this.renderAll();
      this.navigateTo('home');
    } catch (e) {
      alert('Greška: ' + e.message);
    }
  }

  async quickBackup() {
    const data = await lunaDB.exportAll();
    await lunaDB.setSetting('lastBackup', data);
    await lunaDB.setSetting('lastBackupDate', new Date().toISOString());
    voiceSystem.speak('Backup sačuvan lokalno');
    alert('Backup sačuvan!');
  }

  async wipeData() {
    if (!confirm('⚠️ Ovo će obrisati SVE podatke. Da li si siguran?')) return;
    if (!confirm('Zaista obriši sve? Ova akcija je nepovratna!')) return;
    await lunaDB.wipeAll();
    voiceSystem.speak('Svi podaci obrisani');
    alert('Svi podaci su obrisani.');
    location.reload();
  }

  // ============= MODALS =============
  openModal(id) {
    document.getElementById(id).classList.add('active');
  }

  closeModal(id) {
    document.getElementById(id).classList.remove('active');
  }

  // ============= STATUS =============
  updateOnlineStatus() {
    this.handleOnlineStatus(navigator.onLine);
  }

  handleOnlineStatus(online) {
    lunaAI.setOnlineStatus(online);
    this.updateStatusPanel();
  }

  updateStatusPanel() {
    const mode = lunaAI.mode;
    const online = navigator.onLine;

    document.getElementById('status-internet').innerHTML = online ? '🟢 Online' : '🔴 Offline';
    document.getElementById('status-mode').innerHTML = mode === 'online' ? '🟢 Groq AI' : '🟡 Offline AI';
    document.getElementById('status-groq').innerHTML = lunaAI.apiKey ? '🟢 Konfigurisan' : '⚪ Nije unet ključ';
    document.getElementById('status-mic').innerHTML = voiceSystem.micPermission ? '🟢 Dozvoljen' : '🔴 Blokiran';
    document.getElementById('status-speaker').innerHTML = '🟢 Spreman';
    document.getElementById('status-db').innerHTML = lunaDB.db ? '🟢 Aktivna' : '🔴 Neaktivna';
    document.getElementById('status-sync').innerHTML = online ? '🟢 Sinhronizovano' : '🟡 Čeka';

    const groqBadge = document.getElementById('groq-badge');
    if (groqBadge) {
      groqBadge.style.display = (mode === 'online') ? 'inline' : 'none';
    }
    const offlineBadge = document.getElementById('offline-badge');
    if (offlineBadge) {
      offlineBadge.style.display = (mode === 'offline') ? 'inline' : 'none';
    }
  }
}

// Init
const lunaApp = new LunaApp();
document.addEventListener('DOMContentLoaded', () => lunaApp.init());
