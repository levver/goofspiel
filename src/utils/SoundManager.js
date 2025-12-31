
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

        // --- KICK (User Pattern: 4s) ---
        if (this.stepCounter % 64 > 11 && this.stepCounter % 4 === 0 && this.stepCounter % 64 < 50) {
            this._playKick(time, 0.2);
        }

        // Play on odd 8th notes to offset the kick/bass interaction
        if (this.stepCounter % 64 < 11 && this.stepCounter % 4 === 0 && this.stepCounter % 64 < 50) {
            this._playGlitchTexture(time);
        }


        // --- MAIN THEME (Jazzy/Blade Runner Structure) ---
        // Consistent 4-bar loop (64 steps)
        // D Phrygian Noir: D, F, G, A, Bb, C, Eb, D
        const loopStep = this.stepCounter % 64;

        if (loopStep === 0) this._playStaccatoVoice(time, 146.83); // D3
        if (loopStep === 1) this._playStaccatoVoice(time, 174.61); // F3
        if (loopStep === 2) this._playStaccatoVoice(time, 196.00); // G3
        if (loopStep === 3) this._playStaccatoVoice(time, 220.00); // A3 (Target)
        if (loopStep === 5) this._playStaccatoVoice(time, 233.08); // Bb3
        if (loopStep === 6) this._playStaccatoVoice(time, 220.00); // A3
        if (loopStep === 7) this._playStaccatoVoice(time, 311.13); // Eb4 (The "Blade Runner" tension note)
        if (loopStep === 8) this._playStaccatoVoice(time, 293.66); // D4
        // Stop
        if (loopStep === 12) this._playStaccatoVoice(time, 196.00); // G3
        if (loopStep === 13) this._playStaccatoVoice(time, 220.00); // A3 (Target)
        if (loopStep === 14) this._playStaccatoVoice(time, 233.08); // Bb3
        if (loopStep === 15) this._playStaccatoVoice(time, 196.00); // G3
        if (loopStep === 16) this._playStaccatoVoice(time, 311.13); // Eb4 (The "Blade Runner" tension note)
        if (loopStep === 17) this._playStaccatoVoice(time, 233.08); // Bb3
        if (loopStep === 18) this._playStaccatoVoice(time, 220.00); // A3 (Target)
        if (loopStep === 19) this._playStaccatoVoice(time, 233.08); // Bb3
        if (loopStep === 20) this._playStaccatoVoice(time, 196.00); // G3
        if (loopStep === 21) this._playStaccatoVoice(time, 220.00); // A3 (Target)
        if (loopStep === 22) this._playStaccatoVoice(time, 233.08); // Bb3
        if (loopStep === 23) this._playStaccatoVoice(time, 196.00); // G3
        if (loopStep === 24) this._playStaccatoVoice(time, 220.00); // A3 (Target)
        if (loopStep === 25) this._playStaccatoVoice(time, 311.13); // Eb4 (The "Blade Runner" tension note)
        if (loopStep === 26) this._playStaccatoVoice(time, 220.00); // A3 (Target)
        if (loopStep === 27) this._playStaccatoVoice(time, 233.08); // Bb3
        if (loopStep === 28) this._playLongNote(time, 220.00, 1); // A3 (Target)
        // Stop
        if (loopStep === 33) this._playStaccatoVoice(time, 146.83); // D3
        if (loopStep === 34) this._playStaccatoVoice(time, 174.61); // F3
        if (loopStep === 35) this._playStaccatoVoice(time, 196.00); // G3
        if (loopStep === 36) this._playStaccatoVoice(time, 220.00); // A3 (Target)
        if (loopStep === 37) this._playStaccatoVoice(time, 233.08); // Bb3
        if (loopStep === 38) this._playStaccatoVoice(time, 220.00); // A3
        if (loopStep === 39) this._playLongNote(time, 311.13, 1); // Eb4 (The "Blade Runner" tension note)
        if (loopStep === 43) this._playLongNote(time, 293.66, 1); // D4
        if (loopStep === 47) this._playLongNote(time, 233.08, 1); // Bb3
        //Stop
        if (loopStep === 51) this._playStaccatoVoice(time, 293.66); // A3
        if (loopStep === 52) this._playStaccatoVoice(time, 146.83); // D3
        if (loopStep === 53) this._playStaccatoVoice(time, 174.61); // F3
        if (loopStep === 54) this._playStaccatoVoice(time, 196.00); // G3
        if (loopStep === 55) this._playStaccatoVoice(time, 220.00); // A3 (Target)
        if (loopStep === 56) this._playStaccatoVoice(time, 311.13); // Eb4 (The "Blade Runner" tension note)
        if (loopStep === 57) this._playStaccatoVoice(time, 293.66); // D4
        if (loopStep === 58) this._playStaccatoVoice(time, 146.83); // D3
        if (loopStep === 59) this._playStaccatoVoice(time, 174.61); // F3
        if (loopStep === 60) this._playStaccatoVoice(time, 196.00); // G3
        if (loopStep === 61) this._playStaccatoVoice(time, 220.00); // A3 (Target)
    }


    // --- INSTRUMENTS ---

    _playKick(time, gainVol) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Softer kick (lower start freq, balanced mix)
        osc.frequency.setValueAtTime(120, time); // Was 180 (Less "clicky")
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.4);
        gain.gain.setValueAtTime(gainVol, time); // Was 0.8 (Much quieter)
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
        filter.Q.value = 1; // Was 5 (Less synthetic/resonant bite)
        filter.frequency.setValueAtTime(freq, time); // Was * 8 (Softer sweep)
        filter.frequency.exponentialRampToValueAtTime(freq * 0.5, time + duration); // Filter sweep down

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.025, time);
        gain.gain.linearRampToValueAtTime(0.5, time + duration); // Plucky envelope

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        osc.start(time);
        osc.stop(time + duration);
    }

    _playLongNote(time, freq, beats) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        const startCutoff = 200 + Math.random() * 200; // Slight organic variation
        const endCutoff = 1500 + Math.random() * 500;
        filter.frequency.setValueAtTime(startCutoff, time);
        filter.frequency.exponentialRampToValueAtTime(endCutoff, time + beats);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.15, time + 0.05); // Fast attack (Staccato)
        gain.gain.linearRampToValueAtTime(0, time + beats); // decay

        osc.connect(filter);
        osc.start(time);
        osc.stop(time + beats);
        filter.connect(gain);
        gain.connect(this.musicGain);
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


    // --- SFX ---

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

    // Round Win - Hard esports-style impact stinger
    playWin() {
        if (!this.ctx || this.isMuted) return;
        this.resume();
        const now = this.ctx.currentTime;

        // Impact transient - punchy low hit
        const impact = this.ctx.createOscillator();
        impact.type = 'sine';
        impact.frequency.setValueAtTime(150, now);
        impact.frequency.exponentialRampToValueAtTime(50, now + 0.15);

        const impactGain = this.ctx.createGain();
        impactGain.gain.setValueAtTime(0.35, now);
        impactGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        impact.connect(impactGain);
        impactGain.connect(this.sfxGain);
        impact.start(now);
        impact.stop(now + 0.2);

        // Rising power chord - D5 power chord with distortion feel
        const chord = [293.66, 440.00, 587.33]; // D4, A4, D5 (power chord)
        chord.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.value = freq;

            // Aggressive filter sweep up
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.Q.value = 3;
            filter.frequency.setValueAtTime(500, now + 0.05);
            filter.frequency.exponentialRampToValueAtTime(4000, now + 0.15);
            filter.frequency.exponentialRampToValueAtTime(1500, now + 0.35);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0, now + 0.05);
            gain.gain.linearRampToValueAtTime(0.08, now + 0.1);
            gain.gain.linearRampToValueAtTime(0.06, now + 0.25);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now + 0.05);
            osc.stop(now + 0.45);
        });

        // High shimmer accent
        const shimmer = this.ctx.createOscillator();
        shimmer.type = 'sine';
        shimmer.frequency.value = 1174.66; // D6
        const shimmerGain = this.ctx.createGain();
        shimmerGain.gain.setValueAtTime(0, now + 0.1);
        shimmerGain.gain.linearRampToValueAtTime(0.05, now + 0.15);
        shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        shimmer.connect(shimmerGain);
        shimmerGain.connect(this.sfxGain);
        shimmer.start(now + 0.1);
        shimmer.stop(now + 0.35);
    }

    // Round Lose - Dark esports-style negative stinger
    playLose() {
        if (!this.ctx || this.isMuted) return;
        this.resume();
        const now = this.ctx.currentTime;

        // Low thud impact
        const thud = this.ctx.createOscillator();
        thud.type = 'sine';
        thud.frequency.setValueAtTime(80, now);
        thud.frequency.exponentialRampToValueAtTime(30, now + 0.25);

        const thudGain = this.ctx.createGain();
        thudGain.gain.setValueAtTime(0.3, now);
        thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        thud.connect(thudGain);
        thudGain.connect(this.sfxGain);
        thud.start(now);
        thud.stop(now + 0.3);

        // Descending dissonant cluster
        const cluster = [311.13, 293.66, 277.18]; // Eb4, D4, C#4 (minor 2nd dissonance)
        cluster.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq * 1.02, now + 0.02);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.7, now + 0.35);

            // Filter closing down (darkening)
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.Q.value = 2;
            filter.frequency.setValueAtTime(2000, now + 0.02);
            filter.frequency.exponentialRampToValueAtTime(200, now + 0.35);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0, now + 0.02);
            gain.gain.linearRampToValueAtTime(0.06, now + 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now + 0.02);
            osc.stop(now + 0.45);
        });

        // Noise burst for harshness
        const bufferSize = this.ctx.sampleRate * 0.1;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 800;
        noiseFilter.Q.value = 1;

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.08, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);
        noise.start(now);
    }

    // Game Win Music - Triumphant D Phrygian fanfare
    playGameWin() {
        if (!this.ctx || this.isMuted) return;
        this.resume();
        const now = this.ctx.currentTime;

        // Melodic fanfare: D3 -> A3 -> D4 -> Eb4 (tension) -> D4 (resolve) with long sustain
        const melody = [
            { freq: 146.83, time: 0, dur: 0.3 },      // D3
            { freq: 220.00, time: 0.25, dur: 0.3 },   // A3
            { freq: 293.66, time: 0.5, dur: 0.4 },    // D4
            { freq: 311.13, time: 0.85, dur: 0.2 },   // Eb4 (Blade Runner tension)
            { freq: 293.66, time: 1.0, dur: 0.8 },    // D4 (resolve)
        ];

        melody.forEach(note => {
            const osc = this.ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.value = note.freq;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(400, now + note.time);
            filter.frequency.exponentialRampToValueAtTime(2000, now + note.time + note.dur * 0.5);
            filter.frequency.exponentialRampToValueAtTime(800, now + note.time + note.dur);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0, now + note.time);
            gain.gain.linearRampToValueAtTime(0.15, now + note.time + 0.05);
            gain.gain.linearRampToValueAtTime(0.1, now + note.time + note.dur * 0.7);
            gain.gain.exponentialRampToValueAtTime(0.001, now + note.time + note.dur);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now + note.time);
            osc.stop(now + note.time + note.dur + 0.1);
        });

        // Add bass drone for depth
        const bass = this.ctx.createOscillator();
        bass.type = 'triangle';
        bass.frequency.value = 73.42; // D2
        const bassGain = this.ctx.createGain();
        bassGain.gain.setValueAtTime(0, now);
        bassGain.gain.linearRampToValueAtTime(0.2, now + 0.1);
        bassGain.gain.linearRampToValueAtTime(0.15, now + 1.5);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
        bass.connect(bassGain);
        bassGain.connect(this.sfxGain);
        bass.start(now);
        bass.stop(now + 2.0);
    }

    // Game Lose Music - Descending D Phrygian lament
    playGameLose() {
        if (!this.ctx || this.isMuted) return;
        this.resume();
        const now = this.ctx.currentTime;

        // Descending somber melody with slower tempo
        const melody = [
            { freq: 293.66, time: 0, dur: 0.4 },      // D4
            { freq: 261.63, time: 0.35, dur: 0.3 },   // C4
            { freq: 233.08, time: 0.65, dur: 0.35 },  // Bb3
            { freq: 196.00, time: 1.0, dur: 0.4 },    // G3
            { freq: 174.61, time: 1.35, dur: 0.5 },   // F3
            { freq: 146.83, time: 1.8, dur: 0.8 },    // D3 (final)
        ];

        melody.forEach(note => {
            const osc = this.ctx.createOscillator();
            osc.type = 'sine'; // Softer tone for sadness
            osc.frequency.value = note.freq;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1200, now + note.time);
            filter.frequency.exponentialRampToValueAtTime(400, now + note.time + note.dur);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0, now + note.time);
            gain.gain.linearRampToValueAtTime(0.1, now + note.time + 0.05);
            gain.gain.linearRampToValueAtTime(0.06, now + note.time + note.dur * 0.6);
            gain.gain.exponentialRampToValueAtTime(0.001, now + note.time + note.dur);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now + note.time);
            osc.stop(now + note.time + note.dur + 0.1);
        });

        // Low rumble undertone
        const bass = this.ctx.createOscillator();
        bass.type = 'triangle';
        bass.frequency.value = 73.42; // D2
        bass.frequency.exponentialRampToValueAtTime(55, now + 2.5); // Drop down
        const bassGain = this.ctx.createGain();
        bassGain.gain.setValueAtTime(0, now);
        bassGain.gain.linearRampToValueAtTime(0.15, now + 0.2);
        bassGain.gain.linearRampToValueAtTime(0.08, now + 2.0);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 2.8);
        bass.connect(bassGain);
        bassGain.connect(this.sfxGain);
        bass.start(now);
        bass.stop(now + 2.8);
    }

    // Tie Sound - Tension building + loud snap (synced to 1500ms animation)
    playTie() {
        if (!this.ctx || this.isMuted) return;
        this.resume();
        const now = this.ctx.currentTime;

        // Phase 1: Tension building (0-1200ms) - Rising pitch and filter with dissonance
        const tensionOsc1 = this.ctx.createOscillator();
        const tensionOsc2 = this.ctx.createOscillator();
        tensionOsc1.type = 'sawtooth';
        tensionOsc2.type = 'sawtooth';

        // Start at Eb4 (tension note from theme) and rise with dissonance
        tensionOsc1.frequency.setValueAtTime(311.13, now); // Eb4
        tensionOsc1.frequency.exponentialRampToValueAtTime(466.16, now + 1.2); // Rise to Bb4
        tensionOsc2.frequency.setValueAtTime(329.63, now); // E4 (dissonant with Eb)
        tensionOsc2.frequency.exponentialRampToValueAtTime(493.88, now + 1.2); // Rise to B4 (max tension)

        const tensionFilter = this.ctx.createBiquadFilter();
        tensionFilter.type = 'lowpass';
        tensionFilter.Q.value = 5; // Resonance for intensity
        tensionFilter.frequency.setValueAtTime(200, now);
        tensionFilter.frequency.exponentialRampToValueAtTime(4000, now + 1.2);

        const tensionGain = this.ctx.createGain();
        tensionGain.gain.setValueAtTime(0, now);
        tensionGain.gain.linearRampToValueAtTime(0.08, now + 0.1);
        tensionGain.gain.linearRampToValueAtTime(0.15, now + 1.1);
        tensionGain.gain.linearRampToValueAtTime(0, now + 1.25); // Quick fade before snap

        tensionOsc1.connect(tensionFilter);
        tensionOsc2.connect(tensionFilter);
        tensionFilter.connect(tensionGain);
        tensionGain.connect(this.sfxGain);

        tensionOsc1.start(now);
        tensionOsc2.start(now);
        tensionOsc1.stop(now + 1.25);
        tensionOsc2.stop(now + 1.25);

        // Phase 2: Loud Snap (at 1200ms, lasting ~300ms)
        const snapTime = now + 1.2;

        // Noise burst for snap impact
        const bufferSize = this.ctx.sampleRate * 0.15;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 2000;
        noiseFilter.Q.value = 1;

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.4, snapTime); // Loud!
        noiseGain.gain.exponentialRampToValueAtTime(0.001, snapTime + 0.15);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);
        noise.start(snapTime);

        // Impact tone
        const impactOsc = this.ctx.createOscillator();
        impactOsc.type = 'square';
        impactOsc.frequency.setValueAtTime(150, snapTime);
        impactOsc.frequency.exponentialRampToValueAtTime(40, snapTime + 0.2);

        const impactGain = this.ctx.createGain();
        impactGain.gain.setValueAtTime(0.25, snapTime);
        impactGain.gain.exponentialRampToValueAtTime(0.001, snapTime + 0.3);

        impactOsc.connect(impactGain);
        impactGain.connect(this.sfxGain);
        impactOsc.start(snapTime);
        impactOsc.stop(snapTime + 0.3);
    }

    // Separator Break Sound - Glass/crystal shattering effect
    playSeparatorBreak() {
        if (!this.ctx || this.isMuted) return;
        this.resume();
        const now = this.ctx.currentTime;

        // High metallic crack
        const crack = this.ctx.createOscillator();
        crack.type = 'square';
        crack.frequency.setValueAtTime(4000, now);
        crack.frequency.exponentialRampToValueAtTime(800, now + 0.08);

        const crackGain = this.ctx.createGain();
        crackGain.gain.setValueAtTime(0.2, now);
        crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        crack.connect(crackGain);
        crackGain.connect(this.sfxGain);
        crack.start(now);
        crack.stop(now + 0.1);

        // Shimmer debris (multiple high freq oscillators)
        for (let i = 0; i < 5; i++) {
            const debris = this.ctx.createOscillator();
            debris.type = 'sine';
            const baseFreq = 2000 + Math.random() * 3000;
            debris.frequency.setValueAtTime(baseFreq, now + 0.02 * i);
            debris.frequency.exponentialRampToValueAtTime(baseFreq * 0.3, now + 0.3 + 0.05 * i);

            const debrisGain = this.ctx.createGain();
            debrisGain.gain.setValueAtTime(0.06, now + 0.02 * i);
            debrisGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3 + 0.1 * i);

            debris.connect(debrisGain);
            debrisGain.connect(this.sfxGain);
            debris.start(now + 0.02 * i);
            debris.stop(now + 0.4 + 0.1 * i);
        }

        // Low thud for impact weight
        const thud = this.ctx.createOscillator();
        thud.type = 'triangle';
        thud.frequency.setValueAtTime(100, now);
        thud.frequency.exponentialRampToValueAtTime(30, now + 0.15);

        const thudGain = this.ctx.createGain();
        thudGain.gain.setValueAtTime(0.15, now);
        thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        thud.connect(thudGain);
        thudGain.connect(this.sfxGain);
        thud.start(now);
        thud.stop(now + 0.2);
    }

    // Legacy arp function (kept for compatibility)
    _playArp(freqs) {
        if (!this.ctx || this.isMuted) return;
        this.resume();
        let now = this.ctx.currentTime;
        freqs.forEach((f, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.frequency.value = f;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.1, now + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.3);
            osc.connect(gain); gain.connect(this.sfxGain);
            osc.start(now + i * 0.1); osc.stop(now + i * 0.1 + 0.3);
        });
    }
}

export default new SoundManager();
