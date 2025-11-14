// Copyright © 2022-2025 Google LLC.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

// oidc-login-page.js
// ------------------------------------------------------------------
//
/* jshint esversion: 9 */

const cleanDoubleSlash = (function () {
  const re1 = new RegExp("^(https?://)(.+)//(.+)$");
  return (uri) => {
    let m = null;
    do {
      m = re1.exec(uri);
      if (m) {
        uri = m[1] + m[2] + "/" + m[3];
      }
    } while (m);
    return uri;
  };
})();

const $ = (id) => document.getElementById(id),
  $all = (query) => document.querySelectorAll(query),
  $sel = (query) => document.querySelector(query);

const choices = {};
const APP_ID = "63374296-4829-4aeb-be18-54c5437e6522";
const CONFIGURATIONS_KEY = APP_ID + ".configurations";

let linkTemplate =
  "${baseloginurl}?client_id=${clientid}&redirect_uri=${cburi}&response_type=${rtype}&state=${state}&scope=${scope}&nonce=${nonce}";
let model = {
  baseloginurl: "",
  clientid: "",
  clientsecret: "",
  cburi: "",
  tokenpath: "",
  state: "",
  nonce: "",
  code: "",
  rtype: [],
  scope: [],
  audience: "",
  "audience-or-resource": "audience",
};
let saveModal;
let loadModal;
let deleteModal;
let lastLoadedConfigName = null;
let isConfigDirty = false;

let initializing = true;

const randomValue = (len) => {
  let v = "";
  do {
    v += Math.random().toString(36).substring(2, 8);
  } while (v.length < len);
  return v.substring(0, len);
};

function reloadRandomValue() {
  const sourceElementId = this.dataset.target,
    // grab the element to copy
    source = $(sourceElementId),
    desiredLength = Number(source.dataset.desiredLength) || 8,
    newValue = randomValue(desiredLength);
  source.value = newValue;
  model[sourceElementId] = newValue;
  if (!initializing) {
    updateLink();
  }
}

function copyToClipboard() {
  const sourceElementId = this.dataset.target,
    // grab the element to copy
    source = $(sourceElementId),
    // Create a temporary hidden textarea.
    temp = document.createElement("textarea");

  let textToCopy =
    source.tagName == "TEXTAREA" ? source.value : source.textContent;

  document.body.appendChild(temp);
  temp.value = textToCopy;
  temp.select();
  let success;
  try {
    success = document.execCommand("copy");
    if (success) {
      source.classList.add("copy-to-clipboard-flash-bg");
      setTimeout(
        () => source.classList.remove("copy-to-clipboard-flash-bg"),
        1000,
      );
    }
  } catch (e) {
    success = false;
  }
  temp.remove();
  return success;
}

function freshCopyOfModel() {
  // make sure model is consistent with the data in the form
  Object.keys(model).forEach((key) => {
    const elt = $(key);
    if (choices[key]) {
      model[key] = choices[key].getValue(true); // plain array of values
    } else if (elt) {
      model[key] = elt.type === "checkbox" ? elt.checked : elt.value;
    }
  });
  // make a copy
  return JSON.parse(JSON.stringify(model));
}

const wrapInSingleQuote = (s) => `'${s}'`;

const getTokenPath = () =>
  model.tokenpath.startsWith("/")
    ? (() => {
        const url = new URL(model.baseloginurl);
        url.pathname = model.tokenpath;
        return url.toString();
      })()
    : model.tokenpath;

