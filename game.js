(() => {
const WIDTH = 960;
const HEIGHT = 540;

class GameEngine {
  constructor(canvas, hooks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.hooks = hooks;
    this.mode = null;
    this.frame = 0;
    this.lastFrame = 0;
    this.elapsed = 0;
    this.remaining = 0;
    this.paused = false;
    this.pointer = { x: 0, y: 0, down: false };
    this.onPointerDown = event => this.handlePointerDown(event);
    this.onPointerMove = event => this.handlePointerMove(event);
    this.onPointerUp = event => this.handlePointerUp(event);
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerUp);
  }

  start(modeId, config) {
    this.cancelFrame();
    this.mode = window.createGameMode(modeId, config, this.hooks);
    this.elapsed = 0;
    this.remaining = config.duration || 0;
    this.paused = false;
    this.lastFrame = 0;
    this.frame = requestAnimationFrame(time => this.tick(time));
    this.publishStatus();
  }

  tick(timestamp) {
    if (!this.mode) return;
    const dt = this.lastFrame ? Math.min((timestamp - this.lastFrame) / 1000, 0.04) : 0;
    this.lastFrame = timestamp;
    if (!this.paused) {
      this.elapsed += dt;
      if (this.remaining > 0) this.remaining = Math.max(0, this.remaining - dt);
      this.mode.update(dt, this.elapsed);
      if (this.mode.isComplete?.() || (this.remaining === 0 && this.mode.timed)) {
        this.publishStatus();
        this.hooks.onFinish?.(this.mode.score, this.mode.getResult?.());
        this.paused = true;
      }
      this.publishStatus();
    }
    this.mode.draw(this.ctx, this.elapsed, this.paused);
    this.frame = requestAnimationFrame(time => this.tick(time));
  }

  publishStatus() {
    if (!this.mode) return;
    this.hooks.onStatus?.({
      remaining: this.mode.timed ? this.remaining : null,
      score: this.mode.score,
      progress: this.mode.getProgress?.() || null,
    });
  }

  setPaused(paused) {
    this.paused = paused;
    this.lastFrame = 0;
  }

  stop() {
    this.cancelFrame();
    this.mode = null;
    this.paused = false;
  }

  cancelFrame() {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  point(event) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * WIDTH / rect.width, y: (event.clientY - rect.top) * HEIGHT / rect.height };
  }

  handlePointerDown(event) {
    if (!this.mode || this.paused) return;
    event.preventDefault();
    this.canvas.setPointerCapture?.(event.pointerId);
    this.pointer = { ...this.point(event), down: true };
    this.mode.pointerDown?.(this.pointer);
    this.publishStatus();
  }

  handlePointerMove(event) {
    if (!this.mode || this.paused || !this.pointer.down) return;
    event.preventDefault();
    this.pointer = { ...this.point(event), down: true };
    this.mode.pointerMove?.(this.pointer);
  }

  handlePointerUp(event) {
    if (!this.mode || !this.pointer.down) return;
    event.preventDefault();
    this.pointer = { ...this.point(event), down: false };
    this.mode.pointerUp?.(this.pointer);
    this.pointer.down = false;
    this.publishStatus();
  }
}
window.GameEngine = GameEngine;
})();
