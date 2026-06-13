// Luna AI System - Groq + Offline
class LunaAI {
  constructor() {
    this.apiKey = null;
    this.apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
    this.model = 'llama-3.3-70b-versatile';
    this.mode = 'offline'; // 'online' or 'offline'
    this.personality = 'smart';
    this.userName = 'Saša';
    this.systemPrompts = {
      smart: 'Ti si Luna, pametna AI sekretarica. Odgovaraj kratko, precizno i korisno. Govori na srpskom jeziku.',
      funny: 'Ti si Luna, šaljiva AI sekretarica. Budi duhovita, koristi humor i sarkazam. Ali i dalje budi od pomoći. Govori na srpskom jeziku.',
      wise: 'Ti si Luna, sveznalica. Deli mudrosti, zanimljivosti i korisne informacije. Budi inspirativna. Govori na srpskom jeziku.',
      business: 'Ti si Luna, poslovna AI sekretarica. Budi profesionalna, organizovana i efikasna. Koristi poslovni ton. Govori na srpskom jeziku.',
      friendly: 'Ti si Luna, prijateljska AI sekretarica. Budi topla, nežna i podržavajuća. Kao dobra drugarica. Govori na srpskom jeziku.'
    };
    this.online = navigator.onLine;
    this.lastOnlineStatus = this.online;
  }

  setApiKey(key) {
    this.apiKey = key;
  }

  setPersonality(p) {
    this.personality = p;
  }

  setUserName(name) {
    this.userName = name || 'prijatelju';
  }

  setOnlineStatus(online) {
    const wasOnline = this.online;
    this.online = online;
    if (online && !wasOnline) {
      this.mode = this.apiKey ? 'online' : 'offline';
    } else if (!online) {
      this.mode = 'offline';
    }
    return { wasOnline, isOnline: online, mode: this.mode };
  }

