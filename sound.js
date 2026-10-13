(() => {
class SoundKit {
  constructor() {
    this.musicOn = true;
    this.effectsOn = true;
    this.context = null;
    this.musicTimer = 0;
    this.noteIndex = 0;
    this.musicGain = null;
  }

  async unlock() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!this.context) {
      this.context = new AudioContextClass();
      this.musicGain = this.context.createGain();
      this.musicGain.gain.value = .45;
      this.musicGain.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') await this.context.resume();
  }

  async startMusic() {
    await this.unlock();
    this.stopMusic();
    if (!this.musicOn || !this.context) return;
    const notes = [392, 494, 587, 494, 440, 587, 659, 587, 392, 494, 587, 784, 659, 587, 494, 440];
    this.noteIndex = 0;
    const playNote = () => {
      if (!this.musicOn || !this.context) return;
      const now = this.context.currentTime;
      const frequency = notes[this.noteIndex % notes.length];
      this.noteIndex++;
      this.makeTone(frequency, .1, .055, 'sine', this.musicGain, now);
      if (this.noteIndex % 4 === 0) this.makeTone(frequency / 2, .27, .025, 'triangle', this.musicGain, now);
    };
    playNote();
    this.musicTimer = window.setInterval(playNote, 320);
  }

  stopMusic() {
    if (this.musicTimer) window.clearInterval(this.musicTimer);
    this.musicTimer = 0;
  }

  async setMusic(enabled) {
    this.musicOn = enabled;
    if (!enabled) this.stopMusic();
    else if (this.context) await this.startMusic();
  }

  setEffects(enabled) { this.effectsOn = enabled; }

  async effect(kind) {
    if (!this.effectsOn) return;
    await this.unlock();
    if (!this.context) return;
    const sounds = {
      jump: [520, .09, .08, 'triangle'],
      collect: [880, .14, .13, 'sine'],
      hit: [180, .22, .12, 'sawtooth'],
      lane: [420, .055, .045, 'sine'],
      pick: [380, .045, .035, 'sine'],
      correct: [720, .15, .12, 'triangle'],
      wrong: [245, .16, .09, 'triangle'],
    };
    const [frequency, duration, volume, wave] = sounds[kind] || sounds.pick;
    this.makeTone(frequency, duration, volume, wave, this.context.destination, this.context.currentTime);
  }

  makeTone(frequency, duration, volume, wave, destination, startTime) {
    if (!this.context) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, startTime);
    gain.gain.setValueAtTime(.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(Math.max(.001, volume), startTime + .018);
    gain.gain.exponentialRampToValueAtTime(.0001, startTime + duration);
    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration + .025);
  }

  dispose() {
    this.stopMusic();
    this.context?.close();
    this.context = null;
  }
}

window.SoundKit = SoundKit;
})();
