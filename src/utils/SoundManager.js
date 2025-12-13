
class SoundManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;

        this.isMuted = false;
        this.initialized = false;

        // State State
        this.targetTrack = null;
        this.currentTrack = null;
        this.currentNodes = []; // For drone/menu

        // Scheduler State
        this.isPlaying = false;
        this.nextNoteTime = 0.0;
        this.current16thNote = 0;
        this.tempo = 110.0;
        this.lookahead = 25.0; // ms
        this.scheduleAheadTime = 0.1; // s
        this.timerID = null;
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
            this.musicGain.gain.value = 0.4;
            this.musicGain.connect(this.masterGain);

            // SFX Bus
            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.value = 0.4;
            this.sfxGain.connect(this.masterGain);

            this.initialized = true;
            console.log("SoundManager initialized");

            this._updateMusicState();
        } catch (e) {
            console.error("Web Audio API not supported", e);
        }
    }

    async resume() {
        if (!this.ctx) this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }
        this._updateMusicState();
    }

    mute(mute) {
        this.isMuted = mute;
        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(mute ? 0 : 0.5, this.ctx.currentTime, 0.1);
        }
    }

    // --- TRACK MANAGEMENT ---

    stopMusic() {
        this.targetTrack = null;
        this._updateMusicState();
    }

    startMenuMusic() {
        if (this.targetTrack === 'menu') return;
        this.targetTrack = 'menu';
        this._updateMusicState();
    }

    startGameMusic() {
        if (this.targetTrack === 'game') return;
        this.targetTrack = 'game';
        this._updateMusicState();
    }

    _updateMusicState() {
        if (!this.ctx || this.isMuted) return;
        if (this.ctx.state === 'suspended') return;
        if (this.currentTrack === this.targetTrack) return;

        console.log(`[SoundManager] Switching: ${this.currentTrack} -> ${this.targetTrack}`);

        // Stop Everything
        this._stopScheduler();
        this._stopDrone();

        this.currentTrack = null;

        // Start New
        if (this.targetTrack === 'menu') {
            this._playMenuDrone();
            this.currentTrack = 'menu';
        } else if (this.targetTrack === 'game') {
            this._startScheduler();
            this.currentTrack = 'game';
        }
    }

    // --- SCHEDULER (Core Engine) ---

    _startScheduler() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.current16thNote = 0;
        this.nextNoteTime = this.ctx.currentTime + 0.1;
        this._scheduler();
    }

    _stopScheduler() {
        this.isPlaying = false;
        if (this.timerID) clearTimeout(this.timerID);
    }

    _scheduler() {
        // While there are notes that will need to play before the next interval, 
        // schedule them and advance the pointer.
        while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
            this._scheduleNote(this.current16thNote, this.nextNoteTime);
            this._nextNote();
        }

        if (this.isPlaying) {
            this.timerID = setTimeout(() => this._scheduler(), this.lookahead);
        }
    }

    _nextNote() {
        const secondsPerBeat = 60.0 / this.tempo;
        this.nextNoteTime += 0.25 * secondsPerBeat; // Add quarter note duration... wait 16th note?
        // Actually, for 16th notes: 1 beat = 4 16th notes.
        // so 0.25 * beatDuration

        this.current16thNote++;
        if (this.current16thNote === 16) {
            this.current16thNote = 0;
        }
    }

    _scheduleNote(beatNumber, time) {
        // beatNumber is 0..15 (one bar of 16th notes)

        // --- 1. KICK (Four on the floor) ---
        if (beatNumber % 4 === 0) {
            this._playKick(time);
        }

        // --- 2. HI-HAT (Off-beats) ---
        if (beatNumber % 4 === 2) {
            this._playHiHat(time, true); // Open ish
        } else {
            this._playHiHat(time, false); // Closed tick
        }

        // --- 3. BASS (Driving 8ths) ---
        // E2, E2, G2, A2 pattern
        if (beatNumber % 2 === 0) {
            const note = (beatNumber < 8) ? 82.41 : (beatNumber < 12 ? 98.00 : 110.00);
            this._playBass(time, note, 0.1);
        }

        // --- 4. ARP / LEAD (Syncopated) ---
        // 3-3-2 Clave ish feel or random sprinkles
        const arpPattern = [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0];
        if (arpPattern[beatNumber]) {
            // Pentatonic: E G A B D
            const scale = [329.63, 392.00, 440.00, 493.88, 587.33];
            const pitch = scale[Math.floor(Math.random() * scale.length)];
            this._playArpTone(time, pitch);
        }
    }


    // --- INSTRUMENTS ---

    _playKick(time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
        gain.gain.setValueAtTime(0.8, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

        osc.connect(gain);
        gain.connect(this.musicGain);

        osc.start(time);
        osc.stop(time + 0.5);
    }

    _playHiHat(time, isOpen) {
        // White Noise
        const bufferSize = this.ctx.sampleRate * 0.1;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 5000;

        const gain = this.ctx.createGain();
        const decay = isOpen ? 0.1 : 0.03;
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + decay);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        noise.start(time);
    }

    _playBass(time, freq, duration) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(freq * 4, time);
        filter.frequency.exponentialRampToValueAtTime(freq, time + duration);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.4, time);
        gain.gain.linearRampToValueAtTime(0, time + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        osc.start(time);
        osc.stop(time + duration);
    }

    _playArpTone(time, freq) {
        // FM Bell-ish
        const carrier = this.ctx.createOscillator();
        const modulator = this.ctx.createOscillator();
        const modGain = this.ctx.createGain();

        const vol = this.ctx.createGain();

        carrier.frequency.value = freq;
        modulator.frequency.value = freq * 2; // Ratio 1:2
        modGain.gain.value = 500;

        modulator.connect(modGain);
        modGain.connect(carrier.frequency);

        carrier.connect(vol);
        vol.connect(this.musicGain);

        vol.gain.setValueAtTime(0.1, time);
        vol.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

        carrier.start(time);
        modulator.start(time);
        carrier.stop(time + 0.3);
        modulator.stop(time + 0.3);
    }


    // --- MENU AMBIENCE ---

    _playMenuDrone() {
        // 1. Deep Bass Drone
        const bass = this._createOsc('triangle', 36.71, 0); // Low D
        const bassGain = this.ctx.createGain();
        bassGain.gain.value = 0.2;
        bass.connect(bassGain);
        bassGain.connect(this.musicGain);

        // 2. Swelling Pad
        const pad1 = this._createOsc('sawtooth', 146.83, 10); // D3 detuned
        const pad2 = this._createOsc('sawtooth', 147.83, -10); // D3 detuned

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;

        // LFO for filter breath
        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = 0.05; // Very Slow
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 300;

        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);

        const padGain = this.ctx.createGain();
        padGain.gain.value = 0.05;

        pad1.connect(filter);
        pad2.connect(filter);
        filter.connect(padGain);
        padGain.connect(this.musicGain);

        // 3. "Data Rain" Random Textures
        // We can simulate this with a filtered noise node getting random gain spikes
        // But for simplicity/CPU, let's just stick to the rich drones for now
        // Maybe add a high panned sine blip occasionally?

        const start = (node) => node.start();
        [bass, pad1, pad2, lfo].forEach(start);

        this.currentNodes = [bass, pad1, pad2, lfo, bassGain, padGain, filter, lfoGain];
    }

    _stopDrone() {
        this.currentNodes.forEach(n => {
            try { n.stop(); n.disconnect(); } catch (e) { }
        });
        this.currentNodes = [];
    }

    _createOsc(type, freq, detune = 0) {
        const o = this.ctx.createOscillator();
        o.type = type;
        o.frequency.value = freq;
        o.detune.value = detune;
        return o;
    }


    // --- SFX (Unchanged) ---
    playHover() {
        if (!this.ctx || this.isMuted) return;
        this.resume();
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.frequency.setValueAtTime(880, t);
        osc.frequency.exponentialRampToValueAtTime(1200, t + 0.05);
        g.gain.setValueAtTime(0.05, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        osc.connect(g); g.connect(this.sfxGain);
        osc.start(t); osc.stop(t + 0.05);
    }

    playClick() {
        if (!this.ctx || this.isMuted) return;
        this.resume();
        const t = this.ctx.currentTime;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'square';
        o.frequency.setValueAtTime(440, t);
        o.frequency.exponentialRampToValueAtTime(880, t + 0.1);
        g.gain.setValueAtTime(0.05, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        o.connect(g); g.connect(this.sfxGain);
        o.start(t); o.stop(t + 0.1);
    }

    playCardSlide() {
        if (!this.ctx || this.isMuted) return;
        this.resume();
        const bs = this.ctx.createBufferSource();
        const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.2, this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        bs.buffer = buf;
        const f = this.ctx.createBiquadFilter();
        f.frequency.setValueAtTime(400, this.ctx.currentTime);
        f.frequency.linearRampToValueAtTime(2000, this.ctx.currentTime + 0.2);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.1, this.ctx.currentTime);
        g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);
        bs.connect(f); f.connect(g); g.connect(this.sfxGain);
        bs.start();
    }

    playWin() { this._playArp([523.25, 659.25, 783.99, 1046.50]); }
    playLose() { this._playArp([440, 415.30, 392.00, 370]); }

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
            osc.connect(gain); gain.connect(this.sfxGain);
            osc.start(now + i * 0.1); osc.stop(now + i * 0.1 + 0.3);
        });
    }
}

export default new SoundManager();
