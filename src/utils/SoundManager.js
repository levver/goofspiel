
class SoundManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.currentMusicNodes = [];
        this.isMuted = false;
        this.initialized = false;
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
        } catch (e) {
            console.error("Web Audio API not supported", e);
        }
    }

    // Helper to ensure context is running (browser policy)
    async resume() {
        if (!this.ctx) this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }
    }

    mute(mute) {
        this.isMuted = mute;
        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(mute ? 0 : 0.5, this.ctx.currentTime, 0.1);
        }
    }

    stopMusic() {
        this.currentMusicNodes.forEach(node => {
            try {
                node.stop();
                node.disconnect();
            } catch (e) { /* ignore */ }
        });
        this.currentMusicNodes = [];
    }

    // --- PROCEDURAL GENERATORS ---

    // 1. Hover: High pitch blip
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

    // 2. Click/Action: Retro "Select" sound
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

    // 3. Card Animation: Whoosh/Slide
    playCardSlide() {
        if (!this.ctx || this.isMuted) return;
        this.resume();

        // White noise buffer
        const bufferSize = this.ctx.sampleRate * 0.2; // 0.2s
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
        this._playArp([523.25, 659.25, 783.99, 1046.50]); // C Major
    }

    playLose() {
        this._playArp([440, 415.30, 392.00, 370]); // Descending chromatic ish
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

    // --- MUSIC GENERATORS ---

    // Menu: Dark, moody, retro drone
    startMenuMusic() {
        if (!this.ctx || this.isMuted) return;

        // Don't restart if already playing something? No, we need to switch tracks.
        // Usually we'd track "currentTrack" but since we generate, we just stop and start.
        this.stopMusic();
        this.resume();

        // Drone Oscillator 1
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
        lfoGain.gain.value = 200; // Modulate filter by +/- 200Hz
        lfo.connect(lfoGain);
        lfoGain.connect(filter1.frequency);

        const gain1 = this.ctx.createGain();
        gain1.gain.value = 0.15;

        osc1.connect(filter1);
        filter1.connect(gain1);
        gain1.connect(this.musicGain);

        osc1.start();
        lfo.start();

        this.currentMusicNodes.push(osc1, lfo, gain1, filter1, lfoGain);
    }

    // Game: Faster, more energetic arp sequence
    startGameMusic() {
        if (!this.ctx || this.isMuted) return;
        this.stopMusic();
        this.resume();

        // 1. Bass Pulse
        const bass = this.ctx.createOscillator();
        bass.type = 'square';
        bass.frequency.value = 110;

        const bassGain = this.ctx.createGain();
        bassGain.gain.value = 0.1;

        // Pulse LFO (Tremolo effective)
        const pulse = this.ctx.createOscillator();
        pulse.type = 'square';
        pulse.frequency.value = 4; // 240 BPM eighth notesish
        const pulseGain = this.ctx.createGain();
        pulseGain.gain.value = 1; // Full depth

        // This is a bit tricky in pure Web Audio without nodes graph, 
        // simpler to just have a loop.

        // Let's do a simple interval based loop for a sequence
        // Store interval ID to clear later

        // Actually, let's just make a simple textured drone with a higher arpeggiator "illusion" 
        // using FM synthesis (easier than scheduling).

        // Carrier
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = 110;

        // Modulator (Creates 'energetic' timbre)
        const mod = this.ctx.createOscillator();
        mod.frequency.value = 220; // Octave up
        const modGain = this.ctx.createGain();
        modGain.gain.value = 50;

        mod.connect(modGain);
        modGain.connect(osc.frequency);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';

        // Auto-wah LFO
        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = 2; // Energetic pulse
        const lfoG = this.ctx.createGain();
        lfoG.gain.value = 1000;

        lfo.connect(lfoG);
        lfoG.connect(filter.frequency);

        const mGain = this.ctx.createGain();
        mGain.gain.value = 0.1;

        osc.connect(filter);
        filter.connect(mGain);
        mGain.connect(this.musicGain);

        osc.start();
        mod.start();
        lfo.start();

        this.currentMusicNodes.push(osc, mod, lfo, osc, mGain, filter, lfoG, modGain);
    }
}

export default new SoundManager();
