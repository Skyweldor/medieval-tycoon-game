/**
 * AnimatedSprite
 * Handles sprite sheet animation for characters
 *
 * Sprite sheet layout (MiniPeasant.png):
 * - 6 columns x 6 rows
 * - 32x32 pixels per frame
 * - Row 0: Idle (loop)
 * - Row 1: Walk (loop)
 * - Row 2: Jump (once)
 * - Row 3: Attack (once)
 * - Row 4: Hurt (once)
 * - Row 5: Die (once, hold last frame)
 */

export class AnimatedSprite {
  /**
   * @param {HTMLElement} element - The DOM element to animate
   * @param {number} [frameWidth=32] - Width of each frame
   * @param {number} [frameHeight=32] - Height of each frame
   * @param {number} [framesPerRow=6] - Number of frames per row
   */
  constructor(element, frameWidth = 32, frameHeight = 32, framesPerRow = 6) {
    this.el = element;
    this.frameW = frameWidth;
    this.frameH = frameHeight;
    this.framesPerRow = framesPerRow;

    this.currentFrame = 0;
    this.currentState = 'idle';
    this.animationId = null;
    this.isPlaying = false;

    // Animation state definitions
    this.states = {
      idle:   { row: 0, frames: 4, loop: true,  fps: 6 },
      walk:   { row: 1, frames: 6, loop: true,  fps: 10 },
      jump:   { row: 2, frames: 6, loop: false, fps: 10 },
      attack: { row: 3, frames: 6, loop: false, fps: 12 },
      hurt:   { row: 4, frames: 6, loop: false, fps: 8 },
      die:    { row: 5, frames: 6, loop: false, fps: 8, holdLast: true }
    };

    // Callback for when a non-looping animation ends
    this.onAnimationEnd = null;
  }

  /**
   * Set the animation state
   * @param {string} stateName - State name (idle, walk, jump, attack, hurt, die)
   */
  setState(stateName) {
    if (!this.states[stateName]) return;
    if (this.currentState === stateName && this.isPlaying) return;

    this.currentState = stateName;
    this.currentFrame = 0;
    this.updateFrame();
    this.play();
  }

  /**
   * Update the background position to show current frame
   */
  updateFrame() {
    const state = this.states[this.currentState];
    const x = -this.currentFrame * this.frameW;
    const y = -state.row * this.frameH;
    this.el.style.backgroundPosition = `${x}px ${y}px`;
  }

  /**
   * Start playing the current animation
   */
  play() {
    this.stop();
    this.isPlaying = true;

    const state = this.states[this.currentState];
    const interval = 1000 / state.fps;

    this.animationId = setInterval(() => {
      this.currentFrame++;

      // End of animation
      if (this.currentFrame >= state.frames) {
        if (state.loop) {
          this.currentFrame = 0;
        } else if (state.holdLast) {
          this.currentFrame = state.frames - 1;
          this.stop();
        } else {
          this.currentFrame = 0;
          this.stop();
          if (this.onAnimationEnd) {
            this.onAnimationEnd(this.currentState);
          }
          return;
        }
      }

      this.updateFrame();
    }, interval);
  }

  /**
   * Stop the animation
   */
  stop() {
    if (this.animationId) {
      clearInterval(this.animationId);
      this.animationId = null;
    }
    this.isPlaying = false;
  }

  /**
   * Check if current animation is a one-shot that's finished
   * @returns {boolean}
   */
  isAnimationComplete() {
    const state = this.states[this.currentState];
    return !state.loop && !this.isPlaying;
  }

  /**
   * Get current state name
   * @returns {string}
   */
  getState() {
    return this.currentState;
  }

  /**
   * Destroy the sprite (cleanup)
   */
  destroy() {
    this.stop();
    this.el = null;
    this.onAnimationEnd = null;
  }
}
