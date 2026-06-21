import { MAGIC_NUMBERS } from "./MagicNumbers.js";

export class SettingsPanel {
  constructor() {
    this.translate();
    this.debugModeChbx = document.getElementById("debug-mode");
    this.randomSeedNbrBox = document.getElementById("random-seed");
    this.englishBtn = document.getElementById("english-lang");
    this.japaneseBtn = document.getElementById("japanese-lang");
    this.saveBtn = document.getElementById("save-btn");
    this.searchParams = new URL(location.href).searchParams;
    this.debugModeChbx.checked = this.searchParams.has("debug")
      ? this.searchParams.get("debug") === "true"
      : false;
    this.randomSeedNbrBox.value = this.searchParams.has("seed")
      ? parseInt(this.searchParams.get("seed"))
      : 39;
    if (isNaN(this.randomSeedNbrBox.value)) {
      console.error(this.searchParams.get("seed"), "is no valid int");
      this.randomSeedNbrBox.value = 39;
    }
    this.saveBtn.addEventListener("click", () => this.save());
    this.englishBtn.addEventListener("click", () => this.setEnglish());
    this.japaneseBtn.addEventListener("click", () => this.setJapanese());
  }

  translate() {
    document.querySelectorAll(".text").forEach((element) => {
      if (MAGIC_NUMBERS.TRANSLATIONS[element.dataset.id]) {
        if (document.documentElement.lang === "en") {
          element.textContent =
            MAGIC_NUMBERS.TRANSLATIONS[element.dataset.id].en;
        } else {
          element.textContent =
            MAGIC_NUMBERS.TRANSLATIONS[element.dataset.id].jp;
        }
      }
    });
  }

  setEnglish() {
    const url = location.origin + location.pathname;
    let params = "?seed=" + this.randomSeedNbrBox.value;
    if (this.debugModeChbx.checked) {
      params += "&debug=true";
    }
    params += "&lang=en";
    location.href = url + params;
  }

  setJapanese() {
    const url = location.origin + location.pathname;
    let params = "?seed=" + this.randomSeedNbrBox.value;
    if (this.debugModeChbx.checked) {
      params += "&debug=true";
    }
    params += "&lang=jp";
    location.href = url + params;
  }

  save() {
    const url = location.origin + location.pathname;
    let params = "?seed=" + this.randomSeedNbrBox.value;
    if (this.debugModeChbx.checked) {
      params += "&debug=true";
    }
    location.href = url + params;
  }
}
