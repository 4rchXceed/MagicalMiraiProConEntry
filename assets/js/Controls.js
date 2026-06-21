/**
 * Handles the two buttons (play/pause and stop)
 */
export class Controls {
  /**
   * Creates Controls
   * @param {HTMLElement} htmlElement the container containing the buttons (see index.html -> #controls)
   * @param {*} playClbk Function that will be called when the play button is clicked
   * @param {*} pauseClbk Function that will be called when the pause button is clicked
   * @param {*} stopClbk Function that will be called when the exit/stop button is clicked
   */
  constructor(htmlElement, playClbk, pauseClbk, stopClbk) {
    this.container = htmlElement;
    // Gets the play button
    this.playBtn = this.container.querySelector("#play");
    // Gets the play/pause icons
    this.playBtnPlayIcon = this.container.querySelector("#play-play");
    this.playBtnPauseIcon = this.container.querySelector("#play-pause");
    // Gets the stop button
    this.stopBtn = this.container.querySelector("#exit");
    // Stores if the current state is "playing" or "paused"
    this.isPlaying = true;
    // Registers the stop/exit click event
    this.stopBtn.addEventListener("click", stopClbk);
    // Registers the play/pause click event
    this.playBtn.addEventListener("click", () => {
      // Invert the current state
      this.isPlaying = !this.isPlaying;
      if (this.isPlaying) {
        // Swap the icons
        this.playBtnPlayIcon.style.transform = "scale(0)";
        this.playBtnPauseIcon.style.transform = "scale(1)";
        // Play the callback
        playClbk();
      } else {
        // Swap the icons
        this.playBtnPlayIcon.style.transform = "scale(1)";
        this.playBtnPauseIcon.style.transform = "scale(0)";
        // Play the callback
        pauseClbk();
      }
    });
  }
}
