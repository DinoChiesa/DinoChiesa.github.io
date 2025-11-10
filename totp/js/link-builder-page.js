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
let notesModal;

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
  $("barcodeResult").innerHTML = `<img src="${$("totplink").href}">`;
  if (event) event.preventDefault();
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

  $all("form input[type='text']").forEach((elt) =>
    elt.addEventListener("change", onInputChanged)
  );
  $all("form select").forEach((elt) =>
    elt.addEventListener("change", onSelectChanged)
  );
  const form = document.querySelector("form");
  if(form) {
    form.addEventListener("submit", updateModel);
  }

  $("show-barcode").addEventListener("click", showBarcode);
  $("reset-everything").addEventListener("click", resetEverything);

  notesModal = new bootstrap.Modal($("notes-modal"));
  $("show-notes").addEventListener("click", () => notesModal.show());

  populateFormFields();

  updateModel();
});
