import { LyricsApp } from "./App.js";

let started = false;

const audio = new Audio("audio-tests/GETCHA.mp3");
// audio.currentTime = 28.731; // Start at the first lyrics
document.addEventListener("click", () => {
  if (started) return;
  started = true;
  window.audio = audio; // Expose audio to the global scope for debugging
  const app = new LyricsApp(true);
  app.init();
});

// app.enableDebug();