function updateLink() {
  let link = linkTemplate,
    copy = freshCopyOfModel(); // i don't remember why I wanted to copy this
  Object.keys(copy).forEach(function (key) {
    const pattern = "${" + key + "}";
    if (link.includes(pattern)) {
      let value = "";
      if (copy[key] !== null) {
        value = typeof copy[key] != "string" ? copy[key].join("+") : copy[key];
      }
      link = link.replace(pattern, value);
    }
  });

  if (
    copy["audience-or-resource"] &&
    copy["audience-or-resource"] !== "none" &&
    copy.audience
  ) {
    link += `&${copy["audience-or-resource"]}=${encodeURIComponent(copy.audience)}`;
  }

  // I cannot remember why this is here. But it breaks the redirect uri
  //link = cleanDoubleSlash(link);

  const authzlink = $("authzlink");
  if (authzlink) {
    authzlink.textContent = link;
    authzlink.href = link;
  }
  const authzRedemption = $("authzRedemption");
  if (model.code) {
    let payload = {
      grant_type: "authorization_code",
      client_secret: model.clientsecret,
      client_id: model.clientid,
      redirect_uri: model.cburi,
      code: model.code,
    };
    const preBox = $("preBox");
    if (preBox) {
      preBox.innerHTML =
        "<pre>curl -X POST -H content-type:application/x-www-form-urlencoded " +
        wrapInSingleQuote(getTokenPath()) +
        " -d " +
        wrapInSingleQuote(new URLSearchParams(payload).toString()) +
        "</pre>";
    }
    if (authzRedemption) authzRedemption.style.display = "block";
  } else {
    if (authzRedemption) authzRedemption.style.display = "none";
  }
}

function updateConfigNameDisplay() {
  const configNameElt = $("current-config-name");
  if (!configNameElt) return;

  configNameElt.classList.remove("text-danger");

  if (lastLoadedConfigName) {
    configNameElt.textContent = `(loaded: ${lastLoadedConfigName}${isConfigDirty ? "*" : ""})`;
    if (isConfigDirty) {
      configNameElt.classList.add("text-danger");
    }
  } else {
    // No config loaded
    if (isConfigDirty) {
      configNameElt.textContent = "(unsaved changes)";
      configNameElt.classList.add("text-danger");
    } else {
      configNameElt.textContent = "";
    }
  }
}

function updateStoredValue(key) {
  if (key !== "state" && key !== "nonce") {
    let value = model[key];
    if (value !== null && typeof value !== "undefined") {
      if (typeof value == "string" || typeof value == "boolean") {
        window.localStorage.setItem(APP_ID + ".model." + key, value);
      } else if (value.constructor.name == "Array") {
        window.localStorage.setItem(APP_ID + ".model." + key, value.join("+"));
      }
    }
  }
}

function handleAudienceControlChange() {
  const audienceChoice = $("audience-or-resource"),
    audienceInput = $("audience");
  if (audienceChoice && audienceInput) {
    audienceInput.disabled = audienceChoice.value === "none";
  }
}

function onInputChanged() {
  model[this.id] = this.type === "checkbox" ? this.checked : this.value;
  updateStoredValue(this.id);
  if (this.id === "audience-or-resource") {
    handleAudienceControlChange();
  }
  if (!initializing) {
    if (this.id !== "state" && this.id !== "nonce" && this.id !== "code") {
      isConfigDirty = true;
      window.localStorage.setItem(APP_ID + ".isConfigDirty", isConfigDirty);
      updateConfigNameDisplay();
    }
    updateLink();
  }
}

/**
 *
 * The Choices.js thing seems to duplicate options - if I select an option programmatically
 * (as when restoring state from localstorage), that item is not removed from the
 * _available_ options in the dropdown.  So I need to manage the set of choices
 * manually; and THAT means I need to keep track in Javascript what the options
 * are, rather than relying on the HTML select markup. Every time the selection
 * changes I need to reset the available choices. SMH. The documentation on this
 * thng is a vague time-waster.
 *
 ***/
const choiceOptions = {
  rtype: ["", "code", "token", "id_token", "invalid_option"],
  scope: ["", "openid", "email", "profile", "invalid_option"],
};

function fixChoices(key) {
  let values = choices[key].getValue(true); // plain array of values
  choices[key].setChoices(
    choiceOptions[key]
      .filter((item) => !values.includes(item)) // exclude already selected items
      .map((v) => ({ value: v, label: v })),
    "value",
    "label",
    true, // true == replace existing choices
  );
  return values;
}

function onSelectChanged() {
  const selectElt = this;
  let values = [];
  if (choices[this.id]) {
    values = fixChoices(this.id);
  } else {
    // a regular selecrt box
    values = Array.from(selectElt.selectedOptions).map(
      (opt) => opt.textContent,
    );
  }
  model[selectElt.name] = values;
  updateStoredValue(selectElt.name);
  if (!initializing) {
    isConfigDirty = true;
    window.localStorage.setItem(APP_ID + ".isConfigDirty", isConfigDirty);
    updateConfigNameDisplay();
    updateLink();
  }
}

