import { GLOBAL_VARIABLES } from "./Globals.js";

/**
 * The settings panel.
 * Handles:
 * - The settings (saving/loading)
 * - The page translation
 */
export class SettingsPanel {
  /**
   * Translates the page, registers events and creates SettingsPanel
   */
  constructor() {
    // Translates the page
    this.translate();
    /** Checkbox for debug mode setting */
    this.debugModeChbx = document.getElementById("debug-mode");
    /** Input for random seed */
    this.randomSeedNbrBox = document.getElementById("random-seed");
    /** Button for english translation mode */
    this.englishBtn = document.getElementById("english-lang");
    /** Button for japanese translation mode */
    this.japaneseBtn = document.getElementById("japanese-lang");
    /** Button to save the settings */
    this.saveBtn = document.getElementById("save-btn");
    /** The GET params */
    this.searchParams = new URL(location.href).searchParams;
    // Set the state of the settings to the loaded settings
    this.debugModeChbx.checked = this.searchParams.has("debug")
      ? this.searchParams.get("debug") === "true"
      : false;
    this.randomSeedNbrBox.value = this.searchParams.has("seed")
      ? parseInt(this.searchParams.get("seed"))
      : 39;
    // Quick check for random seed int validity
    if (isNaN(this.randomSeedNbrBox.value)) {
      console.error(this.searchParams.get("seed"), "is no valid int");
      this.randomSeedNbrBox.value = 39;
    }

    // Registers events
    this.saveBtn.addEventListener("click", () => this.save());
    this.englishBtn.addEventListener("click", () => this.setEnglish());
    this.japaneseBtn.addEventListener("click", () => this.setJapanese());
  }

  /**
   * Translates all .text element, translations are in Globals.js -> TRANSLATIONS
   */
  translate() {
    // Select all .text elements
    document.querySelectorAll(".text").forEach((element) => {
      // Uses dataset.id to get the translation id
      if (GLOBAL_VARIABLES.TRANSLATIONS[element.dataset.id]) {
        if (document.documentElement.lang === "en") {
          // If english
          element.textContent =
            GLOBAL_VARIABLES.TRANSLATIONS[element.dataset.id].en;
        } else {
          // If japanese
          element.textContent =
            GLOBAL_VARIABLES.TRANSLATIONS[element.dataset.id].jp;
        }
      }
    });
  }

  /**
   * Update the settings for the language to be english
   */
  setEnglish() {
    // Base url
    const url = location.origin + location.pathname;
    // Creates settings string with the already-def parameters
    // Seed
    let params = "?seed=" + this.randomSeedNbrBox.value;
    // Debug mode
    if (this.debugModeChbx.checked) {
      params += "&debug=true";
    }
    // Set the language
    params += "&lang=en";
    // Go to the page with these parameters
    location.href = url + params;
  }

  /**
   * Update the settings for the language to be japanese
   */
  setJapanese() {
    // Base url
    const url = location.origin + location.pathname;
    // Creates settings string with the already-def parameters
    // Seed
    let params = "?seed=" + this.randomSeedNbrBox.value;
    // Debug mode
    if (this.debugModeChbx.checked) {
      params += "&debug=true";
    }
    // Set the language
    params += "&lang=jp";
    // Go to the page with these parameters
    location.href = url + params;
  }

  /**
   * Saves the base settings
   */
  save() {
    // Base url
    const url = location.origin + location.pathname;
    // Creates settings string with the already-def parameters
    // Seed
    let params = "?seed=" + this.randomSeedNbrBox.value;
    // Debug mode
    if (this.debugModeChbx.checked) {
      params += "&debug=true";
    }
    // Set the language (jp is by default, so no need to set it)
    if (document.documentElement.lang === "en") {
      params += "&lang=en";
    }
    // Go to the page with these parameters
    location.href = url + params;
  }
}
