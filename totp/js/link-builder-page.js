// link-builder-page.js
// ------------------------------------------------------------------
/* jshint esversion: 9 */
/* global base32, Choices */

const $ = (id) => document.getElementById(id),
  $all = (query) => document.querySelectorAll(query);

const model = {
  baseurl: "",
  bcsize: "",
  label: "",
  secret: "",
  base32secret: "",
  issuer: ""
};

const choices = {};

const html5AppId = "5FADBB91-0C35-49F6-BE3F-220B632874C3"; // for localstorage

function updateLink() {
  let baselink = `${model.baseurl}?size=${model.bcsize}&Caption=Scan%20Me&cht=qr&text=@@CHL@@`;
  model.base32secret = base32.rfc4648.encode(model.secret);
  const chl = `otpauth://totp/${model.label}?secret=${model.base32secret}&issuer=${model.issuer}`;
  let link = baselink.replace("@@CHL@@", encodeURIComponent(chl));
  const extraneousDoubleSlashFinder = new RegExp("^(https?://[^/]+)//(.+)$");
  const m = extraneousDoubleSlashFinder.exec(link);
  if (m) {
    link = m[1] + "/" + m[2];
  }
  const totplink = $("totplink");
  totplink.textContent = link;
  totplink.href = link;
}

function saveSetting(key, value) {
  window.localStorage.setItem(`${html5AppId}.model.${key}`, value);
}

function onInputChanged() {
  const name = this.id;
  const value = this.value;
  model[name] = value;
  saveSetting(name, value);
  updateLink();
}

function onSelectChanged() {
  const name = this.name;
  const value = this.value;
  model[name] = value;
  saveSetting(name, value);
  updateLink();
}

function updateModel(event) {
  Object.keys(model).forEach((key) => {
    const item = $(key);
    if (item) {
      const value = item.value;
      model[key] = value;
    }
  });
  updateLink();
  if (event) event.preventDefault();
}

function excludeTransientFields(key) {
  return key != "base32secret"; // keep all
}

function populateFormFields() {
  // load from localStorage
  Object.keys(model)
    .filter(excludeTransientFields)
    .forEach((key) => {
      const value = window.localStorage.getItem(`${html5AppId}.model.${key}`);
      const item = $(key);
      if (item) {
        if (value && value !== "") {
          if (item.tagName === "SELECT") {
            // it's a select/option with Choices.js
            if(choices[key]) {
              choices[key].setChoiceByValue(value);
            }
          } else {
            // simple string
            item.value = value;
          }
        }
      }
    });
}

function resetEverything(event) {
  $("barcodeResult").innerHTML = "";
  updateModel();
  if (event) event.preventDefault();
}

function showBarcode(event) {
  $("barcodeResult").innerHTML = `<img src="${$("totplink").href}" alt="TOTP Barcode">`;
  if (event) event.preventDefault();
}

function copyToClipboard(event) {
  if (event) event.preventDefault();
  const btn = $("btn-copy-link");
  const totplink = $("totplink");
  if (!totplink || !totplink.href) return;

  const textToCopy = totplink.href;

  const showFlash = () => {
    $("totplinkholder").classList.add("copy-to-clipboard-flash-bg");
    if (btn) {
      const label = btn.querySelector(".copy-text");
      if (label) {
        const orig = label.textContent;
        label.textContent = "Copied!";
        setTimeout(() => { label.textContent = orig; }, 1200);
      }
    }
    setTimeout(() => $("totplinkholder").classList.remove("copy-to-clipboard-flash-bg"), 1000);
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(textToCopy).then(showFlash).catch(() => {});
    return;
  }

  const temp = document.createElement("textarea");
  document.body.appendChild(temp);
  temp.value = textToCopy;
  temp.select();
  try {
    if (document.execCommand("copy")) showFlash();
  } catch (_e) {}
  temp.remove();
}

document.addEventListener("DOMContentLoaded", () => {
  choices.bcsize = new Choices($("bcsize"), {
    searchEnabled: false,
    removeItemButton: true
  });
  choices.baseurl = new Choices($("baseurl"), {
    searchEnabled: false,
    removeItemButton: true
  });

  $all("form input[type='text']").forEach((elt) => {
    elt.addEventListener("input", onInputChanged);
    elt.addEventListener("change", onInputChanged);
  });
  $all("form select").forEach((elt) =>
    elt.addEventListener("change", onSelectChanged)
  );
  const form = document.querySelector("form");
  if(form) {
    form.addEventListener("submit", updateModel);
  }

  $("show-barcode").addEventListener("click", showBarcode);
  $("reset-everything").addEventListener("click", resetEverything);

  const copyBtn = $("btn-copy-link");
  if (copyBtn) {
    copyBtn.addEventListener("click", copyToClipboard);
  }

  function showNotes(e) {
    if (e) e.preventDefault();
    const modal = $("notes-modal");
    if (modal) {
      modal.classList.remove("notshown");
      modal.classList.add("shown");
    }
  }

  function closeNotes(e) {
    if (e) e.preventDefault();
    const modal = $("notes-modal");
    if (modal) {
      modal.classList.add("notshown");
      modal.classList.remove("shown");
    }
  }

  $("show-notes").addEventListener("click", showNotes);
  const closeBtn = $("btn-close-notes");
  if (closeBtn) closeBtn.addEventListener("click", closeNotes);
  const dismissBtn = $("btn-dismiss-notes");
  if (dismissBtn) dismissBtn.addEventListener("click", closeNotes);

  const notesModalEl = $("notes-modal");
  if (notesModalEl) {
    notesModalEl.addEventListener("click", (e) => {
      if (e.target === notesModalEl) closeNotes(e);
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeNotes(e);
  });

  populateFormFields();

  updateModel();
});
