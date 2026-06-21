import { LyricsApp } from "./App.js";

let started = false;

const audio = new Audio("audio-tests/GETCHA.mp3");
// audio.currentTime = 28.731; // Start at the first lyrics
// document.addEventListener("click", () => {
//   if (started) return;
//   started = true;
const searchParams = new URL(location.href).searchParams;

if (searchParams.has("lang")) {
  document.documentElement.lang =
    searchParams.get("lang") === "en" ? "en" : "jp";
}

audio.onloadedmetadata = () => {
  const app = new LyricsApp(
    audio,
    searchParams.has("debug") ? searchParams.get("debug") === "true" : false,
    searchParams.has("seed") ? parseInt(searchParams.get("seed")) : 39,
  );
};
// });

// app.enableDebug();
