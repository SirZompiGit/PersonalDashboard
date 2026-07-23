/**
 * Audio Synthesis Utility for Fantasia Campaign Master Dashboard
 * Uses the Web Audio API to dynamically generate retro-modern Fantasia sound effects.
 * 
 * Includes:
 * - Dice Roll (realistic rolling clatters)
 * - Critical Success (majestic magic chimes & sparkles)
 * - Critical Failure (deep cinematic thud & down-sweep)
 * - HP Damage (crisp hit impacts)
 * - HP Healing (warm celestial ascending sweeps)
 */

let audioCtx: AudioContext | null = null;
let isMuted = false;

if (typeof window !== 'undefined') {
  try {
    isMuted = localStorage.getItem('fantasia_muted') === 'true';
    window.addEventListener('storage', (e) => {
      if (e.key === 'fantasia_muted') {
        isMuted = e.newValue === 'true';
      }
    });
  } catch (e) {
    console.warn('localStorage not accessible:', e);
  }
}

export function setMuted(muted: boolean) {
  isMuted = muted;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('fantasia_muted', muted ? 'true' : 'false');
    } catch (e) {
      console.warn('localStorage not accessible:', e);
    }
  }
}

export function getMuted(): boolean {
  return isMuted;
}

// Lazy-initialize the audio context to satisfy browser security autoplay policies.
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined' || isMuted) return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Helper to create a noise buffer (white noise) used for impacts and roll clatters.
 */
function createNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const bufferSize = ctx.sampleRate * 2; // 2 seconds of noise
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

/**
 * 1. DICE ROLL SOUND
 * Simulates a dice clattering on a tabletop with multiple quick, damp impacts.
 */
export function playRollSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const rollDuration = 0.45; // total duration
  const clackCount = 4 + Math.floor(Math.random() * 3); // 4 to 6 rapid impacts

  const noise = createNoiseBuffer(ctx);

  for (let i = 0; i < clackCount; i++) {
    // Stagger the clacks over time
    const delay = (i / clackCount) * rollDuration * 0.9;
    const clackTime = now + delay;
    const clackDuration = 0.04 + Math.random() * 0.04;

    // A low thud sine wave
    const osc = ctx.createOscillator();
    const gainOsc = ctx.createGain();
    
    osc.type = 'sine';
    const startFreq = 140 - i * 12 + Math.random() * 15;
    osc.frequency.setValueAtTime(startFreq, clackTime);
    osc.frequency.linearRampToValueAtTime(50, clackTime + clackDuration);

    gainOsc.gain.setValueAtTime(0.3, clackTime);
    gainOsc.gain.linearRampToValueAtTime(0.001, clackTime + clackDuration);

    // Filtered noise burst for the click/friction of the die
    const noiseNode = ctx.createBufferSource();
    noiseNode.buffer = noise;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(500 + Math.random() * 300, clackTime);
    filter.Q.setValueAtTime(3.0, clackTime);

    const gainNoise = ctx.createGain();
    gainNoise.gain.setValueAtTime(0.12, clackTime);
    gainNoise.gain.linearRampToValueAtTime(0.001, clackTime + clackDuration * 0.7);

    // Connect nodes
    osc.connect(gainOsc);
    gainOsc.connect(ctx.destination);

    noiseNode.connect(filter);
    filter.connect(gainNoise);
    gainNoise.connect(ctx.destination);

    // Start & Stop
    osc.start(clackTime);
    osc.stop(clackTime + clackDuration);

    noiseNode.start(clackTime);
    noiseNode.stop(clackTime + clackDuration);
  }
}

/**
 * 2. CRITICAL SUCCESS (Nat 20) SOUND
 * A beautiful, ascending magical chime/sparkle chord with delay/reverb feeling.
 */
export function playCritSuccessSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  
  // Magical Pentatonic / Major 7th arpeggio: C5, E5, G5, B5, C6, E6
  const notes = [523.25, 659.25, 783.99, 987.77, 1046.50, 1318.51];
  
  notes.forEach((freq, idx) => {
    const triggerTime = now + idx * 0.09;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    // Triangle wave gives a beautiful, pure medieval flute/chime tone
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, triggerTime);
    
    // Tiny subtle vibrato (LFO)
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 8; // 8Hz vibrato
    lfoGain.gain.value = 15; // 15 cents pitch swing
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start(triggerTime);
    lfo.stop(triggerTime + 1.8);

    gainNode.gain.setValueAtTime(0.001, triggerTime);
    gainNode.gain.linearRampToValueAtTime(0.18, triggerTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0.001, triggerTime + 1.4);

    // High pass filter to make it sound extra crisp/starry
    const hpf = ctx.createBiquadFilter();
    hpf.type = 'highpass';
    hpf.frequency.value = 300;

    osc.connect(hpf);
    hpf.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(triggerTime);
    osc.stop(triggerTime + 1.8);
  });
}

