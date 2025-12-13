
class SoundManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.currentMusicNodes = [];
        this.isMuted = false;
        this.initialized = false;

        // Track state specifically for autoplay policy
        this.targetTrack = null; // 'menu', 'game', or null
        this.currentTrack = null; // 'menu', 'game', or null
    }

    init() {
        if (this.initialized) return;

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();

            // Master Gain
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.5;
            this.masterGain.connect(this.ctx.destination);

            // Music Bus
            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.value = 0.3;
            this.musicGain.connect(this.masterGain);

            // SFX Bus
            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.value = 0.4;
            this.sfxGain.connect(this.masterGain);

            this.initialized = true;
            console.log("SoundManager initialized");

            // Try to sync state immediately (in case ctx is already running)
            this._updateMusicState();
        } catch (e) {
            console.error("Web Audio API not supported", e);
        }
    }

    async resume() {
        if (!this.ctx) this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            await this.ctx.resume();
            console.log("SoundManager resumed");
        }
        // Force update state after resume
        this._updateMusicState();
    }

    mute(mute) {
        this.isMuted = mute;
        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(mute ? 0 : 0.5, this.ctx.currentTime, 0.1);
        }
    }

    stopMusic() {
        this.targetTrack = null;
        this._updateMusicState();
    }

    startMenuMusic() {
        if (this.targetTrack === 'menu') return; // Already requested
        this.targetTrack = 'menu';
        this._updateMusicState();
    }

    startGameMusic() {
        if (this.targetTrack === 'game') return; // Already requested
        this.targetTrack = 'game';
        this._updateMusicState();
    }

    // Central State Machine for Background Music
    _updateMusicState() {
        // 1. Prerequisites
        if (!this.ctx || this.isMuted) return;
        if (this.ctx.state === 'suspended') return; // Cannot play yet

        // 2. No Change Needed
        if (this.currentTrack === this.targetTrack) return;

        console.log(`[SoundManager] Switching track: ${this.currentTrack} -> ${this.targetTrack}`);

        // 3. Stop Current
        this.currentMusicNodes.forEach(node => {
            try {
                // Ramp down before stopping to avoid clicks
                if (node.gain) {
                    node.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
                }
                node.stop(this.ctx.currentTime + 0.1);
                setTimeout(() => {
                    try { node.disconnect(); } catch (e) { /* ignore */ }
                }, 200);
            } catch (e) { /* ignore */ }
        });
        this.currentMusicNodes = [];
        this.currentTrack = null;

        // 4. Start Target
        if (this.targetTrack === 'menu') {
            this._generateMenuMusic();
            this.currentTrack = 'menu';
        } else if (this.targetTrack === 'game') {
            this._generateGameMusic();
            this.currentTrack = 'game';
        }
    }


    // --- GENERATORS ---

    _generateMenuMusic() {
        // Menu: Dark, moody, retro drone
        const osc1 = this.ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.value = 55; // Low A

        const filter1 = this.ctx.createBiquadFilter();
        filter1.type = 'lowpass';
        filter1.frequency.value = 400;

        // LFO for filter
        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = 0.1; // Slow
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 200;
        lfo.connect(lfoGain);
        lfoGain.connect(filter1.frequency);

        const gain1 = this.ctx.createGain();
        gain1.gain.value = 0.0; // Start silent for fade in
        gain1.gain.setTargetAtTime(0.15, this.ctx.currentTime, 2); // Fade in

        osc1.connect(filter1);
        filter1.connect(gain1);
        gain1.connect(this.musicGain);

        osc1.start();
        lfo.start();

        this.currentMusicNodes.push(osc1, lfo, gain1, filter1, lfoGain);
    }

    _generateGameMusic() {
        // Game: Drone + Arp Textures
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = 110;

        const mod = this.ctx.createOscillator();
        mod.frequency.value = 220;
        const modGain = this.ctx.createGain();
        modGain.gain.value = 50;

        mod.connect(modGain);
        modGain.connect(osc.frequency);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';

        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = 2;
        const lfoG = this.ctx.createGain();
        lfoG.gain.value = 1000;

        lfo.connect(lfoG);
        lfoG.connect(filter.frequency);

        const mGain = this.ctx.createGain();
        mGain.gain.value = 0.0; // Silent start
        mGain.gain.setTargetAtTime(0.1, this.ctx.currentTime, 1); // Fast fade in

        osc.connect(filter);
        filter.connect(mGain);
        mGain.connect(this.musicGain);

        osc.start();
        mod.start();
        lfo.start();

        this.currentMusicNodes.push(osc, mod, lfo, osc, mGain, filter, lfoG, modGain);
    }

    // --- SFX ---

    playHover() {
        if (!this.ctx || this.isMuted) return;
        this.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.frequency.setValueAtTime(880, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.05);
        osc.type = 'sine';

        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
    }

    playClick() {
        if (!this.ctx || this.isMuted) return;
        this.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(440, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    playCardSlide() {
        if (!this.ctx || this.isMuted) return;
        this.resume();

        const bufferSize = this.ctx.sampleRate * 0.2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, this.ctx.currentTime);
        filter.frequency.linearRampToValueAtTime(2000, this.ctx.currentTime + 0.2);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        noise.start();
    }

    playWin() {
        this._playArp([523.25, 659.25, 783.99, 1046.50]);
    }

    playLose() {
        this._playArp([440, 415.30, 392.00, 370]);
    }

    _playArp(freqs) {
        if (!this.ctx || this.isMuted) return;
        this.resume();

        let now = this.ctx.currentTime;
        freqs.forEach((f, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.frequency.value = f;
            osc.type = 'triangle';

            gain.gain.setValueAtTime(0.1, now + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.3);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.3);
        });
    }
}

export default new SoundManager();
