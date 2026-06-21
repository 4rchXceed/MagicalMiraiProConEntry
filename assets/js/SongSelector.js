import { MAGIC_NUMBERS } from "./MagicNumbers.js";

export class SongSelector {
  constructor(playCallback = () => {}) {
    document.querySelector("#song-player").classList.remove("end");
    document.querySelector("#song-select").classList.remove("end");
    this.container = document.querySelector("#song-select");
    SongSelector.loadSvg(
      this.container.querySelector("#svg-container"),
      "./assets/textures/city/city.svg",
      () => {
        this.elements = {
          // TODO: Load these from a JSON
          1: SongSelector.getSongParams("1"),
          2: SongSelector.getSongParams("2"),
          3: SongSelector.getSongParams("3"),
          4: SongSelector.getSongParams("4"),
          5: SongSelector.getSongParams("5"),
          6: SongSelector.getSongParams("6"),
        };
        this.select(1);
      },
    );
    SongSelector.loadSvg(
      document.querySelector("#song-player"),
      "./assets/textures/player/phone.svg",
      () => {
        document.querySelector("#texts").classList.remove("end");
        document.querySelector("#texts").innerHTML = `
          <span id='player-song-title'></span>
          <span id='player-song-artist'></span>
        `;
        this.songTitleElement = document.querySelector("#player-song-title");
        this.songArtistElement = document.querySelector("#player-song-artist");
        this.select(1);
      },
    );
    this.currentSong = 1;
    this.arrowY = 0;
    this.mult = 1;
    this.lastTime = null;
    this.isRemoved = false;

    this.prevButton = this.container.querySelector("#song-select-prev");
    this.nextButton = this.container.querySelector("#song-select-next");
    this.playButton = this.container.querySelector("#song-select-play");

    this.prevButton.addEventListener("click", () =>
      this.isRemoved ? null : this.prev(),
    );
    this.nextButton.addEventListener("click", () =>
      this.isRemoved ? null : this.next(),
    );
    this.playButton.addEventListener("click", () =>
      this.isRemoved ? null : this.play(),
    );

    this.playPhase = 0;
    this.lastPlayPhaseTime = 0;
    this.moveElements = [];

    this.playCallback = playCallback;

    requestAnimationFrame((t) => this.animate(t));
  }

  static getSongParams(nbr) {
    const song = MAGIC_NUMBERS.TRANSLATIONS.songs[parseInt(nbr)];
    let artist = song.jp.artist;
    let title = song.jp.name;
    if (document.documentElement.lang === "en") {
      artist = song.en.artist;
      title = song.en.name;
    }
    return {
      arrow: document.querySelector(`#song${nbr}-arrow`), // Inkscape IDs
      title,
      artist,
      parts: document.querySelectorAll(`.song${nbr}-select`),
    };
  }

  next() {
    if (this.elements) {
      if (this.currentSong >= 6) {
        this.select(1);
      } else {
        this.select(this.currentSong + 1);
      }
    }
  }

  prev() {
    if (this.elements) {
      if (this.currentSong <= 1) {
        this.select(6);
      } else {
        this.select(this.currentSong - 1);
      }
    }
  }

  isNotPartOfCurrentSongBuild(element) {
    return (
      !element.classList.contains(`song${this.currentSong}-select`) &&
      element.parentNode.id !== `song${this.currentSong}-arrow` &&
      element.id !== "city-bg"
    ); // Do not select the background
  }

  play() {
    const allElements = this.container
      .querySelector("svg") // Select only the 1st SVG (else the button icons will be selected too)
      .querySelectorAll("svg rect");
    const sepX =
      this.elements[this.currentSong].arrow.transform.baseVal[0].matrix.e;
    allElements.forEach((element) => {
      if (this.isNotPartOfCurrentSongBuild(element)) {
        if (element.x) {
          if (element.x.baseVal.value >= sepX) {
            this.moveElements.push({
              elem: element,
              mult: 1,
              x: 0,
            });
          } else {
            this.moveElements.push({
              elem: element,
              mult: -1,
              x: 0,
            });
          }
        }
      }
    });
    const allOtherElements = this.container
      .querySelector("svg")
      .querySelectorAll("svg path, svg ellipse");
    allOtherElements.forEach((element) => {
      if (this.isNotPartOfCurrentSongBuild(element)) {
        element.remove();
      }
    });
    this.playPhase = 1;
    this.lastPlayPhaseTime = Date.now() / 1000;
  }

