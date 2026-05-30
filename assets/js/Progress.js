export class ProgressBar {
  constructor(element, cfg, changeCallback) {
    this.element = element;
    this.fill = element.querySelector("#progress-bar-fill");
    this.ball = element.querySelector("#ball");
    this.lyricsPool = element.querySelector("#lyrics-pool");
    this.cursor = element.querySelector("#cursor");
    this.lyrics = [];
    this.cfg = cfg;
    this.update();
    this.last = 0;
    this.changeCallback = changeCallback;
    this.element.addEventListener("mousemove", this.mm.bind(this));
    this.element.addEventListener("click", this.clck.bind(this));
  }

  clck(e) {
    this.changeCallback(e.offsetX / this.element.offsetWidth);
  }

  mm(e) {
    this.cursor.style.left = `${e.offsetX}px`;
  }

  setProgress(progress) {
    this.fill.style.width = `${progress}%`;
  }

  spawnLyric(lyric) {
    const lyricElement = document.createElement("div");
    lyricElement.classList.add("lyric");
    lyricElement.textContent = lyric;
    this.ball.classList.add("bumb");
    setTimeout(() => {
      this.ball.classList.remove("bumb");
    }, 100);
    this.lyricsPool.appendChild(lyricElement);
    this.lyrics.push({
      element: lyricElement,
      left: 20,
    });
  }

  update(t) {
    const dt = t - this.last;
    this.last = t;
    for (const lyric of [...this.lyrics]) {
      lyric.left += (dt / 1000) * this.cfg.speed;
      if (lyric.left > 100) {
        lyric.element.remove();
        this.lyrics.splice(this.lyrics.indexOf(lyric), 1);
      }
      lyric.element.style.left = `${lyric.left}%`;
    }
    requestAnimationFrame(this.update.bind(this));
  }
}