  async testConnection() {
    if (!this.apiKey) {
      return { success: false, message: 'API ključ nije unet' };
    }
    if (!this.online) {
      return { success: false, message: 'Nema internet konekcije' };
    }
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: 'Zdravo' }],
          max_tokens: 10
        })
      });
      if (response.ok) {
        return { success: true, message: 'Veza uspešna!' };
      } else {
        const err = await response.json().catch(() => ({}));
        return { success: false, message: err.error?.message || 'Greška pri konekciji' };
      }
    } catch (e) {
      return { success: false, message: 'Mrežna greška: ' + e.message };
    }
  }

  async chat(userMessage) {
    this.mode = (this.online && this.apiKey) ? 'online' : 'offline';

    if (this.mode === 'online') {
      try {
        return await this.groqChat(userMessage);
      } catch (e) {
        console.error('Groq error, fallback to offline:', e);
        return this.offlineChat(userMessage);
      }
    }
    return this.offlineChat(userMessage);
  }

  async groqChat(userMessage) {
    const systemPrompt = this.systemPrompts[this.personality] + ` Korisnikovo ime je ${this.userName}.`;

    // Get recent conversation context
    const conversations = await lunaDB.getAll('conversations');
    const recentConvos = conversations.slice(-10);

    const messages = [
      { role: 'system', content: systemPrompt },
      ...recentConvos.map(c => ({ role: c.role, content: c.content })),
      { role: 'user', content: userMessage }
    ];

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages,
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error('API error: ' + response.status);
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;

    // Save conversation
    await lunaDB.add('conversations', {
      role: 'user',
      content: userMessage,
      timestamp: Date.now()
    });
    await lunaDB.add('conversations', {
      role: 'assistant',
      content: reply,
      timestamp: Date.now()
    });

    return reply;
  }

  offlineChat(userMessage) {
    const msg = userMessage.toLowerCase().trim();

    // Save conversation
    lunaDB.add('conversations', {
      role: 'user',
      content: userMessage,
      timestamp: Date.now()
    });

    let reply = '';

    // Greetings
    if (this.matches(msg, ['zdravo', 'ćao', 'zdravko', 'hej', 'hello', 'hi'])) {
      reply = this.personalitySwitch(
        `Zdravo ${this.userName}! Kako mogu da ti pomognem danas?`,
        `Ćao ${this.userName}! 😄 Šta ima? Jesi li spreman za avanturu?`,
        `Dobro došao, ${this.userName}. Svaki susret je nova prilika za mudrost.`,
        `Zdravo ${this.userName}. Tu sam da ti pomognem sa organizacijom.`,
        `Hej ${this.userName} ♥️ Drago mi je što si tu! Kako si danas?`
      );
    }
    // How are you
    else if (this.matches(msg, ['kako si', 'kako ste', 'how are you'])) {
      reply = this.personalitySwitch(
        `Funkcionišem savršeno, hvala na pitanju.`,
        `Odlično! Imam odličan dan kad ti si tu 😎`,
        `Kao i uvek - spremna da delim mudrost sa tobom.`,
        `Spremna za rad.`,
        `Super! Još bolje kad razgovaram sa tobom ♥️`
      );
    }
    // Time
    else if (this.matches(msg, ['koliko je sati', 'vreme', 'time'])) {
      const now = new Date();
      const time = now.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' });
      reply = `Trenutno je ${time}.`;
    }
    // Date
    else if (this.matches(msg, ['koji je datum', 'datum', 'date', 'dan danas'])) {
      const now = new Date();
      const date = now.toLocaleDateString('sr-RS', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      reply = `Danas je ${date}.`;
    }
    // Create note
    else if (msg.startsWith('beleška ') || msg.startsWith('zapiši ') || msg.startsWith('napravi belešku') || msg.startsWith('zabeleži ')) {
      const noteText = userMessage.replace(/^(beleška|zapiši|zabeleži|napravi belešku)\s*/i, '');
      lunaDB.put('notes', {
        id: 'note_' + Date.now(),
        content: noteText,
        date: new Date().toISOString(),
        archived: false
      });
      reply = this.personalitySwitch(
        `Beleška sačuvana: "${noteText}"`,
        `Zapisano! 📝 "${noteText}" - ne zaboravi me!`,
        `Mudrost zapisana: "${noteText}". Reči su moćne.`,
        `Beleška kreirana i sačuvana.`,
        `Sačuvala sam tvoju belešku ♥️ "${noteText}"`
      );
    }
    // Create task
    else if (msg.startsWith('zadatak ') || msg.startsWith('dodaj zadatak') || msg.startsWith('napravi zadatak')) {
      const taskText = userMessage.replace(/^(zadatak|dodaj zadatak|napravi zadatak)\s*/i, '');
      lunaDB.put('tasks', {
        id: 'task_' + Date.now(),
        content: taskText,
        priority: 'normal',
        completed: false,
        createdAt: Date.now()
      });
      reply = `Zadatak dodat: "${taskText}". Srećno! 💪`;
    }
    // Set alarm
    else if (msg.startsWith('alarm ') || msg.startsWith('postavi alarm') || msg.startsWith('namesti alarm')) {
      const time = this.extractTime(msg);
      if (time) {
        const label = userMessage.replace(/^(alarm|postavi alarm|namesti alarm)\s*/i, '').replace(time, '').trim() || 'Alarm';
        lunaDB.put('alarms', {
          id: 'alarm_' + Date.now(),
          label: label,
          time: time,
          active: true,
          repeat: false,
          createdAt: Date.now()
        });
        reply = `Alarm postavljen za ${time}: "${label}". Budi budan! ⏰`;
      } else {
        reply = `Reci mi tačno vreme, npr: "alarm 14:30".`;
      }
    }
    // Set reminder
    else if (msg.startsWith('podsetnik ') || msg.startsWith('podseti me') || msg.startsWith('napravi podsetnik')) {
      const time = this.extractTime(msg);
      const dateMatch = this.extractDate(msg);
      let dateTime = null;
      if (time) {
        const today = new Date();
        const [h, m] = time.split(':').map(Number);
        today.setHours(h, m, 0, 0);
        if (dateMatch) today.setDate(today.getDate() + dateMatch);
        dateTime = today.toISOString();
      }
      const reminderText = userMessage.replace(/^(podsetnik|podseti me|napravi podsetnik)\s*/i, '').replace(time || '', '').trim();

      if (dateTime && reminderText) {
        lunaDB.put('reminders', {
          id: 'rem_' + Date.now(),
          content: reminderText,
          dateTime: dateTime,
          fired: false
        });
        reply = `Podsetnik postavljen: "${reminderText}" za ${new Date(dateTime).toLocaleString('sr-RS')}.`;
      } else {
        reply = `Trebam vreme i tekst. Probaj: "podsetnik kupi hleb 18:00".`;
      }
    }
    // Joke
    else if (this.matches(msg, ['vic', 'šala', 'joke', 'ispričaj vic', 'reši mi vic'])) {
      const jokes = [
        'Zašto programeri mrze prirodu? Previše bagova. 🐛',
        'Šta kaže jedan 0 drugom 0? "Izgledaš baš kao ja!"',
        'Kako se zove optimista koji je pao sa 10. sprata? Neočekivano srećan... 📉',
        'Šta je zajedničko mrazu i laži? Kratko traju i nestaju kad izađe sunce.',
        'Zašto kompjuter ode kod doktora? Imao je virus. 🦠'
      ];
      reply = jokes[Math.floor(Math.random() * jokes.length)];
    }
    // Mood check
    else if (this.matches(msg, ['kako sam', 'kako se osećam', 'mood'])) {
      reply = this.personalitySwitch(
        `Tvoje raspoloženje se prati kroz interakcije. Pozitivno si orijentisan!`,
        `Čini mi se da si OK! Ali ako treba vic, tu sam 😄`,
        `Emocionalna ravnoteža je ključ zdravlja. Meditiraj malo.`,
        `Tvoj fokus je stabilan. Produktivan dan!`,
        `Osećam tvoju energiju ♥️ Budi nežan prema sebi danas.`
      );
    }
    // Help
    else if (this.matches(msg, ['pomoć', 'help', 'šta možeš', 'komande'])) {
      reply = `Mogu da ti pomognem sa:\n• "Beleška [tekst]" - napravi belešku\n• "Zadatak [tekst]" - dodaj zadatak\n• "Alarm [vreme]" - postavi alarm\n• "Podsetnik [tekst] [vreme]" - napravi podsetnik\n• "Vic" - ispričam vic\n• "Koliko je sati" - kaže vreme\n• I još mnogo toga! 🌙`;
    }
    // Default
    else {
      reply = this.personalitySwitch(
        `Razumem. Za offline režim imam ograničene mogućnosti. Probaj komande kao: beleška, zadatak, alarm, podsetnik, vic, ili vreme/datum. Ili idi u podešavanja i unesi Groq API ključ za napredniji razgovor.`,
        `Hmm, nisam sigurna šta da odgovorim bez interneta 😅 Probaj nešto kao: "beleška kupi mleko" ili "vic"!`,
        `Mudrost zahteva povezanost. Bez interneta mogu samo osnovno. Probaj: beleška, zadatak, alarm.`,
        `Nisam mogla da procesiram. Dostupne offline komande: beleška, zadatak, alarm, podsetnik.`,
        `Razumem te, ali bez interneta sam malo ograničena ♥️ Probaj: beleška, zadatak, alarm, vic, vreme.`
      );
    }

    // Save reply
    lunaDB.add('conversations', {
      role: 'assistant',
      content: reply,
      timestamp: Date.now()
    });

    return reply;
  }

  matches(text, keywords) {
    return keywords.some(k => text.includes(k));
  }

  personalitySwitch(smart, funny, wise, business, friendly) {
    return { smart, funny, wise, business, friendly }[this.personality] || smart;
  }

  extractTime(text) {
    const match = text.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      return `${match[1].padStart(2, '0')}:${match[2]}`;
    }
    const match2 = text.match(/(\d{1,2})\s*sati/);
    if (match2) {
      return `${match2[1].padStart(2, '0')}:00`;
    }
    return null;
  }

  extractDate(text) {
    const match = text.match(/za\s+(\d+)\s*(dan|dana)/);
    if (match) return parseInt(match[1]);
    if (text.includes('sutra')) return 1;
    return 0;
  }

  async generateDailyGreeting() {
    const hour = new Date().getHours();
    const notes = await lunaDB.getAll('notes');
    const tasks = await lunaDB.getAll('tasks');
    const alarms = await lunaDB.getAll('alarms');
    const reminders = await lunaDB.getAll('reminders');

    const today = new Date().toDateString();
    const todayTasks = tasks.filter(t => !t.completed).length;
    const todayReminders = reminders.filter(r => !r.fired && new Date(r.dateTime).toDateString() === today).length;
    const todayAlarms = alarms.filter(a => a.active).length;

    let greeting;
    if (hour < 6) greeting = 'Dobra noć';
    else if (hour < 12) greeting = 'Dobro jutro';
    else if (hour < 18) greeting = 'Dobar dan';
    else greeting = 'Dobro veče';

    const parts = [`${greeting} ${this.userName}.`];

    const total = todayTasks + todayReminders + todayAlarms;
    if (total > 0) {
      const items = [];
      if (todayTasks > 0) items.push(`${todayTasks} ${todayTasks === 1 ? 'zadatak' : (todayTasks < 5 ? 'zadatka' : 'zadataka')}`);
      if (todayReminders > 0) items.push(`${todayReminders} ${todayReminders === 1 ? 'podsetnik' : (todayReminders < 5 ? 'podsetnika' : 'podsetnika')}`);
      if (todayAlarms > 0) items.push(`${todayAlarms} ${todayAlarms === 1 ? 'alarm' : (todayAlarms < 5 ? 'alarma' : 'alarma')}`);
      parts.push(`Danas imaš ${items.join(', ')}.`);
    } else {
      parts.push('Danas nema zakazanih obaveza. Uživaj!');
    }

    return parts.join(' ');
  }
}

const lunaAI = new LunaAI();
