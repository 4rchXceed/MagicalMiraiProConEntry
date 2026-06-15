export class Controls {
  constructor(htmlElement, playClbk, pauseClbk, stopClbk) {
    this.container = htmlElement;
    this.playBtn = this.container.querySelector("#play");
    this.playBtnPlayIcon = this.container.querySelector("#play-play");
    this.playBtnPauseIcon = this.container.querySelector("#play-pause");
    this.stopBtn = this.container.querySelector("#exit");
    this.isPlaying = true;
    this.stopBtn.addEventListener("click", stopClbk);
    this.playBtn.addEventListener("click", () => {
      this.isPlaying = !this.isPlaying;
      if (this.isPlaying) {
        this.playBtnPlayIcon.style.transform = "scale(0)";
        this.playBtnPauseIcon.style.transform = "scale(1)";
        playClbk();
      } else {
        this.playBtnPlayIcon.style.transform = "scale(1)";
        this.playBtnPauseIcon.style.transform = "scale(0)";
        pauseClbk();
      }
    });
  }
}