const excludeTransientFields = (key) => key != "code";

function populateFormFields() {
  // get values from local storage, and place into the form
  Object.keys(model)
    .filter(excludeTransientFields)
    .forEach((key) => {
      let value = window.localStorage.getItem(APP_ID + ".model." + key);
      const item = $(key);
      if (!item) return;
      if (key === "state" || key === "nonce") {
        let desiredLength = Number(item.dataset.desiredLength) || 6;
        item.value = randomValue(desiredLength);
      } else if (value && value !== "") {
        if (item.type === "checkbox") {
          item.checked = value === "true";
        } else if (choices[key]) {
          // The value is a set of values concatenated by +
          // and the type of form field is Choices.
          choices[key].setValue(value.split("+"));
        } else {
          // value is a simple string, form field type is input.
          item.value = value;
        }
      }
    });
}

function getStoredConfigurations() {
  const configsJson = window.localStorage.getItem(CONFIGURATIONS_KEY);
  return configsJson ? JSON.parse(configsJson) : [];
}

function storeConfigurations(configs) {
  window.localStorage.setItem(CONFIGURATIONS_KEY, JSON.stringify(configs));
}

function applySettingsToForm(settings) {
  // update the model and form fields from the loaded configuration
  choices.rtype.removeActiveItems();
  choices.scope.removeActiveItems();
  Object.keys(model)
    .filter(excludeTransientFields)
    .forEach((key) => {
      const value = settings[key];
      model[key] = value;
      const item = $(key);
      if (!item) return;

      if (item.type === "checkbox") {
        item.checked = value || false;
      } else if (choices[key]) {
        choices[key].setValue(value || []);
        fixChoices(key);
      } else {
        item.value = value || "";
      }
    });

  // regenerate transient fields that should not be stored
  ["state", "nonce"].forEach((id) => {
    const elt = $(id);
    if (elt) {
      let desiredLength = Number(elt.dataset.desiredLength) || 8;
      const newValue = randomValue(desiredLength);
      elt.value = newValue;
      model[id] = newValue;
    }
  });
  const codeElt = $("code");
  if (codeElt) {
    codeElt.value = "";
    model.code = "";
  }

  handleAudienceControlChange();
  updateLink();
}

function handleSaveConfig() {
  const nameInput = $("config-name");
  const name = nameInput.value.trim();
  if (!name) return;

  const settings = freshCopyOfModel();
  delete settings.state;
  delete settings.nonce;
  delete settings.code;

  let configs = getStoredConfigurations();
  configs = configs.filter((c) => c.name !== name); // remove existing
  configs.unshift({ name, settings }); // add new one to the top
  storeConfigurations(configs);

  lastLoadedConfigName = name;
  isConfigDirty = false;
  window.localStorage.setItem(
    APP_ID + ".lastLoadedConfigName",
    lastLoadedConfigName,
  );
  window.localStorage.setItem(APP_ID + ".isConfigDirty", isConfigDirty);
  updateConfigNameDisplay();
  saveModal.hide();
}

function resetRedemption(event) {
  const preBox = $("preBox");
  if (preBox) preBox.innerHTML = "";
  const code = $("code");
  if (code) code.value = "";
  updateStoredValue("code");
  if (event) event.preventDefault();
}

function invokeRedemption(event) {
  if (event) event.preventDefault();
  const preBox = $("preBox");
  if (!preBox) return;

  let payload = {
    client_id: model.clientid,
    client_secret: model.clientsecret,
    redirect_uri: model.cburi,
    grant_type: "authorization_code",
    code: model.code,
  };

  // NB: This call MAY fail if the server does not include CORS headers in the response
  fetch(getTokenPath(), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(payload),
  })
    .then((response) =>
      response.json().then((json) => ({
        ok: response.ok,
        json,
      })),
    )
    .then(({ ok, json }) => {
      preBox.classList.remove("error");
      let content = JSON.stringify(json, null, 2);
      if (!ok) {
        preBox.classList.add("error");
      }
      preBox.innerHTML =
        '<pre class="access-token-response">' + content + "</pre>";
    })
    .catch((error) => {
      preBox.classList.add("error");
      preBox.innerHTML =
        '<pre class="access-token-response">' +
        "Error: " +
        error.message +
        "</pre>";
    });
}

