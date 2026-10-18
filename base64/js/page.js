// page.js - Base64 Encoder & Decoder Controller
// ------------------------------------------------------------------
/* jshint esversion:9, node:false, strict:implied */
/* global window, document, TextEncoder, TextDecoder */

(function () {
  "use strict";

  // =========================================================================
  // 1. DOM Helpers, Codecs & State Store
  // =========================================================================

  const $ = (id) => document.getElementById(id);
  const $all = (query) => document.querySelectorAll(query);
  const $sel = (query) => document.querySelector(query);

  const utf8Encoder = new TextEncoder();
  const utf8Decoder = new TextDecoder("utf-8", { fatal: true });
  const newlineRegex = /\r\n|\r|\n/g;

  const Store = {
    prefix: "D832A9C0-5621-4F91-9F3B-BASE64APP.model.",
    get(name, fallback = "") {
      const val = window.localStorage.getItem(this.prefix + name);
      return val !== null ? val : fallback;
    },
    set(name, value) {
      window.localStorage.setItem(this.prefix + name, String(value));
    },
  };

  function debounce(fn, delay = 80) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function getOperation() {
    return $("operation").value.toUpperCase();
  }

  function b64ToB64url(text) {
    return text.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function utf8ToBase64(str) {
    const bytes = utf8Encoder.encode(str);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  function base64ToUtf8(str) {
    const cleaned = str.trim();
    if (!cleaned) return "";

    // Normalize URL-safe characters to standard Base64
    const normalized = cleaned.replace(/-/g, "+").replace(/_/g, "/");
    // Add missing padding
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);

    const binary = window.atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return utf8Decoder.decode(bytes);
  }

  // =========================================================================
  // 2. Core Calculation & UI Updates
  // =========================================================================

  function calcResult() {
    const rawMessage = $("text").value;
    const op = getOperation();
    const encodedOutput = $("output_encoded");
    const decodedOutput = $("output_decoded");

    if (!rawMessage) {
      $("resultB64").textContent = "";
      $("resultB64url").textContent = "";
      $("resultPlain").textContent = "";
      encodedOutput.classList.add("notshown");
      encodedOutput.classList.remove("shown");
      decodedOutput.classList.add("notshown");
      decodedOutput.classList.remove("shown");
      return;
    }

    if (op === "ENCODE") {
      try {
        const normalizedMessage = rawMessage.replace(newlineRegex, "\n");
        const b64 = utf8ToBase64(normalizedMessage);
        const b64url = b64ToB64url(b64);

        $("resultB64").textContent = b64;
        $("resultB64url").textContent = b64url;

        encodedOutput.classList.add("shown");
        encodedOutput.classList.remove("notshown");
        decodedOutput.classList.add("notshown");
        decodedOutput.classList.remove("shown");
      } catch (err) {
        $("resultB64").textContent = "Encoding error: " + err.message;
        $("resultB64url").textContent = "error";
        encodedOutput.classList.add("shown");
        encodedOutput.classList.remove("notshown");
      }
    } else if (op === "DECODE") {
      try {
        const plain = base64ToUtf8(rawMessage);
        $("resultPlain").textContent = plain;
        decodedOutput.classList.add("shown");
        decodedOutput.classList.remove("notshown");
        encodedOutput.classList.add("notshown");
        encodedOutput.classList.remove("shown");
      } catch (exc) {
        $("resultPlain").textContent =
          "Cannot decode into a UTF-8 string: " + (exc.message || String(exc));
        decodedOutput.classList.add("shown");
        decodedOutput.classList.remove("notshown");
        encodedOutput.classList.add("notshown");
        encodedOutput.classList.remove("shown");
      }
    }
  }

  function setOperation(newOp, autoTransferText = true) {
    const currentOp = $("operation").value;
    if (currentOp !== newOp && autoTransferText) {
      const currentText = $("text").value;
      if (currentText) {
        if (newOp === "encode") {
          const plain = $("resultPlain").textContent;
          if (plain && !plain.startsWith("Cannot decode")) {
            $("text").value = plain;
          }
        } else if (newOp === "decode") {
          const encoded = $("resultB64").textContent;
          if (encoded && !encoded.startsWith("Encoding error")) {
            $("text").value = encoded;
          }
        }
      }
    }

    $("operation").value = newOp;
    Store.set("operation", newOp);

    // Update active pill button
    $all(".mode-btn").forEach((btn) => {
      const isActive = btn.dataset.op === newOp;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-checked", String(isActive));
    });

    // Update label
    const label = $("text-label");
    if (label) {
      label.textContent = newOp === "encode" ? "Message to Encode" : "Base64 to Decode";
    }

    calcResult();
  }

  // =========================================================================
  // 3. Clipboard & Accordion Handlers
  // =========================================================================

  function copyToClipboard(_event) {
    const elt = this;
    const targetId = elt.dataset.target;
    const textHolder = targetId
      ? $(targetId)
      : (elt.closest(".result-card")?.querySelector(".code") || elt.nextElementSibling);

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

  function applyTestCase(event) {
    if (event) event.preventDefault();
    const btn = this;
    const op = btn.dataset.op || "encode";
    const msg = btn.dataset.msg || "";

    setOperation(op, false);
    $("text").value = msg;
    Store.set("text", msg);
    calcResult();
  }

  // =========================================================================
  // 4. Initialization
  // =========================================================================

  document.addEventListener("DOMContentLoaded", () => {
    // Mode selector buttons
    $all(".mode-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        setOperation(btn.dataset.op, true);
      });
    });

    // Operation select fallback
    $("operation").addEventListener("change", (e) => {
      setOperation(e.target.value, true);
    });

    // Debounced text input
    const debouncedCalc = debounce(() => {
      Store.set("text", $("text").value);
      calcResult();
    }, 80);

    $("text").addEventListener("input", debouncedCalc);

    // Copy buttons
    $all(".copyIconHolder").forEach((elt) => elt.addEventListener("click", copyToClipboard));

    // Test cases accordion
    $all(".expand").forEach((elt) => elt.addEventListener("click", expandAccordion));
    $all(".collapse").forEach((elt) => elt.addEventListener("click", collapseAccordion));
    $all(".apply-test").forEach((elt) => elt.addEventListener("click", applyTestCase));

    $all(".collapse").forEach((elt) => (elt.style.display = "none"));
    const testcasesEl = $sel(".testcases");
    if (testcasesEl) testcasesEl.style.display = "none";

    // Restore state
    const savedOp = Store.get("operation", "encode");
    const savedText = Store.get("text", "");
    $("text").value = savedText;
    setOperation(savedOp, false);
  });
})();
