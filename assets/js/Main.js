import { LyricsApp } from "./App.js";

// Loads the GET params
const searchParams = new URL(location.href).searchParams;

// Loads the language settings
if (searchParams.has("lang")) {
  document.documentElement.lang =
    searchParams.get("lang") === "en" ? "en" : "jp";
}

// Creates the app
new LyricsApp(
  // Debug?
  searchParams.has("debug") ? searchParams.get("debug") === "true" : false,
  // Random seed
  searchParams.has("seed") ? parseInt(searchParams.get("seed")) : 39,
);
