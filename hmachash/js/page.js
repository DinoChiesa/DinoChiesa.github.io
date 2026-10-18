// page.js - Hash and HMAC Calculator Controller
// ------------------------------------------------------------------
/* jshint esversion:9, node:false, strict:implied */
/* global window, document, TextEncoder, TextDecoder, crypto, md5 */

(function () {
  "use strict";

  // =========================================================================
  // 1. Constants, DOM Helpers & State Store
  // =========================================================================

  const $ = (id) => document.getElementById(id);
  const $all = (query) => document.querySelectorAll(query);
  const $sel = (query) => document.querySelector(query);

  const utf8Encoder = new TextEncoder();
  const utf8Decoder = new TextDecoder("utf-8", { fatal: true });
  const newlineRegex = /\r\n|\r|\n/g;
  let settingUp = true;

  const Store = {
    prefix: "63894937-8A1F-40F0-8C4C-6656B3B9C056.model.",
    get(name, fallback = "") {
      const val = window.localStorage.getItem(this.prefix + name);
      return val !== null ? val : fallback;
    },
    set(name, value) {
      window.localStorage.setItem(this.prefix + name, String(value));
    },
  };

  const getHashName = () => $("sel-function").value.toUpperCase();
  const getSaltEncoding = () => $("sel-pbkdf2-salt-coding").value;

  function debounce(fn, delay = 100) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // =========================================================================
  // 2. Binary, Hex & Base64 Codec Helpers
  // =========================================================================

  function hexStringToArray(hex) {
    const bytes = [];
    for (let c = 0; c < hex.length; c += 2) {
      bytes.push(parseInt(hex.substr(c, 2), 16));
    }
    return new Uint8Array(bytes).buffer;
  }

  function bufferToHexString(bufferOrU8) {
    const bytes = bufferOrU8 instanceof Uint8Array ? bufferOrU8 : new Uint8Array(bufferOrU8);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  function bufferToBase64(bufferOrU8) {
    const bytes = bufferOrU8 instanceof Uint8Array ? bufferOrU8 : new Uint8Array(bufferOrU8);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  function b64StringToBytes(str) {
    const binary = window.atob(str);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  function b64ToB64url(text) {
    return text.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function arrayToStr(value, coding) {
    if (coding === "utf-8") {
      return utf8Decoder.decode(value);
    }
    if (coding === "hex") {
      return bufferToHexString(value);
    }
    if (coding === "base64") {
      return bufferToBase64(value);
    }
    throw new Error(`Unsupported key encoding: ${coding}`);
  }

  function strToArray(value, coding) {
    if (coding === "utf-8") {
      return utf8Encoder.encode(value);
    }
    if (coding === "hex") {
      return hexStringToArray(value);
    }
    if (coding === "base64") {
      return b64StringToBytes(value);
    }
    throw new Error(`Unsupported key encoding: ${coding}`);
  }

  const getSaltArray = () => strToArray($("pbkdf2-salt").value, getSaltEncoding());

  // =========================================================================
  // 3. Cryptographic Operations (PBKDF2, Digest, HMAC)
  // =========================================================================

  async function getKeyArray(options) {
    const knownCodecs = ["utf-8", "base64", "hex"];

    if (knownCodecs.includes(options.coding)) {
      try {
        const bytes = strToArray(options.keyvalue, options.coding);
        return new Uint8Array(bytes);
      } catch (_e) {
        return new Uint8Array([]);
      }
    }

    if (options.coding === "pbkdf2") {
      const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        utf8Encoder.encode(options.keyvalue),
        { name: "PBKDF2" },
        false,
        ["deriveBits", "deriveKey"],
      );

      const derivedKey = await window.crypto.subtle.deriveKey(
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
      );

      const rawKeyBuffer = await window.crypto.subtle.exportKey("raw", derivedKey);
      const u8 = new Uint8Array(rawKeyBuffer);
      $("pbkdf2-derived-key").value = bufferToHexString(u8);
      return u8;
    }

    throw new Error(`Unknown key encoding: ${options.coding}`);
  }

  async function convertKeyForHmac() {
    const keyArray = await getKeyArray({
      keyvalue: $("secretkey").value,
      coding: $("sel-key-coding").value,
    });

    return window.crypto.subtle.importKey(
      "raw",
      keyArray,
      {
        name: "HMAC",
        hash: { name: getHashName() },
      },
      false,
      ["sign", "verify"],
    );
  }

  async function getHash(message) {
    const algo = getHashName();
    if (algo === "MD-5") {
      const r = md5(message);
      return hexStringToArray(r);
    }
    const data = utf8Encoder.encode(message);
    return crypto.subtle.digest(algo, data);
  }

  function publishResults(resultBuffer, errorMessage) {
    if (errorMessage) {
      $("resultB16").textContent = errorMessage;
      $("resultB64").textContent = "error";
      $("resultB64url").textContent = "error";
    } else if (resultBuffer) {
      const hashHex = bufferToHexString(resultBuffer);
      $("resultB16").textContent = hashHex;

      const hashB64 = bufferToBase64(resultBuffer);
      $("resultB64").textContent = hashB64;
      $("resultB64url").textContent = b64ToB64url(hashB64);
    }

    const output = $("output");
    output.classList.add("shown");
    output.classList.remove("notshown");
  }

  async function calcHmac() {
    const message = $("message").value;
    const key = $("secretkey").value;

    if (!key) {
      publishResults(null, "Please specify a secret key for HMAC computation.");
      return;
    }

    if (getHashName() === "MD-5") {
      publishResults(null, "WebCrypto does not support HMAC with MD-5. Please select SHA-1, SHA-256, SHA-384, or SHA-512.");
      return;
    }

    try {
      const normalizedMessage = message ? message.replace(newlineRegex, "\n") : "";
      const encodedMessage = utf8Encoder.encode(normalizedMessage);
      const cryptoKey = await convertKeyForHmac();
      const hmacBuffer = await crypto.subtle.sign("HMAC", cryptoKey, encodedMessage);
      publishResults(hmacBuffer);
    } catch (e) {
      publishResults(null, e.message || String(e));
    }
  }

  async function calcHash() {
    const message = $("message").value;
    try {
      const normalizedMessage = message ? message.replace(newlineRegex, "\n") : "";
      const hashBuffer = await getHash(normalizedMessage);
      publishResults(hashBuffer);
    } catch (e) {
      publishResults(null, e.message || String(e));
    }
  }

  function calcResult() {
    if (settingUp) return;
    $("hmac").checked ? calcHmac() : calcHash();
  }

  // =========================================================================
  // 4. Change Handlers & Coding Conversions
  // =========================================================================

  function changeText(_event) {
    Store.set("message", $("message").value);
    if (getHashName()) {
      calcResult();
    }
  }

  function changeKey(_event) {
    Store.set("secretkey", $("secretkey").value);
    if (getHashName()) {
      calcResult();
    }
  }

  function changeFunction(event) {
    if (event) event.preventDefault();
    Store.set("sel-function", getHashName());
    calcResult();
  }

  function changeHmac(event) {
    if (event) event.preventDefault();
    const isChecked = $("hmac").checked;
    Store.set("hmac", isChecked);

    $all(".hmac").forEach((elt) => (elt.style.display = isChecked ? "" : "none"));
    $all(".not-hmac").forEach((elt) => (elt.style.display = !isChecked ? "" : "none"));

    if (isChecked) {
      changeKeyEncoding();
    }
    calcResult();
  }

  async function changeInputCoding($elt, $target, newCoding, previousCoding) {
    if (newCoding !== previousCoding) {
      if (newCoding === "utf-8" && previousCoding === "pbkdf2") {
        // Keep existing plain text key
      } else {
        const existingKey = await getKeyArray({
          keyvalue: $target.value,
          coding: previousCoding,
        });

        if (newCoding === "pbkdf2") {
          $target.value = arrayToStr(existingKey, "utf-8");
        } else {
          try {
            $target.value = arrayToStr(existingKey, newCoding);
          } catch (_exc1) {
            // Hex bytes that cannot map directly to UTF-8 are left untouched
          }
        }
      }
      return $target.value;
    }
  }

  async function changeKeyEncoding(event) {
    if (event) event.preventDefault();

    const elt = $("sel-key-coding");
    const newCoding = elt.value;
    const previousCoding = elt.dataset.prev;

    Store.set("sel-key-coding", newCoding);
    $all(".pbkdf2").forEach((e) => (e.style.display = newCoding === "pbkdf2" ? "" : "none"));

    const newKeyValue = await changeInputCoding(elt, $("secretkey"), newCoding, previousCoding);
    if (newKeyValue) {
      Store.set("secretkey", newKeyValue);
    }
    elt.dataset.prev = newCoding;
    calcResult();
  }

  function changeIterations(_event) {
    Store.set("pbkdf2-iterations", $("pbkdf2-iterations").value);
    calcResult();
  }

  function changeSalt(_event) {
    Store.set("pbkdf2-salt", $("pbkdf2-salt").value);
    calcResult();
  }

  async function changeSaltEncoding(event) {
    if (event) event.preventDefault();
    const elt = this;
    const newCoding = elt.value;
    const previousCoding = elt.dataset.prev;

    Store.set(elt.id, newCoding);
    const newSaltValue = await changeInputCoding(elt, $("pbkdf2-salt"), newCoding, previousCoding);
    if (newSaltValue) {
      Store.set("pbkdf2-salt", newSaltValue);
    }
    elt.dataset.prev = newCoding;
  }

  // =========================================================================
  // 5. Test Vectors, Copy-to-Clipboard & Settings Persistence
  // =========================================================================

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
      const value = Store.get(name);
      if (value) {
        if (name === "hmac") {
          $(name).checked = value.toLowerCase() === "true";
        } else if (name.startsWith("sel-")) {
          $(name).value = value.toLowerCase();
        } else {
          $(name).value = value;
        }
      }
    });

    ["sel-key-coding", "sel-pbkdf2-salt-coding"].forEach((name) => {
      const elt = $(name);
      elt.dataset.prev = elt.value;
    });
  }

  function expandAccordion(_event) {
    $sel(".testcases").style.display = "block";
    this.nextElementSibling.style.display = "inline-flex";
    this.style.display = "none";
  }

  function collapseAccordion(_event) {
    $sel(".testcases").style.display = "none";
    this.previousElementSibling.style.display = "inline-flex";
    this.style.display = "none";
  }

  function copyToClipboard(_event) {
    const elt = this;
    const targetId = elt.dataset.target;
    const textHolder = targetId
      ? $(targetId)
      : (elt.closest("span")?.parentElement?.nextElementSibling ||
         elt.parentElement?.querySelector(".code") ||
         elt.closest(".result-card")?.querySelector(".code"));

    if (!textHolder) return false;

    const textToCopy =
      textHolder.tagName === "TEXTAREA" || textHolder.tagName === "INPUT"
        ? textHolder.value
        : textHolder.textContent;

    const showFlash = () => {
      textHolder.classList.add("copy-to-clipboard-flash-bg");
      const label = elt.querySelector(".copy-text");
      if (label) {
        const originalText = label.textContent;
        label.textContent = "Copied!";
        setTimeout(() => { label.textContent = originalText; }, 1200);
      }
      setTimeout(() => textHolder.classList.remove("copy-to-clipboard-flash-bg"), 1000);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textToCopy).then(showFlash).catch(() => {});
      return true;
    }

    const temp = document.createElement("textarea");
    document.body.appendChild(temp);
    temp.value = textToCopy;
    temp.select();
    let success = false;
    try {
      success = window.document.execCommand("copy");
      if (success) showFlash();
    } catch (_e) {
      success = false;
    }
    temp.remove();
    return success;
  }

  function applyTestCase(event) {
    if (event) event.preventDefault();
    const btn = this;
    const alg = btn.dataset.alg;
    const msg = btn.dataset.msg;
    const key = btn.dataset.key;

    $("sel-function").value = alg;
    changeFunction();

    $("message").value = msg;
    changeText();

    if (key) {
      $("hmac").checked = true;
      $("secretkey").value = key;
      changeKey();

      const codingElt = $("sel-key-coding");
      codingElt.value = "utf-8";
      codingElt.dataset.prev = "utf-8";
      Store.set("sel-key-coding", "utf-8");

      $all(".pbkdf2").forEach((e) => (e.style.display = "none"));
      changeHmac();
    } else {
      $("hmac").checked = false;
      changeHmac();
    }

    calcResult();
  }

  // =========================================================================
  // 6. Application Initialization
  // =========================================================================

  document.addEventListener("DOMContentLoaded", () => {
    $("sel-function").addEventListener("change", changeFunction);
    $("sel-function").value = "sha-256";
    $("hmac").addEventListener("change", changeHmac);
    $("sel-key-coding").addEventListener("change", changeKeyEncoding);
    $("sel-pbkdf2-salt-coding").addEventListener("change", changeSaltEncoding);

    const debouncedCalc = debounce(calcResult, 80);
    $("message").addEventListener("input", () => {
      Store.set("message", $("message").value);
      debouncedCalc();
    });
    $("secretkey").addEventListener("input", () => {
      Store.set("secretkey", $("secretkey").value);
      debouncedCalc();
    });

    $("pbkdf2-iterations").addEventListener("input", changeIterations);
    $("pbkdf2-salt").addEventListener("input", changeSalt);

    $all(".copyIconHolder").forEach((elt) => elt.addEventListener("click", copyToClipboard));
    $all(".expand").forEach((elt) => elt.addEventListener("click", expandAccordion));
    $all(".collapse").forEach((elt) => elt.addEventListener("click", collapseAccordion));
    $all(".apply-test").forEach((elt) => elt.addEventListener("click", applyTestCase));

    $all(".collapse").forEach((elt) => (elt.style.display = "none"));
    applySettings();
    changeHmac();
    $sel(".testcases").style.display = "none";
    settingUp = false;

    calcResult();
  });
})();
