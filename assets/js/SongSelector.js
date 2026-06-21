import { GLOBAL_VARIABLES } from "./Globals.js";

/**
 * The song selector
 * Uses SVGs and modifies them. I know this is not the best way to do it, but like that I can create the base svgs on Inkscape, it's way easier
 * Uses three buttons to go to the next song, play or go to the last song
 * Also shows the song title/artist in an svg. Handles translations.
 */
export class SongSelector {
  /**
   * Creates the SongSelector, loads the SVGs and register the events
   * @param {*} playCallback the function that will be called when the "play" button is called. GLOBAL_VARIABLES.TEXTALIVE_DATAS[X] is passed as argument
   */
  constructor(playCallback = () => {}) {
    // Resets html that older SongSelector instances modified
    document.querySelector("#song-player").classList.remove("end");
    document.querySelector("#song-select").classList.remove("end");
    document.querySelector("#texts").classList.remove("end");
    /** Container containing the song selector */
    this.container = document.querySelector("#song-select");
    // Loads the "city" svg in HTML, instead of in an img, but without copy-pasing it
    SongSelector.loadSvg(
      this.container.querySelector("#svg-container"),
      "./assets/textures/city/city.svg",
      () => {
        // Sets the html elements for each song
        this.elements = {
          1: SongSelector.getSongElements("1"),
          2: SongSelector.getSongElements("2"),
          3: SongSelector.getSongElements("3"),
          4: SongSelector.getSongElements("4"),
          5: SongSelector.getSongElements("5"),
          6: SongSelector.getSongElements("6"),
        };
        // Auto-select the first one
        this.select(1);
      },
    );
    // Load the "phone" svg
    SongSelector.loadSvg(
      document.querySelector("#song-player"),
      "./assets/textures/player/phone.svg",
      () => {
        // Creates the song title and artist elements
        document.querySelector("#texts").innerHTML = `
          <span id='player-song-title'></span>
          <span id='player-song-artist'></span>
        `;
        // Get them
        this.songTitleElement = document.querySelector("#player-song-title");
        this.songArtistElement = document.querySelector("#player-song-artist");
        // Re-select the first song (so if it happens after the first load, the state isn't broken)
        this.select(1);
      },
    );

    /** The currently selected song */
    this.currentSong = 1;
    /** The Y offset of the blue arrow moving up and down */
    this.arrowY = 0;
    /** Should the arrow go down (+1) or up (-1) */
    this.mult = 1;
    /** Used to calculate delaTime */
    this.lastTime = null;
    /** Is this class "deleted" */
    this.isRemoved = false;

    /** Previous song button */
    this.prevButton = this.container.querySelector("#song-select-prev");
    /** Next song button */
    this.nextButton = this.container.querySelector("#song-select-next");
    /** Play button */
    this.playButton = this.container.querySelector("#song-select-play");

    // Register events
    this.prevButton.addEventListener("click", () =>
      // don't call anything if the class has been removed
      this.isRemoved ? null : this.prev(),
    );
    this.nextButton.addEventListener("click", () =>
      this.isRemoved ? null : this.next(),
    );
    this.playButton.addEventListener("click", () =>
      this.isRemoved ? null : this.play(),
    );

    /** 0 => user select a song, 1 => user clicked "play", and the first animation plays, 2 => animation ended, the app is currently playing */
    this.playPhase = 0;
    /** Used to check if the song selector needs to go to another phase (playPhase) */
    this.lastPlayPhaseTime = 0;
    /** All elements that needs to be moved on the animation for playPhase 1 */
    this.moveElements = [];

    /** the function that will be called when the "play" button is called. */
    this.playCallback = playCallback;

    // Loop
    requestAnimationFrame((t) => this.animate(t));

    // Little "easter egg"
    document.getElementById("easteregg").addEventListener("input", (e) => {
      if (e.target.value == 39) {
        alert("Yes! You found the easter egg!!");
        alert(
          "Enter an URL supported by textalive (for ex. Youtube video). Textalive has lyrics only for Vocaloid music",
        );
        const url = prompt("Link? [https://textalive.jp to search]");
        alert(
          "If nothing pops up in ~10-20 seconds, the song might not be in textalive's api :( then reload the page...",
        );
        if (url) {
          alert("Enjoy!");
          // Hide all elements
          document.querySelector("#song-player").classList.add("end");
          document.querySelector("#song-select").classList.add("end");
          document.querySelector("#texts").classList.add("end");
          // Play (with the callback)
          this.playCallback({ URL: url, DATAS: {} });
          this.playPhase = 2;
          this.lastPlayPhaseTime = Date.now() / 1000;
        } else {
          alert("See you next time!");
        }
      }
    });
  }

