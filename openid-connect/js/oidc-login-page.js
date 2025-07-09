// oidc-login-page.js
// ------------------------------------------------------------------
//
/* jshint esversion: 9 */

(function () {
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
    state: "",
    nonce: "",
    code: "",
    rtype: [],
    scope: [],
    aud: "",
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

  function copyHash(obj) {
    var copy = {};
    Object.keys(model).forEach((key) => {
      const elt = $(key);
      if (elt) {
        model[key] = elt.value;
      }
    });
    if (null !== obj && typeof obj == "object") {
      Object.keys(obj).forEach(function (attr) {
        copy[attr] = Array.isArray(obj[attr]) ? obj[attr].slice() : obj[attr];
      });
    }
    return copy;
  }

  const wrapInSingleQuote = (s) => `'${s}'`;

  function updateLink() {
    let link = linkTemplate,
      copyModel = copyHash(model);
    Object.keys(copyModel).forEach(function (key) {
      let pattern = "${" + key + "}",
        value = "";
      if (copyModel[key] !== null) {
        value =
          typeof copyModel[key] != "string"
            ? copyModel[key].join("+")
            : copyModel[key];
      }
      link = link.replace(pattern, value);
    });

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
        let tokenUrl = model.baseloginurl.replace("/authorize", "/token");
        preBox.innerHTML =
          "<pre>curl -X POST -H content-type:application/x-www-form-urlencoded " +
          wrapInSingleQuote(tokenUrl) +
          " -d " +
          wrapInSingleQuote(new URLSearchParams(payload).toString()) +
          "</pre>";
      }
      if (authzRedemption) authzRedemption.style.display = "block";
    } else {
      if (authzRedemption) authzRedemption.style.display = "none";
    }
  }

  function updateStoredValue(key, value) {
    if (
      key !== "state" &&
      key !== "nonce" &&
      value !== null &&
      typeof value !== "undefined"
    ) {
      if (typeof value == "string") {
        window.localStorage.setItem(APP_ID + ".model." + key, value);
      } else if (value.constructor.name == "Array") {
        window.localStorage.setItem(APP_ID + ".model." + key, value.join("+"));
      }
    }
  }

  function onInputChanged() {
    model[this.id] = this.value;
    updateStoredValue(this.id, this.value);
    if (!initializing) {
      updateLink();
    }
  }

  function onSelectChanged() {
    const selectElt = this;
    const values = Array.from(selectElt.selectedOptions).map(
      (opt) => opt.textContent,
    );
    model[selectElt.name] = values;
    updateStoredValue(selectElt.name, values);
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
          if (typeof model[key] !== "string") {
            // The value is a set of values concatenated by +
            // and the type of form field is Choices.
            if (choices[key]) {
              choices[key].setValue(value.split("+"));
            }
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
    updateStoredValue("code", "");
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
    let tokenUrl = model.baseloginurl.replace("/authorize", "/token");
    fetch(tokenUrl, {
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

    $all("form input[type='text']").forEach((elt) =>
      elt.addEventListener("change", onInputChanged),
    );

    $all("form select").forEach((elt) =>
      elt.addEventListener("change", onSelectChanged),
    );

    choices.rtype = new Choices($sel(".multi-choice.rtype"));
    choices.scope = new Choices($sel(".multi-choice.scope"));

    populateFormFields();

    initializing = false;
    updateLink();
  });
})();