  select(n) {
    this.elements[this.currentSong].arrow.style.opacity = "0";
    this.elements[this.currentSong].parts.forEach((e) => {
      e.style.strokeWidth = "0";
    });
    this.currentSong = n;
    this.elements[this.currentSong].arrow.style.opacity = "1";
    this.elements[this.currentSong].parts.forEach((e) => {
      e.style.strokeWidth = "1";
    });
    this.elements[this.currentSong].arrow.scrollIntoView({
      behavior: "smooth",
      inline: "center",
    });

    if (this.songTitleElement && this.songArtistElement) {
      this.songTitleElement.innerHTML = this.elements[
        this.currentSong
      ].title.replace("\n", "<br/>");
      this.songArtistElement.innerHTML = this.elements[
        this.currentSong
      ].artist.replace("\n", "<br/>");
    }
  }

  animate(t) {
    if (!this.lastTime) {
      this.lastTime = t;
    }

    const deltaTime = (t - this.lastTime) / 1000;
    if (this.playPhase === 0) {
      if (this.songTitleElement && this.songArtistElement) {
        const bboxTitle = document
          .querySelector("#player-song-title-elem")
          .getBoundingClientRect();
        const bboxArtist = document
          .querySelector("#player-song-artist-elem")
          .getBoundingClientRect();
        this.songTitleElement.style.left = bboxTitle.left + "px";
        this.songTitleElement.style.top = bboxTitle.top + "px";
        this.songArtistElement.style.left = bboxArtist.left + "px";
        this.songArtistElement.style.top = bboxArtist.top + "px";
      }
      if (this.elements) {
        this.arrowY +=
          deltaTime * MAGIC_NUMBERS.SONG_SELECT.ARROW.MOVE_SPEED * this.mult;
        if (this.arrowY > MAGIC_NUMBERS.SONG_SELECT.ARROW.MOVE_BOUNDS) {
          this.mult = -1;
        }
        if (this.arrowY < -MAGIC_NUMBERS.SONG_SELECT.ARROW.MOVE_BOUNDS) {
          this.mult = 1;
        }
        this.elements[this.currentSong].arrow.transform.baseVal[0].matrix.f =
          this.arrowY;
      }
    } else {
      for (const element of this.moveElements) {
        element.elem.style.transform = `translateX(${element.x}px)`;
        element.x +=
          element.mult *
          deltaTime *
          MAGIC_NUMBERS.SONG_SELECT.START_ANIM.MOVE_SPEED;
      }
      if (
        this.lastPlayPhaseTime + MAGIC_NUMBERS.SONG_SELECT.START_ANIM.TIME <=
          Date.now() / 1000 &&
        this.playPhase === 1
      ) {
        this.playPhase++;
        this.lastPlayPhaseTime = Date.now() / 1000;
      }
      if (this.playPhase === 2) {
        document.querySelector("#song-player").classList.add("end");
        document.querySelector("#song-select").classList.add("end");
        document.querySelector("#texts").classList.add("end");
        this.playCallback();
        return; // Stop the anim to save ressources
      }
    }
    this.lastTime = t;
    if (!this.isRemoved) {
      requestAnimationFrame((t) => this.animate(t));
    }
  }

  static loadSvg(container, path, callback, removeWidthHeight = false) {
    const req = new XMLHttpRequest();
    req.open("GET", path);
    req.onerror = () => {
      alert(
        "Error while loading " +
          path +
          ". Please check your webserver's config",
      );
    };
    req.onload = () => {
      if (req.status < 400) {
        container.innerHTML = req.responseText;
        if (removeWidthHeight) {
          container.querySelector("svg").removeAttribute("width");
          container.querySelector("svg").removeAttribute("height");
        }
        callback();
      } else {
        alert("Error: loading " + path + " returned " + req.status);
      }
    };
    req.send();
  } // Loads an SVG, but sets it as innerHTML, so we can "edit" it in JS
}
