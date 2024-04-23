// okta-login-page.js
// ------------------------------------------------------------------
//
// This demonstrates a signin with a PKCE challenge and verifier.
//
/* jshint esversion: 9, browser:true, strict:implied */
/* global $, TextEncoder, URLSearchParams */

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

  const html5AppId = "32649BAF-6FA5-4725-B992-5E48CDD37AE2",
    endpointTemplate = "https://${oktadomain}/oauth2/${authzserver}",
    linkParams = [
      "max_age=${maxage}",
      "client_id=${clientid}",
      "response_type=${rtype}",
      "scope=${scope}",
      "state=${state}",
      "redirect_uri=${cburi}",
      "code_challenge_method=S256",
      "code_challenge=${pkce_challenge}"
    ];

  const model = {
    oktadomain: "",
    authzserver: "",
    clientid: "",
    clientsecret: "",
    maxage: "",
    cburi: "",
    state: "",
    verifier: "",
    code: "",
    rtype: [],
    scope: []
  };

  const updateLocalStore = () => {
    Object.keys(model).forEach((key) => {
      if (key !== "state" && key !== "nonce") {
        const value =
          typeof model[key] != "string" ? model[key].join("+") : model[key];
        if (value !== null && typeof value !== "undefined") {
          window.localStorage.setItem(html5AppId + ".model." + key, value);
        }
      }
    });
  };

  const applyTemplate = (template, encoder) => {
    encoder = encoder || ((v) => v);
    let t = template;
    const re1 = new RegExp("\\${([^}]+)}");
    let m = null;
    do {
      m = re1.exec(t);
      if (m && m[1] in model) {
        t =
          t.slice(0, m.index) +
          encoder(model[m[1]]) +
          t.slice(m.index + m[0].length);
      }
    } while (m && m[1] in model);
    return t;
  };

  //   const m = re1.exec(t);
  //   Object.keys(model).forEach((key) => {
  //     const pattern = "${" + key + "}";
  //     let value = "";
  //     if (model[key] !== null) {
  //       value =
  //         typeof model[key] != "string" ? model[key].join("+") : model[key];
  //       if (wantStore) {
  //         if (
  //           key !== "state" &&
  //           key !== "nonce" &&
  //           value !== null &&
  //           typeof value !== "undefined"
  //         ) {
  //           window.localStorage.setItem(html5AppId + ".model." + key, value);
  //         }
  //       }
  //     }
  //     t = t.replace(pattern, encoder(value));
  //   });
  //   return t;
  // };

  const oktaAuthz = () => applyTemplate(endpointTemplate);

  const randomValue = (len) => {
    let v = "";
    do {
      v += Math.random().toString(36).substring(2, 8);
    } while (v.length < len);
    return v.substring(0, len);
  };

  function reloadRandomValue(_event) {
    let $elt = $(this),
      sourceElement = $elt.data("target"),
      // grab the element to copy
      $source = $("#" + sourceElement),
      desiredLength = Number($source.data("desired-length")) || 8,
      newValue = randomValue(desiredLength);
    $source.val(newValue);
    model[sourceElement] = newValue;
    updateLink();
  }

  const sha256 = (message) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    return window.crypto.subtle.digest("SHA-256", data);
  };

  const bufferToBase64UrlEncoded = (input) => {
    const bytes = new Uint8Array(input);
    return urlEncodeBase64(window.btoa(String.fromCharCode(...bytes)));
  };

  const urlEncodeBase64 = (input) => {
    const chars = { "+": "-", "/": "_", "=": "" };
    return input.replace(/[\+\/=]/g, (m) => chars[m]);
  };

  const sha256base64 = async (msg) => {
    const shaBuffer = await sha256(msg);
    const encoded = bufferToBase64UrlEncoded(shaBuffer);
    return encoded;
  };

  function copyToClipboard(event) {
    let $elt = $(this),
      sourceElement = $elt.data("target"),
      // grab the element to copy
      $source = $("#" + sourceElement),
      // Create a temporary hidden textarea.
      $temp = $("<textarea>");

    let textToCopy =
      $source[0].tagName == "TEXTAREA" ? $source.val() : $source.text();

    $("body").append($temp);
    $temp.val(textToCopy).select();
    let success;
    try {
      success = document.execCommand("copy");
      if (success) {
        $source
          .addClass("copy-to-clipboard-flash-bg")
          .delay("1000")
          .queue((_) =>
            $source.removeClass("copy-to-clipboard-flash-bg").dequeue()
          );
      }
    } catch (e) {
      success = false;
    }
    $temp.remove();
    return success;
  }

  async function updateLink() {
    updateLocalStore();
    let link =
      oktaAuthz() +
      "/v1/authorize?" +
      applyTemplate(linkParams.join("&"), encodeURIComponent);

    link = link.replace(
      "${pkce_challenge}",
      await sha256base64(model.verifier)
    );

    link = cleanDoubleSlash(link);

    $("#authzlink").text(link);
    $("#authzlink").attr("href", link);

    if (model.code) {
      const payload = {
        grant_type: "authorization_code",
        client_id: model.clientid,
        /*
         * Omit client_secret for okta app type: SPA.
         * Include client_secret for Okta app type: Web app.
         **/
        //client_secret: model.clientsecret,
        code_verifier: model.verifier,
        redirect_uri: model.cburi,
        code: model.code
      };
      $("#preBox").html(
        "<pre>curl -i -X POST -H content-type:application/x-www-form-urlencoded " +
          `'${cleanDoubleSlash(oktaAuthz() + "/v1/token")}'` +
          ` -d '${new URLSearchParams(payload)}'` +
          //wrapInSingleQuote($.param(payload)) +
          "</pre>"
      );
      $("#authzRedemption").show();
    } else {
      $("#authzRedemption").hide();
    }
  }

  function onInputChanged() {
    const $this = $(this);
    model[$this.attr("id")] = $this.val();
    updateLink();
  }

  function onSelectChanged() {
    let $$ = $(this),
      name = $$.attr("name"),
      values = [];
    $$.find("option:selected").each(function () {
      values.push($(this).text());
    });
    model[name] = values;
    updateLink();
  }

  function updateModel(event) {
    Object.keys(model).forEach((key) => (model[key] = $("#" + key).val()));
    updateLink();
    if (event) event.preventDefault();
  }

  //const excludeTransientFields = key => key != 'code' && key != 'verifier';

  function populateFormFields() {
    // get values from local storage, and place into the form
    Object.keys(model)
      //.filter(excludeTransientFields)
      .forEach((key) => {
        const value = window.localStorage.getItem(html5AppId + ".model." + key);
        const $item = $("#" + key);
        if (key === "state" || key === "verifier") {
          const desiredLength = Number($item.data("desired-length")) || 8;
          $item.val(randomValue(desiredLength));
        } else if (key === "code") {
          // no-op
        } else if (typeof model[key] !== "string") {
          // Kind of an indirect test, but in this case, the value is a set of
          // values concatenated by + and the type of form field is select.

          value.split("+").forEach((part) => {
            $item
              .find("option[value='" + part + "']")
              .prop("selected", "selected");
          });
          $item.trigger("chosen:updated");
        } else {
          // value is a simple string, form field type is input.
          $item.val(value);
        }
      });
  }

  function hyperJwt(s) {
    const re1 = new RegExp(`"(eyJ[^."]+\.[^."]+\.[^."]+)"`);
    const jwtlink = (jwt) => `https://dinochiesa.github.io/jwt/#${jwt}`;
    let m = null;
    do {
      m = re1.exec(s);
      if (m) {
        s =
          s.slice(0, m.index) +
          `"<a href='${jwtlink(m[1])}' title='click to decode'>${m[1]}</a>"` +
          s.slice(m.index + m[0].length);
      }
    } while (m);
    return s;
  }

  function resetRedemption(event) {
    if (event) {
      event.preventDefault();
    }
    $("#preBox").html("");
    $("#code").val("");
    updateModel();
  }

  async function invokeRedemption(event) {
    if (event) event.preventDefault();
    const payload = {
      grant_type: "authorization_code",
      client_id: model.clientid,
      /*
       * Omit client_secret for okta app type: SPA.
       * Include client_secret for Okta app type: Web app.
       **/
      //client_secret: model.clientsecret,
      client_secret: model.clientsecret,
      code_verifier: model.verifier,
      redirect_uri: model.cburi,
      code: model.code
    };

    // NB: This call will fail if the server does not include CORS headers in the response
    // Does Okta?
    const url = cleanDoubleSlash(oktaAuthz() + "/v1/token");
    const options = {
      method: "POST",
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams(payload)
    };

    return fetch(url, options)
      .then(async (res) => [res.status, await res.json()])
      .then(([status, json]) => {
        if (status == 200) {
          $("#preBox")
            .removeClass("error")
            .html(
              '<pre class="access-token-response">' +
                hyperJwt(JSON.stringify(json, null, 2)) +
                "</pre>"
            );
        } else {
          $("#preBox")
            .addClass("error")
            .html(
              '<pre class="access-token-response">' +
                JSON.stringify(json, null, 2) +
                "</pre>"
            );
        }
      })
      .catch((_e) => {
        $("#preBox")
          .addClass("error")
          .html(`<pre class="access-token-response">${_e.toString()}</pre>`);
      });
  }

  $(document).ready(function () {
    $(".rtype-chosen").chosen({
      no_results_text: "No matching response types...",
      allow_single_deselect: true
    });
    $(".scope-chosen").chosen({
      no_results_text: "No matching scopes...",
      allow_single_deselect: true
    });

    $("#btn-redeem").on("click", invokeRedemption);
    $("#btn-reset").on("click", resetRedemption);
    $("#btn-copy").on("click", copyToClipboard);
    $(".btn-reload").on("click", reloadRandomValue);

    populateFormFields();

    $("form input[type='text']").change(onInputChanged);
    $("form select").change(onSelectChanged);
    $("form button").submit(updateModel);

    updateModel();
  });
})();