function debounce(interval, callback) {
  let debounceTimeoutId;
  return function (...args) {
    if (debounceTimeoutId) {
      clearTimeout(debounceTimeoutId);
    }
    debounceTimeoutId = setTimeout(() => callback.apply(this, args), interval);
  };
}

function makeScopeSearch() {
  let lastSearchTerm = "";
  function scopeSearch(event) {
    if (event.detail.resultCount == 0) {
      if (lastSearchTerm == event.detail.value) {
        // add to the list of choices
        let values = choices.scope.getValue(true); // plain array of values
        model.scope = [...values, lastSearchTerm];

        choices.scope.setValue([lastSearchTerm]);
        choices.scope.clearInput();
        updateStoredValue("scope");
        choices.scope.hideDropdown(true);
        updateLink();
      }
      lastSearchTerm = event.detail.value;
      setTimeout(() => {
        lastSearchTerm = "";
      }, 2200);
    }
  }
  return scopeSearch;
}

function handleDeleteConfig() {
  const select = $("config-delete-select");
  const selectedIndex = select.value;
  if (
    selectedIndex === null ||
    selectedIndex === "" ||
    selectedIndex.startsWith("-")
  )
    return;

  let configs = getStoredConfigurations();
  const selectedConfig = configs[selectedIndex];

  if (
    window.confirm(
      `Delete configuration "${selectedConfig.name}"? This cannot be undone.`,
    )
  ) {
    configs.splice(selectedIndex, 1); // remove from array
    storeConfigurations(configs);

    if (lastLoadedConfigName === selectedConfig.name) {
      lastLoadedConfigName = null;
      isConfigDirty = true; // Form now has unsaved data
      window.localStorage.setItem(APP_ID + ".lastLoadedConfigName", "");
      window.localStorage.setItem(APP_ID + ".isConfigDirty", isConfigDirty);
    }

    updateConfigNameDisplay();
    deleteModal.hide();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.addEventListener("message", (event) => {
    if (event.data && event.data.code) {
      const codeElt = $("code");
      if (codeElt) {
        codeElt.value = event.data.code;
        onInputChanged.call(codeElt);
      }
    }
  });

  const darkModeToggle = $("dark-mode-toggle");
  const darkModeKey = APP_ID + ".darkModeEnabled";
  if (darkModeToggle) {
    // on page load, check local storage
    if (localStorage.getItem(darkModeKey) === "true") {
      document.body.classList.add("dark-mode");
      darkModeToggle.checked = true;
    }

    darkModeToggle.addEventListener("change", function () {
      document.body.classList.toggle("dark-mode", this.checked);
      localStorage.setItem(darkModeKey, this.checked);
    });
  }

  saveModal = new bootstrap.Modal($("saveConfigModal"));
  loadModal = new bootstrap.Modal($("loadConfigModal"));
  deleteModal = new bootstrap.Modal($("deleteConfigModal"));

  lastLoadedConfigName = window.localStorage.getItem(
    APP_ID + ".lastLoadedConfigName",
  );
  isConfigDirty =
    window.localStorage.getItem(APP_ID + ".isConfigDirty") === "true";
  updateConfigNameDisplay();

  const btnRedeem = $("btn-redeem");
  if (btnRedeem) btnRedeem.addEventListener("click", invokeRedemption);

  const btnReset = $("btn-reset");
  if (btnReset) btnReset.addEventListener("click", resetRedemption);

  const btnCopy = $("btn-copy");
  if (btnCopy) btnCopy.addEventListener("click", copyToClipboard);

  $("btn-config-menu").addEventListener("click", () => {
    const configs = getStoredConfigurations();
    const loadMenuItem = $("btn-load-config");
    const deleteMenuItem = $("btn-delete-config");
    if (configs.length === 0) {
      loadMenuItem.classList.add("disabled");
      deleteMenuItem.classList.add("disabled");
    } else {
      loadMenuItem.classList.remove("disabled");
      deleteMenuItem.classList.remove("disabled");
    }
  });

  $("btn-save-config").addEventListener("click", (e) => {
    e.preventDefault();
    const nameInput = $("config-name");
    nameInput.value = lastLoadedConfigName || "";

    const datalist = $("config-names-list");
    datalist.innerHTML = "";

    const configs = getStoredConfigurations();
    configs.forEach((config) => {
      const option = document.createElement("option");
      option.value = config.name;
      datalist.appendChild(option);
    });
    saveModal.show();
  });

  $("btn-do-save-config").addEventListener("click", handleSaveConfig);

  $("btn-load-config").addEventListener("click", (e) => {
    e.preventDefault();
    const configs = getStoredConfigurations();
    if (configs.length === 0) return;
    const select = $("config-select");
    select.innerHTML = "";
    configs.forEach((config, index) => {
      const option = document.createElement("option");
      option.value = index;
      option.textContent = `${config.name} (${config.settings.baseloginurl})`;
      select.appendChild(option);
    });
    loadModal.show();
  });

  $("btn-do-load-config").addEventListener("click", () => {
    const select = $("config-select");
    const selectedIndex = select.value;
    if (
      selectedIndex === null ||
      selectedIndex === "" ||
      selectedIndex.startsWith("-")
    )
      return;

    const configs = getStoredConfigurations();
    const selectedConfig = configs[selectedIndex];
    applySettingsToForm(selectedConfig.settings);
    lastLoadedConfigName = selectedConfig.name;
    isConfigDirty = false;
    window.localStorage.setItem(
      APP_ID + ".lastLoadedConfigName",
      lastLoadedConfigName,
    );
    window.localStorage.setItem(APP_ID + ".isConfigDirty", isConfigDirty);
    updateConfigNameDisplay();
    loadModal.hide();
  });

  $("btn-delete-config").addEventListener("click", (e) => {
    e.preventDefault();
    const configs = getStoredConfigurations();
    if (configs.length === 0) return;
    const select = $("config-delete-select");
    select.innerHTML = "";
    configs.forEach((config, index) => {
      const option = document.createElement("option");
      option.value = index;
      option.textContent = config.name;
      select.appendChild(option);
    });
    deleteModal.show();
  });

  $("btn-do-delete-config").addEventListener("click", handleDeleteConfig);

  $("btn-signin").addEventListener("click", () => {
    const authzlink = $("authzlink");
    if (authzlink && authzlink.href) {
      window.open(authzlink.href, "oidc-signin", "width=800,height=600");
    }
  });

  $all(".btn-reload").forEach((elt) =>
    elt.addEventListener("click", reloadRandomValue),
  );

  [
    "form input[type='text']",
    "form input[type='checkbox']",
    "form #audience-or-resource",
  ].forEach((query) =>
    $all(query).forEach((elt) => {
      if (elt.id) {
        elt.addEventListener("change", onInputChanged);
      }
    }),
  );

  $all("form select").forEach((elt) =>
    elt.addEventListener("change", onSelectChanged),
  );

  choices.rtype = new Choices($sel(".multi-choice.rtype"), {
    removeItemButton: true,
    duplicateItemsAllowed: false,
  });

  choices.scope = new Choices($sel(".multi-choice.scope"), {
    removeItemButton: true,
    /* addChoices: true, * // * not supported */
    addItems: true,
    editItems: true,
    duplicateItemsAllowed: false,
  });

  choices.scope.passedElement.element.addEventListener(
    "search",
    debounce(250, makeScopeSearch()),
    false,
  );

  choices.scope.passedElement.element.addEventListener(
    "addItem",
    function (event) {
      console.log(event.detail.id);
      console.log(event.detail.value);
      console.log(event.detail.label);
      console.log(event.detail.customProperties);
      console.log(event.detail.groupValue);
    },
    false,
  );
  populateFormFields();
  handleAudienceControlChange();
  fixChoices("rtype");
  fixChoices("scope");

  initializing = false;
  updateLink();
});