/**
 * 3. CRITICAL FAILURE (Nat 1) SOUND
 * A deep, heavy, descending cinematic brass-like thud of doom.
 */
export function playCritFailSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const duration = 0.8;

  // 1. Sawtooth sweep for brassy, raw sound
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(140, now);
  // Descending sweep
  osc.frequency.linearRampToValueAtTime(45, now + duration);

  // Lowpass filter closing down to make it dark and muffled
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(700, now);
  filter.frequency.linearRampToValueAtTime(60, now + duration);

  gainNode.gain.setValueAtTime(0.001, now);
  gainNode.gain.linearRampToValueAtTime(0.3, now + 0.08);
  gainNode.gain.linearRampToValueAtTime(0.001, now + duration);

  // 2. Extra heavy sub-bass thud
  const subOsc = ctx.createOscillator();
  const subGain = ctx.createGain();
  subOsc.type = 'sine';
  subOsc.frequency.setValueAtTime(70, now);
  subOsc.frequency.linearRampToValueAtTime(30, now + 0.4);

  subGain.gain.setValueAtTime(0.4, now);
  subGain.gain.linearRampToValueAtTime(0.001, now + 0.4);

  // Connections
  osc.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  subOsc.connect(subGain);
  subGain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration);

  subOsc.start(now);
  subOsc.stop(now + duration);
}

/**
 * 4. HP DAMAGE IMPACT SOUND
 * Triangle wave, pitch drops rapidly. Dynamic based on health ratio.
 */
export function playDamageSound(healthRatio: number = 0.5) {
  if (isNaN(healthRatio) || healthRatio < 0) healthRatio = 0.5;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const duration = 0.15;
  
  // Base frequencies, drop lower when health is low
  const baseFreq = 110 + (110 * healthRatio); // 110Hz (near dead) to 220Hz (healthy)
  const endFreq = baseFreq / 2; // Drops by an octave

  const osc = ctx.createOscillator();
  const gainOsc = ctx.createGain();
  
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(baseFreq, now);
  osc.frequency.linearRampToValueAtTime(endFreq, now + duration);
  
  gainOsc.gain.setValueAtTime(0.4, now);
  gainOsc.gain.linearRampToValueAtTime(0.001, now + duration);
  
  osc.connect(gainOsc);
  gainOsc.connect(ctx.destination);
  
  osc.start(now);
  osc.stop(now + duration);
}

/**
 * 5. HP HEAL CELESTIAL SOUND
 * Fast arpeggio (C4, E4, G4, C5) with triangle waves. Dynamic based on health ratio.
 */
export function playHealSound(healthRatio: number = 0.5) {
  if (isNaN(healthRatio) || healthRatio < 0) healthRatio = 0.5;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  
  // Shift the whole arpeggio up based on health level
  const pitchMultiplier = 1 + (healthRatio * 0.5); // Up to 1.5x frequency when near full
  const baseNotes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
  
  baseNotes.forEach((freq, idx) => {
    const triggerTime = now + idx * 0.06;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq * pitchMultiplier, triggerTime);
    
    gainNode.gain.setValueAtTime(0.001, triggerTime);
    gainNode.gain.linearRampToValueAtTime(0.2, triggerTime + 0.02);
    gainNode.gain.linearRampToValueAtTime(0.001, triggerTime + 0.3);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start(triggerTime);
    osc.stop(triggerTime + 0.3);
  });
}

/**
 * 6. DEATH SOUND (Zero HP)
 * Dramatic detuned sawtooth waves.
 */
export function playDeathSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const duration = 0.5;

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc1.type = 'sawtooth';
  osc2.type = 'sawtooth';

  osc1.frequency.setValueAtTime(150, now);
  osc1.frequency.linearRampToValueAtTime(60, now + duration);

  osc2.frequency.setValueAtTime(154, now);
  osc2.frequency.linearRampToValueAtTime(60, now + duration);

  gainNode.gain.setValueAtTime(0.001, now);
  gainNode.gain.linearRampToValueAtTime(0.3, now + 0.1);
  gainNode.gain.linearRampToValueAtTime(0.001, now + duration);

  osc1.connect(gainNode);
  osc2.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + duration);
  osc2.stop(now + duration);
}

/**
 * 7. MAX HEALTH SOUND
 * Soft spark sine wave.
 */
export function playMaxHealthSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const duration = 0.25;

  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.linearRampToValueAtTime(1760, now + duration);

  gainNode.gain.setValueAtTime(0.001, now);
  gainNode.gain.linearRampToValueAtTime(0.15, now + 0.05);
  gainNode.gain.linearRampToValueAtTime(0.001, now + duration);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration);
}

/**
 * 8. INTERACTION SOUND (Click)
 * Short beep sine wave.
 */
export function playClickSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const duration = 0.05;

  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, now);

  gainNode.gain.setValueAtTime(0.05, now);
  gainNode.gain.linearRampToValueAtTime(0.001, now + duration);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration);
}
