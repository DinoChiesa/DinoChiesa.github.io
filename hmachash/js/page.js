// page.js
// ------------------------------------------------------------------

/* jshint esversion:9, node:false, strict:implied */
/* global window, console, Blob, TextEncoder, TextDecoder, crypto, md5 */

(function () {
  const $ = (id) => document.getElementById(id),
    $all = (query) => document.querySelectorAll(query),
    $sel = (query) => document.querySelector(query);

  const newlineRegex = new RegExp("(\r\n|\n)", "g"),
    utf8Encoder = new TextEncoder(),
    appId = "63894937-8A1F-40F0-8C4C-6656B3B9C056";
  let settingUp = true;

  const getHashName = () => $("sel-function").value.toUpperCase();

  function hexStringToArray(hex) {
    // convert hex string to bytes
    const bytes = [];
    for (let c = 0; c < hex.length; c += 2)
      bytes.push(parseInt(hex.substr(c, 2), 16));
    return new Uint8Array(bytes).buffer;
  }

  // function arrayToHexString_FOR_SOME_REASON_THIS_FAILS_AT_INDEX_9_IN_SOME_CASES(hashArray) {
  //   // convert bytes to hex string
  //   const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  //   return hashHex;
  // }

  // convert bytes to hex string
  const arrayToHexString = (hashArray) =>
    hashArray.map((i) => i.toString(16).padStart(2, "0")).join("");

  const arrayToB64String = (u8) =>
    window.btoa(String.fromCharCode.apply(null, u8));

  const b64StringToArray = (str) =>
    window
      .atob(str)
      .split("")
      .map((c) => c.charCodeAt(0));

  function arrayToStr(value, coding) {
    if (coding == "utf-8") {
      return new TextDecoder("utf-8", { fatal: true }).decode(value);
    }
    if (coding == "hex") {
      return arrayToHexString(value);
    }
    if (coding == "base64") {
      return arrayToB64String(value);
    }
    throw new Error("unsupported key encoding: " + coding);
  }

  function strToArray(value, coding) {
    if (coding == "utf-8") {
      return utf8Encoder.encode(value);
    }
    if (coding == "hex") {
      return hexStringToArray(value);
    }
    if (coding == "base64") {
      return b64StringToArray(value);
    }
    throw new Error("unsupported key encoding: " + coding);
  }

  const getSaltArray = () =>
    strToArray($("pbkdf2-salt").value, getSaltEncoding());

  function getKeyArray(options) {
    // returns a Promise which will be fulfilled with a Uint8Array containing the key.
    const knownCodecs = ["utf-8", "base64", "hex"];

    if (knownCodecs.indexOf(options.coding) >= 0) {
      let b = null;
      try {
        b = strToArray(options.keyvalue, options.coding);
      } catch (e) {
        // bad coding: either bad length, invalid chars for the given coding, etc.
        b = [];
      }
      return Promise.resolve(new Uint8Array(b));
    }

    if (options.coding == "pbkdf2") {
      const keyUsages = ["deriveBits", "deriveKey"];
      return window.crypto.subtle
        .importKey(
          "raw",
          utf8Encoder.encode(options.keyvalue),
          { name: "PBKDF2" },
          false, // extractable,
          keyUsages,
        )
        .then((keyMaterial) =>
          window.crypto.subtle.deriveKey(
            {
              name: "PBKDF2",
              salt: getSaltArray(),
              iterations: Number($("pbkdf2-iterations").value),
              hash: "SHA-256",
            },
            keyMaterial,
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"],
          ),
        )
        .then((key) => window.crypto.subtle.exportKey("raw", key))
        .then((a) => new Uint8Array(a))
        .then((u8) => {
          $("pbkdf2-derived-key").value = arrayToHexString(u8);
          return u8;
        });
    }

    throw new Error("unknown key encoding: " + options.coding); // will not happen
  }

  function getHash(message) {
    const algo = getHashName();
    if (algo == "MD-5") {
      const r = md5(message); // md5('abc') = 900150983cd24fb0d6963f7d28e17f72
      return Promise.resolve(hexStringToArray(r));
    }

    const data = utf8Encoder.encode(message);
    return crypto.subtle.digest(algo, data);
    // The result is a Promise that  returns an ArrayBuffer
  }

  // function eraseResults() {
  //   $("#resultB16").text("");
  //   $("#resultB64").text("");
  //   $("#output").addClass("notshown").removeClass("shown");
  // }

  const arrayToBase64 = (bytes) =>
    window.btoa(bytes.map((b) => String.fromCharCode(b)).join(""));

  function b64ToB64url(text) {
    return text
      .replace(new RegExp("\\+", "g"), "-")
      .replace(new RegExp("/", "g"), "_")
      .replace(new RegExp("=+$"), "");
  }

  function publishResults(resultBuffer, errorMessage) {
    if (errorMessage) {
      $("resultB16").textContent = errorMessage;
      $("resultB64").textContent = "error";
      $("resultB64url").textContent = "error";
    } else if (resultBuffer) {
      // convert buffer to byte array
      const hashArray = Array.from(new Uint8Array(resultBuffer));
      const hashInBase16 = arrayToHexString(hashArray);
      $("resultB16").textContent = hashInBase16;
      const hashInBase64 = arrayToBase64(hashArray);
      $("resultB64").textContent = hashInBase64;
      $("resultB64url").textContent = b64ToB64url(hashInBase64);
    }
    const output = $("output");
    output.classList.add("shown");
    output.classList.remove("notshown");
  }

  function getSaltEncoding() {
    const label = "sel-pbkdf2-salt-coding";
    return $(label).value;
  }

  async function convertKeyForHmac(key) {
    const keyArray = await getKeyArray({
      keyvalue: $("secretkey").value,
      coding: $("sel-key-coding").value,
    });
    return window.crypto.subtle.importKey(
      "raw", // raw format of the key - should be Uint8Array
      keyArray,
      {
        // algorithm details
        name: "HMAC",
        hash: { name: getHashName() },
      },
      false, // export = false
      ["sign", "verify"], // what this key can do
    );
  }

  function calcHmac() {
    let message = $("message").value;
    const key = $("secretkey").value;
    if (message != null && key) {
      message = utf8Encoder.encode(message.replace(newlineRegex, "\n"));
      return convertKeyForHmac(key)
        .then((key) => crypto.subtle.sign("HMAC", key, message))
        .then((arrayBuffer) => publishResults(arrayBuffer))
        .catch((e) => publishResults(null, e));
    } else {
      publishResults(null, "You must specify a message and a key");
    }
  }

  function calcHash() {
    let message = $("message").value;
    if (message != null) {
      const re1 = new RegExp("(\r\n|\n)", "g");
      message = message.replace(re1, "\n");
      getHash(message)
        .then((hashBuffer) => publishResults(hashBuffer))
        .catch((e) => publishResults(null, e));
    }
  }

  function calcResult() {
    if (settingUp) return;
    $("hmac").checked ? calcHmac() : calcHash();
  }

  function changeText(_event) {
    const message = $("message").value;
    window.localStorage.setItem(appId + ".model.message", message);
    if (getHashName()) {
      calcResult();
    }
  }

  function changeKey(_event) {
    const key = $("secretkey").value;
    window.localStorage.setItem(appId + ".model.secretkey", key);
    if (getHashName()) {
      calcResult();
    }
  }

  function changeFunction(event) {
    if (event) {
      event.preventDefault();
    }
    window.localStorage.setItem(appId + ".model.sel-function", getHashName());
    calcResult();
  }

  function changeHmac(event) {
    if (event) {
      event.preventDefault();
    }

    const isChecked = $("hmac").checked;
    window.localStorage.setItem(appId + ".model.hmac", "" + isChecked);
    // display or hide the key as appropriate
    $all(".hmac").forEach(
      (elt) => (elt.style.display = isChecked ? "" : "none"),
    );
    $all(".not-hmac").forEach(
      (elt) => (elt.style.display = !isChecked ? "" : "none"),
    );
    if (isChecked) {
      changeKeyEncoding();
    }
    calcResult();
  }

  async function changeInputCoding($elt, $target, newCoding, previousCoding) {
    if (newCoding != previousCoding) {
      // When the coding changes, try to re-encode the existing key.
      // This will not always work nicely when switching to UTF-8.
      // It may result in a utf-8 string with unicode escape sequences, eg \u000b.
      if (newCoding == "utf-8" && previousCoding == "pbkdf2") {
        // do nothing - just keep the existing text key
      } else {
        const existingKey = await getKeyArray({
          keyvalue: $target.value,
          coding: previousCoding,
        });
        if (newCoding == "pbkdf2") {
          $target.value = arrayToStr(existingKey, "utf-8");
        } else {
          try {
            const value = arrayToStr(existingKey, newCoding);
            $target.value = value;
          } catch (_exc1) {
            // Not possible to convert all hex-encoded keys to UTF-8.
            // do nothing
          }
        }
      }
      return $target.value;
    }
  }

  async function changeKeyEncoding(event) {
    if (event) {
      event.preventDefault();
    }
    // handle coding switch to keep the key the same
    const elt = $("sel-key-coding"),
      newCoding = elt.value,
      previousCoding = elt.dataset.prev;

    window.localStorage.setItem(`${appId}.model.sel-key-coding`, newCoding);
    $all(".pbkdf2").forEach(
      (e) => (e.style.display = newCoding == "pbkdf2" ? "" : "none"),
    );

    const newKeyValue = await changeInputCoding(
      elt,
      $("secretkey"),
      newCoding,
      previousCoding,
    );
    if (newKeyValue) {
      window.localStorage.setItem(appId + ".model.secretkey", newKeyValue);
    }
    elt.dataset.prev = newCoding;
    // In the ideal case, the hmac result does not change with a key coding change,
    // but in some cases a coding change is not possible and the key changes.
    // So update the result.
    calcResult();
  }

  function changeIterations(event) {
    let label = "pbkdf2-iterations",
      iterations = $(label).value;
    window.localStorage.setItem(`${appId}.model.${label}`, iterations);
    calcResult();
  }

  function changeSalt(event) {
    const label = "pbkdf2-salt",
      salt = $(label).value;
    window.localStorage.setItem(`${appId}.model.${label}`, salt);
    calcResult();
  }

  async function changeSaltEncoding(event) {
    if (event) {
      event.preventDefault();
    }
    const elt = this,
      id = elt.id,
      newCoding = elt.value,
      previousCoding = elt.dataset.prev;

    window.localStorage.setItem(`${appId}.model.${id}`, newCoding);
    // await getKeyArray({
    //   keyvalue : $('key').value,
    //   coding: $('sel-key-coding').value
    // });
    const label = "pbkdf2-salt",
      newSaltValue = await changeInputCoding(
        elt,
        $(label),
        newCoding,
        previousCoding,
      );
    if (newSaltValue) {
      window.localStorage.setItem(`${appId}.model.${label}`, newSaltValue);
    }
    elt.dataset.prev = newCoding;
  }

  function applySettings() {
    const propNames = [
      "secretkey",
      "message",
      "hmac",
      "sel-function",
      "sel-key-coding",
      "pbkdf2-iterations",
      "pbkdf2-salt",
      "sel-pbkdf2-salt-coding",
    ];
    propNames.forEach((name) => {
      const value = window.localStorage.getItem(appId + ".model." + name);
      if (value) {
        if (name == "hmac") {
          $(name).checked = value.toLowerCase() == "true";
        } else if (name.startsWith("sel-")) {
          $(name).value = value.toLowerCase();
        } else {
          $(name).value = value;
        }
      }
    });

    // record previous
    ["sel-key-coding", "sel-pbkdf2-salt-coding"].forEach((name) => {
      const elt = $(name);
      elt.dataset.prev = elt.value;
    });
  }

  function expandAccordion(_event) {
    const elt = this;
    //$elt.next('div').slideDown();
    $sel(".testcases").style.display = "block";
    elt.nextElementSibling.style.display = "inline";
    elt.style.display = "none";
  }

  function collapseAccordion(_event) {
    const elt = this;
    //$elt.next('div').slideUp();
    $sel(".testcases").style.display = "none";
    elt.previousElementSibling.style.display = "inline";
    elt.style.display = "none";
  }

  function copyToClipboard(_event) {
    const elt = this,
      textHolder = elt.closest("span").parentElement.nextElementSibling,
      // Create a temporary hidden textarea.
      temp = document.createElement("textarea");

    const textToCopy =
      textHolder.tagName == "TEXTAREA" || textHolder.tagName == "INPUT"
        ? textHolder.value
        : textHolder.textContent;

    document.body.appendChild(temp);
    temp.value = textToCopy;
    temp.select();
    let success;
    try {
      success = window.document.execCommand("copy");
      if (success) {
        // Animation to indicate copy.
        textHolder.classList.add("copy-to-clipboard-flash-bg");
        setTimeout(
          () => textHolder.classList.remove("copy-to-clipboard-flash-bg"),
          1000,
        );
      }
    } catch (_e) {
      success = false;
    }
    temp.remove();
    return success;
  }

  function applyTestCase(event) {
    if (event) {
      event.preventDefault();
    }
    const btn = this,
      alg = btn.dataset.alg,
      msg = btn.dataset.msg,
      key = btn.dataset.key; // "secret" or ""

    $("sel-function").value = alg;
    changeFunction();

    $("message").value = msg;
    changeText();

    if (key) {
      $("hmac").checked = true;
      $("secretkey").value = key;
      changeKey();

      // Force key encoding to UTF-8
      const props = {
        "sel-key-coding": "utf-8",
        "sel-pbkdf2-salt-coding": "utf-8",
      };

      // We also strictly set the salt coding to UTF-8, though
      // strictly speaking it wasn't requested, it's consistent.
      // But the user ONLY asked for sel-key-coding. I will stick to that.

      const codingElt = $("sel-key-coding");
      codingElt.value = "utf-8";
      // Update dataset.prev to match so future changes don't try to convert from wrong type
      codingElt.dataset.prev = "utf-8";
      window.localStorage.setItem(`${appId}.model.sel-key-coding`, "utf-8");

      // Hide PBKDF2 fields if they were shown
      $all(".pbkdf2").forEach((e) => (e.style.display = "none"));

      changeHmac();
    } else {
      $("hmac").checked = false;
      changeHmac();
    }
    // Final calculation to ensure everything is synced
    calcResult();
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("sel-function").addEventListener("change", changeFunction);
    $("sel-function").value = "sha-256";
    $("hmac").addEventListener("change", changeHmac);
    $("sel-key-coding").addEventListener("change", changeKeyEncoding);
    $("sel-pbkdf2-salt-coding").addEventListener("change", changeSaltEncoding);
    $("message").addEventListener("input", changeText);
    $("secretkey").addEventListener("input", changeKey);
    $("pbkdf2-iterations").addEventListener("input", changeIterations);
    $("pbkdf2-salt").addEventListener("input", changeSalt);
    $all(".copyIconHolder").forEach((elt) =>
      elt.addEventListener("click", copyToClipboard),
    );
    $all(".expand").forEach((elt) =>
      elt.addEventListener("click", expandAccordion),
    );
    $all(".collapse").forEach((elt) =>
      elt.addEventListener("click", collapseAccordion),
    );
    $all(".apply-test").forEach((elt) =>
      elt.addEventListener("click", applyTestCase),
    );
    $all(".collapse").forEach((elt) => (elt.style.display = "none"));
    applySettings();
    changeHmac();
    //changeKeyEncoding();
    $sel(".testcases").style.display = "none";
    settingUp = false;

    calcResult();
  });
})();