  /**
   * Get the svg elements (arrow and all the build parts) for the song number nbr
   * @param {number} nbr the song number (1-6)
   * @returns {{arrow: SVGElement, title: string, artist: string, parts: SVGElement}} the svg elements (arrow and all the build parts), translated title and artist for the song number nbr
   */
  static getSongElements(nbr) {
    // Get the translated song
    const song = GLOBAL_VARIABLES.TRANSLATIONS.songs[parseInt(nbr)];
    // Default jp
    let artist = song.jp.artist;
    let title = song.jp.name;
    // If en, set en
    if (document.documentElement.lang === "en") {
      artist = song.en.artist;
      title = song.en.name;
    }
    // Return
    return {
      arrow: document.querySelector(`#song${nbr}-arrow`), // Svg IDs
      title,
      artist,
      parts: document.querySelectorAll(`.song${nbr}-select`), // SVG Class
      textaliveDatas: GLOBAL_VARIABLES.TEXTALIVE_DATAS[parseInt(nbr)],
    };
  }

  /**
   * Select the next song
   */
  next() {
    if (this.elements) {
      // Check if overflow, if yes, select the first
      if (this.currentSong >= 6) {
        this.select(1);
      } else {
        // Else just select the next
        this.select(this.currentSong + 1);
      }
    }
  }

  /**
   * Select the previous song
   */
  prev() {
    if (this.elements) {
      // Check if underflow, if yes, select the last one
      if (this.currentSong <= 1) {
        this.select(6);
      } else {
        // Else just select the previous
        this.select(this.currentSong - 1);
      }
    }
  }

  /**
   * Check if an element is part of the selected song (so it doesn't get animated/remove during playPhase 1)
   * @param {SVGElement} element the element to check
   * @returns {boolean} is the song not part of the selected song
   */
  isNotPartOfCurrentSongBuild(element) {
    return (
      !element.classList.contains(`song${this.currentSong}-select`) &&
      element.parentNode.id !== `song${this.currentSong}-arrow` &&
      element.id !== "city-bg"
    ); // Do not select the background
  }

  /**
   * Start the play animation, and the app
   */
  play() {
    // Selects all "movable" elements
    const allElements = this.container
      .querySelector("svg") // Select only the 1st SVG (else the button icons will be selected too)
      .querySelectorAll("svg rect");
    // Middle (transform.baseVal[0].matrix.e = x coordinates)
    const sepX =
      this.elements[this.currentSong].arrow.transform.baseVal[0].matrix.e;
    // For all elements
    allElements.forEach((element) => {
      // If they aren't part of the current song
      if (this.isNotPartOfCurrentSongBuild(element)) {
        if (element.x) {
          // If it's x is bigger, go to the right
          if (element.x.baseVal.value >= sepX) {
            this.moveElements.push({
              elem: element,
              mult: 1,
              x: 0,
            });
          } else {
            // Else go to the left
            this.moveElements.push({
              elem: element,
              mult: -1,
              x: 0,
            });
          }
        }
      }
    });
    // For all the elements we can't move (ex. path, ellipse they have different attributes), we remove them
    const allOtherElements = this.container
      .querySelector("svg")
      .querySelectorAll("svg path, svg ellipse");
    allOtherElements.forEach((element) => {
      // ...but only if they aren't part of the current song
      if (this.isNotPartOfCurrentSongBuild(element)) {
        element.remove();
      }
    });

    // Set the play phase and the current time
    this.playPhase = 1;
    this.lastPlayPhaseTime = Date.now() / 1000;
  }

  /**
   * Select the song, by unselecting the old one, and highlighting the new one.
   * Also sets some properties
   * @param {number} n the song that we want to select (int between 1 (included) and 6 (included))
   */
  select(n) {
    if (!this.elements) return;
    // Hide the old arrow
    this.elements[this.currentSong].arrow.style.opacity = "0";
    // Un-highlight the old selected song
    this.elements[this.currentSong].parts.forEach((e) => {
      e.style.strokeWidth = "0";
    });
    // Set the new selected song
    this.currentSong = n;
    // Show the new arrow
    this.elements[this.currentSong].arrow.style.opacity = "1";
    // Highlight the new selected song
    this.elements[this.currentSong].parts.forEach((e) => {
      e.style.strokeWidth = "1";
    });

    // Scroll smoothly to show the currently selected song / build (overflow: scroll)
    this.elements[this.currentSong].arrow.scrollIntoView({
      behavior: "smooth",
      inline: "center",
    });

    // Update the song title element and artist element
    if (this.songTitleElement && this.songArtistElement) {
      this.songTitleElement.innerHTML = this.elements[this.currentSong].title; // Set the title
      this.songArtistElement.innerHTML = this.elements[this.currentSong].artist; // Set the artist
    }
  }

