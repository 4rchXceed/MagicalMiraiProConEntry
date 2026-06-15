export class SettingsPanel {
  constructor() {
    this.debugModeChbx = document.getElementById("debug-mode");
    this.randomSeedNbrBox = document.getElementById("random-seed");
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
