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
  use_audience: false,
};
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

  if (copy.use_audience && copy.audience) {
    link += "&audience=" + encodeURIComponent(copy.audience);
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
      let tokenPath = model.baseloginurl.replace("/authorize", model.tokenpath);
      preBox.innerHTML =
        "<pre>curl -X POST -H content-type:application/x-www-form-urlencoded " +
        wrapInSingleQuote(tokenPath) +
        " -d " +
        wrapInSingleQuote(new URLSearchParams(payload).toString()) +
        "</pre>";
    }
    if (authzRedemption) authzRedemption.style.display = "block";
  } else {
    if (authzRedemption) authzRedemption.style.display = "none";
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

function handleUseAudienceChange() {
  const useAudienceCheckbox = $("use_audience"),
    audienceInput = $("audience");
  if (useAudienceCheckbox && audienceInput) {
    audienceInput.disabled = !useAudienceCheckbox.checked;
  }
}

function onInputChanged() {
  model[this.id] = this.type === "checkbox" ? this.checked : this.value;
  updateStoredValue(this.id);
  if (this.id === "use_audience") {
    handleUseAudienceChange();
  }
  if (!initializing) {
    updateLink();
  }
}

// The Choices.js thing, which I included to replace chosen.js, which relied on
// jQuery, seems to duplicate options - if I select an option programmatically
// (as when restoring state fro localstorage), that item is not removed from the
// _available_ options in the dropdown.  So I need to manage the set of choices
// manually; and THAT means I need to keep track in Javascript what the options
// are, rather than relying on the HTML select markup. Every time the selection
// changes I need to reset the available choices. SMH. The documentation on this
// thng is a vague time-waster.
//

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
  let tokenPath = model.baseloginurl.replace("/authorize", model.tokenpath);
  fetch(tokenPath, {
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

document.addEventListener("DOMContentLoaded", () => {
  const btnRedeem = $("btn-redeem");
  if (btnRedeem) btnRedeem.addEventListener("click", invokeRedemption);

  const btnReset = $("btn-reset");
  if (btnReset) btnReset.addEventListener("click", resetRedemption);

  const btnCopy = $("btn-copy");
  if (btnCopy) btnCopy.addEventListener("click", copyToClipboard);

  $all(".btn-reload").forEach((elt) =>
    elt.addEventListener("click", reloadRandomValue),
  );

  $all("form input[type='text'], form input[type='checkbox']").forEach(
    (elt) => {
      if (elt.id) {
        elt.addEventListener("change", onInputChanged);
      }
    },
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
  handleUseAudienceChange();
  fixChoices("rtype");
  fixChoices("scope");

  initializing = false;
  updateLink();
});
