// Luna Voice System - STT + TTS
class VoiceSystem {
  constructor() {
    this.recognition = null;
    this.synthesis = window.speechSynthesis;
    this.isListening = false;
    this.isSpeaking = false;
    this.lang = 'sr-Latn-RS';
    this.voices = [];
    this.selectedVoice = null;
    this.onResultCallback = null;
    this.onEndCallback = null;
    this.micPermission = false;
  }

  async init() {
    // Load voices
    this.loadVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => this.loadVoices();
    }

    // Init speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = this.lang;
      this.recognition.maxAlternatives = 1;

      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (this.onResultCallback) this.onResultCallback(transcript);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.updateMicUI(false);
        if (this.onEndCallback) this.onEndCallback();
      };

      this.recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        this.isListening = false;
        this.updateMicUI(false);
      };
    }

    // Request mic permission
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.micPermission = true;
      stream.getTracks().forEach(track => track.stop());
    } catch (e) {
      this.micPermission = false;
    }

    return this.micPermission;
  }

  loadVoices() {
    this.voices = this.synthesis.getVoices();
    // Try to find Serbian or female voice
    const preferred = this.voices.find(v =>
      v.lang.startsWith('sr') ||
      v.lang.startsWith('hr') ||
      v.name.toLowerCase().includes('female') ||
      v.name.toLowerCase().includes('samantha') ||
      v.name.toLowerCase().includes('google') && v.lang.startsWith('en')
    );
    this.selectedVoice = preferred || this.voices[0];
  }

  speak(text, options = {}) {
    if (!text) return;

    // Cancel any ongoing speech
    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = this.lang;
    utterance.rate = options.rate || 1.0;
    utterance.pitch = options.pitch || 1.0;
    utterance.volume = options.volume || 1.0;

    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
      this.updateSpeakerUI(true);
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.updateSpeakerUI(false);
      if (options.onEnd) options.onEnd();
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
      this.updateSpeakerUI(false);
    };

    this.synthesis.speak(utterance);
  }

  stopSpeaking() {
    this.synthesis.cancel();
    this.isSpeaking = false;
    this.updateSpeakerUI(false);
  }

  startListening(onResult, onEnd) {
    if (!this.recognition) {
      alert('Tvoj pretraživač ne podržava glasovne komande.');
      return false;
    }

    if (this.isListening) {
      this.stopListening();
      return false;
    }

    this.onResultCallback = onResult;
    this.onEndCallback = onEnd;

    try {
      this.recognition.start();
      this.isListening = true;
      this.updateMicUI(true);
      return true;
    } catch (e) {
      console.error('Start listening error:', e);
      return false;
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
    this.isListening = false;
    this.updateMicUI(false);
  }

  updateMicUI(active) {
    const mic = document.getElementById('mic-button');
    if (mic) {
      if (active) {
        mic.classList.add('listening');
      } else {
        mic.classList.remove('listening');
      }
    }
  }

  updateSpeakerUI(active) {
    const mic = document.getElementById('mic-button');
    if (mic) {
      if (active) {
        mic.classList.add('speaking');
      } else {
        mic.classList.remove('speaking');
      }
    }
  }
}

const voiceSystem = new VoiceSystem();
