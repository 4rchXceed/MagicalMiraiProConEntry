/**
 * The progress bar
 * Handles click -> changes playback time
 * Can be updates
 * Also shows lyrics, with a little animation
 */
export class ProgressBar {
  /**
   * Creates ProgressBar and registers events
   * @param {HTMLElement} container the html container of the progress bar's structure
   * @param {*} cfg the progress bar's config (stored in Globals.js)
   * @param {*} changeCallback function that will be called when the user requests a playback time change
   */
  constructor(container, cfg, changeCallback) {
    // Gets all the html elements
    /** The elements container */
    this.element = container;
    /** Fill element */
    this.fill = container.querySelector("#progress-bar-fill");
    /** The ball element (it has a little animation when a new lyric spawns) */
    this.ball = container.querySelector("#ball");
    /** The container for the spawned lyrics */
    this.lyricsPool = container.querySelector("#lyrics-pool");
    /** "Cursor" indicating where the playback will be set to */
    this.cursor = container.querySelector("#cursor");
    /** All the lyrics */
    this.lyrics = [];
    /** The progress config */
    this.cfg = cfg;
    /** Util to calculate delaTime */
    this.last = 0;
    /** Playback change callback */
    this.changeCallback = changeCallback;
    // Registers events
    this.element.addEventListener("mousemove", (e) => {
      this.updateCursor(e);
    });
    this.element.addEventListener("click", (e) => {
      this.changePlayback(e);
    });
    /** Is the playback change locked? */
    this.locked = false;
    // Start the first update
    this.update();
  }

  /**
   * Change the playback
   * @param {MouseEvent} e the mouse event datas
   */
  changePlayback(e) {
    // Only call the callback if the playback change is not locked
    if (!this.locked) {
      // Also calculates the playback position (between 0 and 1)
      this.changeCallback(e.offsetX / this.element.offsetWidth);
    }
  }

  /**
   * updates the html cursor
   * @param {MouseEvent} e the mouse event datas
   */
  updateCursor(e) {
    // Sets the left of the cursor
    this.cursor.style.left = `${e.offsetX}px`;
  }

  /**
   * Update the current progress size
   * @param {number} progress current progress (between 0 and 100)
   */
  setProgress(progress) {
    this.fill.style.width = `${progress}%`;
  }

  /**
   * Spawn a new lyric
   * @param {string} lyric
   */
  spawnLyric(lyric) {
    // Create the html element with lyric as text inside
    const lyricElement = document.createElement("div");
    lyricElement.classList.add("lyric");
    lyricElement.textContent = lyric;
    // Add new created element to it's container
    this.lyricsPool.appendChild(lyricElement);

    // Set the ball animation
    this.ball.classList.add("bumb");
    setTimeout(() => {
      this.ball.classList.remove("bumb");
    }, 100);

    // Add the lyric to the list
    this.lyrics.push({
      element: lyricElement,
      left: 20,
    });
  }

  /**
   * Handles updates
   * @param {number} t current time (since page load, I think)
   */
  update(t) {
    // Calculates deltaTime
    const dt = t - this.last;
    this.last = t;

    for (const lyric of [...this.lyrics]) {
      // [...this.lyrics] so the splice doesn't affect the lyric
      // Update the lyric position
      lyric.left += (dt / 1000) * this.cfg.speed;
      lyric.element.style.left = `${lyric.left}%`;
      // If it's at the end, remove it
      if (lyric.left > 100) {
        lyric.element.remove();
        this.lyrics.splice(this.lyrics.indexOf(lyric), 1);
      }
    }

    // Loop
    requestAnimationFrame(this.update.bind(this));
  }
}
