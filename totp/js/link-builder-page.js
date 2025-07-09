// link-builder-page.js
// ------------------------------------------------------------------
/* jshint esversion: 9 */
/* global $, base32 */

const model = {
  baseurl: "",
  bcsize: "",
  label: "",
  secret: "",
  base32secret: "",
  issuer: "",
};

const html5AppId = "5FADBB91-0C35-49F6-BE3F-220B632874C3"; // for localstorage

function updateLink() {
  const baselink = `${model.baseurl}?size=${model.bcsize}&Caption=Scan%20Me&cht=qr&text=@@CHL@@`;
  model.base32secret = base32.rfc4648.encode(model.secret);
  const chl = `otpauth://totp/${model.label}?secret=${model.base32secret}&issuer=${model.issuer}`;
  const link = baselink.replace("@@CHL@@", encodeURIComponent(chl));
  const extraneousDoubleSlashFinder = new RegExp("^(https?://[^/]+)//(.+)$");
  const m = extraneousDoubleSlashFinder.exec(link);
  if (m) {
    link = m[1] + "/" + m[2];
  }

  $("#totplink").text(link);
  $("#totplink").attr("href", link);
}

function saveSetting(key, value) {
  window.localStorage.setItem(`${html5AppId}.model.${key}`, value);
}

function onInputChanged() {
  var $$ = $(this),
    name = $$.attr("id"),
    value = $$.val();
  model[name] = value;
  saveSetting(name, value);
  updateLink();
}

function onSelectChanged() {
  var $$ = $(this),
    name = $$.attr("name"),
    values = [];
  $$.find("option:selected").each(function () {
    values.push($(this).text());
  });
  model[name] = values;
  saveSetting(name, values[0]);
  updateLink();
}

function updateModel(event) {
  Object.keys(model).forEach(key => {
    const $item = $("#" + key);
    const value = $item.val();
    model[key] = value;
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
      const $item = $("#" + key);
      if ($item.length > 0) {
        if (value && value !== "") {
          if ($item[0].tagName === "SELECT") {
            // it's a select/option
            $item.find(`option[value='${value}']`).prop("selected", "selected");
            $item.trigger("chosen:updated");
          } else {
            // simple string
            $item.val(value);
          }
        }
      }
    });
}

function resetEverything(event) {
  $("#barcodeResult").html("");
  updateModel();
  if (event) event.preventDefault();
}

function showBarcode(event) {
  $("#barcodeResult").html(`<img src="${$("#totplink").attr("href")}">`);
  if (event) event.preventDefault();
}

$(document).ready(function () {
  $("#bcsize").chosen({
    disable_search: true,
    no_results_text: "No matching size...",
    allow_single_deselect: true,
  });
  $("#baseurl").chosen({
    disable_search: true,
    no_results_text: "No matching size...",
    allow_single_deselect: true,
  });

  $("form input[type='text']").change(onInputChanged);
  $("form select").change(onSelectChanged);
  $("form button").submit(updateModel);

  $("#show-barcode").click(showBarcode);
  $("#reset-everything").click(resetEverything);

  populateFormFields();

  updateModel();
});
