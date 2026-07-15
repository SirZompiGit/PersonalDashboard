/**
 * Audio Synthesis Utility for D&D Campaign Master Dashboard
 * Uses the Web Audio API to dynamically generate retro-modern D&D sound effects.
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

export function setMuted(muted: boolean) {
  isMuted = muted;
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
    osc.frequency.exponentialRampToValueAtTime(50, clackTime + clackDuration);

    gainOsc.gain.setValueAtTime(0.3, clackTime);
    gainOsc.gain.exponentialRampToValueAtTime(0.001, clackTime + clackDuration);

    // Filtered noise burst for the click/friction of the die
    const noiseNode = ctx.createBufferSource();
    noiseNode.buffer = noise;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(500 + Math.random() * 300, clackTime);
    filter.Q.setValueAtTime(3.0, clackTime);

    const gainNoise = ctx.createGain();
    gainNoise.gain.setValueAtTime(0.12, clackTime);
    gainNoise.gain.exponentialRampToValueAtTime(0.001, clackTime + clackDuration * 0.7);

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

    gainNode.gain.setValueAtTime(0, triggerTime);
    gainNode.gain.linearRampToValueAtTime(0.18, triggerTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, triggerTime + 1.4);

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
  filter.frequency.exponentialRampToValueAtTime(60, now + duration);

  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.3, now + 0.08);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

  // 2. Extra heavy sub-bass thud
  const subOsc = ctx.createOscillator();
  const subGain = ctx.createGain();
  subOsc.type = 'sine';
  subOsc.frequency.setValueAtTime(70, now);
  subOsc.frequency.exponentialRampToValueAtTime(30, now + 0.4);

  subGain.gain.setValueAtTime(0.4, now);
  subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

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
 * Short, aggressive slashing punch sound.
 */
export function playDamageSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const duration = 0.22;

  // Sine frequency dive
  const osc = ctx.createOscillator();
  const gainOsc = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.exponentialRampToValueAtTime(65, now + duration);

  gainOsc.gain.setValueAtTime(0.35, now);
  gainOsc.gain.exponentialRampToValueAtTime(0.001, now + duration);

  // White noise burst for the impact friction
  const noiseNode = ctx.createBufferSource();
  noiseNode.buffer = createNoiseBuffer(ctx);

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(280, now);
  filter.Q.value = 1.5;

  const gainNoise = ctx.createGain();
  gainNoise.gain.setValueAtTime(0.22, now);
  gainNoise.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.7);

  // Connections
  osc.connect(gainOsc);
  gainOsc.connect(ctx.destination);

  noiseNode.connect(filter);
  filter.connect(gainNoise);
  gainNoise.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration);

  noiseNode.start(now);
  noiseNode.stop(now + duration);
}

/**
 * 5. HP HEAL CELESTIAL SOUND
 * Warm, celestial ascending sweep.
 */
export function playHealSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const duration = 0.38;

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc1.type = 'sine';
  osc2.type = 'triangle';

  // Harmonies ascending in parallel
  osc1.frequency.setValueAtTime(329.63, now); // E4
  osc1.frequency.exponentialRampToValueAtTime(659.25, now + duration); // E5

  osc2.frequency.setValueAtTime(415.30, now); // G#4
  osc2.frequency.exponentialRampToValueAtTime(830.61, now + duration); // G#5

  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.16, now + 0.08);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

  // Soft lowpass filter to make it silky
  const lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.frequency.value = 1200;

  osc1.connect(lpf);
  osc2.connect(lpf);
  lpf.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc1.start(now);
  osc1.stop(now + duration);

  osc2.start(now);
  osc2.stop(now + duration);
}