  /**
   * Updates all animations (playing, arrow moving). It also sets the song artist/title texts to the correct top & left (see comments)
   * @param {number} t current time
   * @returns Nothing
   */
  animate(t) {
    // Calculate deltaTime
    if (!this.lastTime) {
      this.lastTime = t;
    }
    const deltaTime = (t - this.lastTime) / 1000;

    // If the playing animation hasn't started
    if (this.playPhase === 0) {
      // Sets the song artist/title texts to the correct top & left
      // Why?
      // Since the phone svg... is an svg, we can't just edit the text like that, so I created two elements, and I set the top & left of the texts to the position of these svg elements
      if (this.songTitleElement && this.songArtistElement) {
        // Get the global pos of the svg elements
        const bboxTitle = document
          .querySelector("#player-song-title-elem")
          .getBoundingClientRect();
        const bboxArtist = document
          .querySelector("#player-song-artist-elem")
          .getBoundingClientRect();

        // Apply the positions to the "real" text elements
        this.songTitleElement.style.left = bboxTitle.left + "px";
        this.songTitleElement.style.top = bboxTitle.top + "px";
        this.songArtistElement.style.left = bboxArtist.left + "px";
        this.songArtistElement.style.top = bboxArtist.top + "px";
      }

      // Set the arrow position
      if (this.elements) {
        // Add the normal position (multiplied by the direction)
        this.arrowY +=
          deltaTime * GLOBAL_VARIABLES.SONG_SELECT.ARROW.MOVE_SPEED * this.mult;
        // And change direction if it goes "too" low / high
        if (this.arrowY > GLOBAL_VARIABLES.SONG_SELECT.ARROW.MOVE_BOUNDS) {
          this.mult = -1;
        }
        if (this.arrowY < -GLOBAL_VARIABLES.SONG_SELECT.ARROW.MOVE_BOUNDS) {
          this.mult = 1;
        }

        // Apply the position (arrow.transform.baseVal[0].matrix.f = translate translate y)
        this.elements[this.currentSong].arrow.transform.baseVal[0].matrix.f =
          this.arrowY;
      }
    } else {
      // if the animation is playing
      for (const element of this.moveElements) {
        // Move the elements to their respective directions (left or right)
        element.elem.style.transform = `translateX(${element.x}px)`;
        element.x +=
          element.mult *
          deltaTime *
          GLOBAL_VARIABLES.SONG_SELECT.START_ANIM.MOVE_SPEED;
      }
      // If it's time to end the play anim, and really play the song
      if (
        this.lastPlayPhaseTime + GLOBAL_VARIABLES.SONG_SELECT.START_ANIM.TIME <=
          Date.now() / 1000 &&
        this.playPhase === 1
      ) {
        // Hide all elements
        document.querySelector("#song-player").classList.add("end");
        document.querySelector("#song-select").classList.add("end");
        document.querySelector("#texts").classList.add("end");
        // Play (with the callback)
        this.playCallback(this.elements[this.currentSong].textaliveDatas);
        this.playPhase++; // To avoid to run this another time
        this.lastPlayPhaseTime = Date.now() / 1000;
      }
    }
    this.lastTime = t;
    // If it's not deleted, loop
    if (!this.isRemoved) {
      requestAnimationFrame((t) => this.animate(t));
    }
  }

  /**
   * Load the svg directly in the html (see constructor)
   * @param {HTMLElement} container the container for the svg (innerHTML will be overwritten)
   * @param {string} path the url / path of the SVG
   * @param {*} callback function called after the svg is loaded
   */
  static loadSvg(container, path, callback) {
    // Create a request
    const req = new XMLHttpRequest();
    req.open("GET", path);
    req.onerror = () => {
      // Handles errors
      alert(
        "Error while loading " +
          path +
          ". Please check your webserver's config",
      );
    };
    req.onload = () => {
      if (req.status < 400) {
        // Place the element
        container.innerHTML = req.responseText;
        callback();
      } else {
        // Handles errors
        alert("Error: loading " + path + " returned " + req.status);
      }
    };
    // Send the request
    req.send();
  } // Loads an SVG, but sets it as innerHTML, so we can "edit" it in JS
}
