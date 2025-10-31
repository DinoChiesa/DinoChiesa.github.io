// ------------------------------------------------------------------
//
/* jshint esversion: 9 */

(function () {
  const googleTokenUrl = "https://www.googleapis.com/oauth2/v4/token";
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
  const APP_ID = "B673CC48-1927-46CB-827A-E6E9D7D5103D";

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
    aud: ""
  };

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
    updateLink();
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
          1000
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
      copyModel = freshCopyOfModel();

    if (copyModel.aud && copyModel.scope) {
      copyModel.scope.push("audience:server:client_id:" + copyModel.aud);
      delete copyModel.aud;
    }
    Object.keys(copyModel).forEach(function (key) {
      const pattern = "${" + key + "}";
      if (link.includes(pattern)) {
        let value = "";
        if (copyModel[key] !== null) {
          value =
            typeof copyModel[key] != "string"
              ? copyModel[key].join("+")
              : copyModel[key];
        }
        link = link.replace(pattern, value);
      }
    });
    link = cleanDoubleSlash(link);

    const authzlink = $("authzlink");
    authzlink.textContent = link;
    authzlink.href = link;

    const authzRedemption = $("authzRedemption");
    if (model.code) {
      let payload = {
        grant_type: "authorization_code",
        client_secret: model.clientsecret,
        client_id: model.clientid,
        redirect_uri: model.cburi,
        code: model.code
      };
      const preBox = $("preBox");
      preBox.innerHTML =
        "<pre>curl -X POST -H content-type:application/x-www-form-urlencoded " +
        wrapInSingleQuote(googleTokenUrl) +
        " -d " +
        wrapInSingleQuote(new URLSearchParams(payload).toString()) +
        "</pre>";
      authzRedemption.style.display = "block";
    } else {
      authzRedemption.style.display = "none";
    }
  }

  function onInputChanged() {
    model[this.id] = this.value;
    if (this.id !== "state" && this.id !== "nonce" && this.id !== "code") {
      window.localStorage.setItem(APP_ID + ".model." + this.id, this.value);
    }
    updateLink();
  }

  function onSelectChanged() {
    const selectElt = this;
    let values = choices[selectElt.id].getValue(true);
    model[selectElt.name] = values;
    window.localStorage.setItem(
      APP_ID + ".model." + selectElt.name,
      values.join("+")
    );
    updateLink();
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
          let desiredLength = Number(item.dataset.desiredLength) || 8;
          item.value = randomValue(desiredLength);
        } else if (value && value !== "") {
          if (choices[key]) {
            // The value is a set of values concatenated by +
            choices[key].setValue(value.split("+"));
          } else {
            // value is a simple string, form field type is input.
            item.value = value;
          }
        }
      });
  }

  function resetRedemption(event) {
    if (event) event.preventDefault();
    const preBox = $("preBox");
    if (preBox) preBox.innerHTML = "";
    const code = $("code");
    if (code) code.value = "";
    model.code = "";
    updateLink();
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
      code: model.code
    };

    // NB: This call MAY fail if the server does not include CORS headers in the response
    fetch(googleTokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams(payload)
    })
      .then((response) =>
        response.json().then((json) => ({
          ok: response.ok,
          json
        }))
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
    choices.rtype = new Choices($sel(".multi-choice.rtype"), {
      removeItemButton: true,
      duplicateItemsAllowed: false
    });
    choices.scope = new Choices($sel(".multi-choice.scope"), {
      removeItemButton: true,
      duplicateItemsAllowed: false
    });

    $("btn-redeem").addEventListener("click", invokeRedemption);
    $("btn-reset").addEventListener("click", resetRedemption);
    $("btn-copy").addEventListener("click", copyToClipboard);
    $all(".btn-reload").forEach((elt) =>
      elt.addEventListener("click", reloadRandomValue)
    );

    populateFormFields();

    $all("form input[type='text']").forEach((elt) => {
      if (elt.id) {
        elt.addEventListener("change", onInputChanged);
      }
    });
    $all("form select").forEach((elt) =>
      elt.addEventListener("change", onSelectChanged)
    );

    // initial random values
    $all(".btn-reload").forEach((button) => reloadRandomValue.call(button));

    updateLink();
  });
})();
