
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
        this.tempo = 160.0; // Increased energy
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
            this.sfxGain.gain.value = 0.8; // Boosted for clarity
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

        // console.log(`[SoundManager] Switching: ${this.currentTrack} -> ${this.targetTrack}`); // Removed this line

        // Stop Everything
        this._stopScheduler();
        this._stopDrone();

        this.currentTrack = null;

        // Start New
        if (this.targetTrack === 'menu') {
            this._playMenuDrone(1.0);
            this.currentTrack = 'menu';
        } else if (this.targetTrack === 'game') {
            // "Play off the menu music" -> Base layer is the drone (Half volume)
            this._playMenuDrone(0.5);
            this._startScheduler();
            this.currentTrack = 'game';
        }
    }

    // --- SCHEDULER (Core Engine) ---

    _startScheduler() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.current16thNote = 0;
        this.stepCounter = 0; // consistent counter for longer loops
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
        this.stepCounter++;
        if (this.current16thNote === 16) {
            this.current16thNote = 0;
        }
    }

    _scheduleNote(beatNumber, time) {
        // beatNumber is 0..15 (one bar of 16th notes)

        // --- 1. KICK (User Pattern: Poly 7s) ---
        if (this.stepCounter % 7 === 0) {
            this._playKick(time);
        }

        // --- 2. BASS (User Pattern: Poly 3s, Darker Tone) ---
        // D Phrygian Bass: D Eb F G A Bb C
        // Root (D) -> Flat 2nd (Eb) for tension
        if (this.stepCounter % 7 === 2) {
            // Trigger root D or Eb for tension (Shifted down 2 semitones from E/F)
            const note = (beatNumber < 8) ? 73.42 : 77.78; // D2 vs Eb2
            this._playBass(time, note, 0.15); // Slightly longer sustain
        }

        // --- 3. SUSPENSE ATMOSPHERE (Randomized Arpeggios) ---
        // if (this.stepCounter % 48 === 0) {
        //     this._playRandomAtmosphere(time);
        // }

        // --- 4. MAIN THEME (Jazzy/Blade Runner Structure) ---
        // Consistent 4-bar loop (64 steps)
        // D Phrygian Noir: D, F, G, A, Bb, C, Eb, D
        const loopStep = this.stepCounter % 48;

        // Melody Map: { step: frequency }
        // Syncopated, sparse phrasing
        if (loopStep === 0) this._playStaccatoVoice(time, 146.83); // D3
        if (loopStep === 6) this._playStaccatoVoice(time, 174.61); // F3
        if (loopStep === 9) this._playStaccatoVoice(time, 196.00); // G3
        if (loopStep === 12) this._playStaccatoVoice(time, 220.00); // A3 (Target)

        if (loopStep === 16) this._playStaccatoVoice(time, 233.08); // Bb3
        if (loopStep === 22) this._playStaccatoVoice(time, 220.00); // A3
        if (loopStep === 26) this._playStaccatoVoice(time, 311.13); // Eb4 (The "Blade Runner" tension note)
        if (loopStep === 39) this._playStaccatoVoice(time, 293.66); // D4

        // --- 5. NEW TEXTURE: Glitch Shimmer (High Freq Texture) ---
        // Play on odd 8th notes to offset the kick/bass interaction
        if (beatNumber % 7 === 1) {
            this._playGlitchTexture(time);
        }
    }


    // --- INSTRUMENTS ---

    _playKick(time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Softer kick (lower start freq, balanced mix)
        osc.frequency.setValueAtTime(120, time); // Was 180 (Less "clicky")
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.4);
        gain.gain.setValueAtTime(0.4, time); // Was 0.8 (Much quieter)
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.4);

        osc.connect(gain);
        gain.connect(this.musicGain);

        osc.start(time);
        osc.stop(time + 0.4);
    }

    _playGlitchTexture(time) {
        // High passed noise burst
        const bufferSize = this.ctx.sampleRate * 0.05; // Short
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 5000 + Math.random() * 2000; // Random high freq

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.05, time); // Subtle background layer
        gain.gain.linearRampToValueAtTime(0, time + 0.05);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        noise.start(time);
    }

    // Reuse synth logic for both Random Atmpsphere and Main Theme
    _playStaccatoVoice(time, freq) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        const startCutoff = 200 + Math.random() * 200; // Slight organic variation
        const endCutoff = 1500 + Math.random() * 500;
        filter.frequency.setValueAtTime(startCutoff, time);
        filter.frequency.exponentialRampToValueAtTime(endCutoff, time + 1.0);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.15, time + 0.05); // Fast attack (Staccato)
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3); // Short decay

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        osc.start(time);
        osc.stop(time + 0.35);
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
        // Sharper, higher metallic hat
        filter.type = 'highpass';
        filter.frequency.value = 7000;

        const gain = this.ctx.createGain();
        const decay = isOpen ? 0.08 : 0.02; // Very tight
        gain.gain.setValueAtTime(0.25, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + decay);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        noise.start(time);
    }

    _playBass(time, freq, duration) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth'; // Aggressive saw
        osc.frequency.value = freq;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.value = 2; // Was 5 (Less synthetic/resonant bite)
        filter.frequency.setValueAtTime(freq * 4, time); // Was * 8 (Softer sweep)
        filter.frequency.exponentialRampToValueAtTime(freq, time + duration); // Filter sweep down

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.5, time);
        gain.gain.linearRampToValueAtTime(0, time + duration); // Plucky envelope

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        osc.start(time);
        osc.stop(time + duration);
    }

    _playRandomAtmosphere(time) {
        // D Phrygian Scale
        const scale = [73.42, 77.78, 87.31, 98.00, 110.00, 116.54, 130.81, 146.83];

        const noteCount = 3 + Math.floor(Math.random() * 3);
        const selectedFreqs = [];
        for (let i = 0; i < noteCount; i++) {
            selectedFreqs.push(scale[Math.floor(Math.random() * scale.length)]);
        }

        let currentOffset = 0;
        selectedFreqs.forEach((f) => {
            // "Space staccato notes closer together"
            const spacing = 0.1 + Math.random() * 0.15; // Tight bursts
            currentOffset += spacing;
            this._playStaccatoVoice(time + currentOffset, f);
        });
    }

    _playArpTone(time, freq) {
        // FM Metallic Pluck
        const carrier = this.ctx.createOscillator();
        const modulator = this.ctx.createOscillator();
        const modGain = this.ctx.createGain();

        const vol = this.ctx.createGain();

        carrier.type = 'triangle';
        carrier.frequency.value = freq;
        modulator.frequency.value = freq * 2.5; // Dissonant ratio for 'fight' vibe
        modGain.gain.value = 800; // High modulation index

        modulator.connect(modGain);
        modGain.connect(carrier.frequency);

        carrier.connect(vol);
        vol.connect(this.musicGain);

        vol.gain.setValueAtTime(0.12, time);
        vol.gain.exponentialRampToValueAtTime(0.001, time + 0.2); // Short, plucky

        carrier.start(time);
        modulator.start(time);
        carrier.stop(time + 0.2);
        modulator.stop(time + 0.2);
    }


    // --- MENU AMBIENCE ---

    _playMenuDrone(volumeScale = 1.0) {
        // Shared LFO for "Breathing" / Syncing
        const breathLfo = this.ctx.createOscillator();
        breathLfo.frequency.value = 0.1; // Slow breath
        breathLfo.start();

        // 1. Deep Bass Drone (Triangle)
        // "Lows of the triangle synced to highs of the sine"
        const bass = this._createOsc('triangle', 32.70, 0); // Low C
        const bassGain = this.ctx.createGain();
        bassGain.gain.value = 0.2 * volumeScale; // Base volume modulated by scale

        // Modulate Bass Gain: breathe +/- 0.1 (scaled)
        // LFO (0.15Hz) -> bassAmpMod -> bassGain.gain
        const bassAmpMod = this.ctx.createGain();
        bassAmpMod.gain.value = 0.1 * volumeScale;
        breathLfo.connect(bassAmpMod);
        bassAmpMod.connect(bassGain.gain);

        bass.connect(bassGain);
        bassGain.connect(this.musicGain);

        // 2. Swelling Pad (Unchanged, but maybe sync LFO?)
        const pad1 = this._createOsc('sawtooth', 130.81, 10);
        const pad2 = this._createOsc('sawtooth', 131.81, -10);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 300;

        // Filter LFO
        const filterLfo = this.ctx.createOscillator();
        filterLfo.frequency.value = 0.05;
        const filterLfoGain = this.ctx.createGain();
        filterLfoGain.gain.value = 300;

        filterLfo.connect(filterLfoGain);
        filterLfoGain.connect(filter.frequency);

        const padGain = this.ctx.createGain();
        padGain.gain.value = 0.05 * volumeScale;

        pad1.connect(filter);
        pad2.connect(filter);
        filter.connect(padGain);
        padGain.connect(this.musicGain);

        // 3. "Bird Echo" Sine Wave
        // "Octave higher" (relative to bass range context, likely high register for 'bird')
        // "Quieter, less distorted"
        // "Highs of sine synced to lows of triangle" -> Inverse modulation
        const birdSine = this._createOsc('sine', 349.23, 0); // High C6 (Bird range)
        const birdGain = this.ctx.createGain();
        birdGain.gain.value = 0.02 * volumeScale; // Base volume (Quiet)

        // Modulate Bird Gain: Inverse of Bass
        const birdAmpMod = this.ctx.createGain();
        birdAmpMod.gain.value = -0.02 * volumeScale;

        breathLfo.connect(birdAmpMod);
        birdAmpMod.connect(birdGain.gain);

        // Bird Pitch Modulation (Warble) - Fix "dog whistle" monotone
        const birdLfo = this.ctx.createOscillator();
        birdLfo.frequency.value = 4.0; // Fast-ish vibrato
        const birdLfoGain = this.ctx.createGain();
        birdLfoGain.gain.value = 15; // +/- 15Hz

        birdLfo.connect(birdLfoGain);
        birdLfoGain.connect(birdSine.frequency);

        birdSine.connect(birdGain);
        birdGain.connect(this.musicGain);

        // Start all
        // Fix: Removed breathLfo from here because it was already started at the top
        const nodes = [bass, pad1, pad2, filterLfo, birdSine, birdLfo];
        nodes.forEach(n => n.start());

        // Track nodes for cleanup
        this.currentNodes = [
            bass, pad1, pad2, filterLfo, birdSine, breathLfo, birdLfo,
            bassGain, padGain, filter, filterLfoGain, birdGain,
            bassAmpMod, birdAmpMod, birdLfoGain
        ];
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

    playWin() { this._playArp([466.16, 587.33, 698.46, 932.33]); } // Bb Major
    playLose() { this._playArp([392.00, 370.00, 349.23, 329.63]); } // G Descending

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
