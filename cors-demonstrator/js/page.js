// page.js - CORS Demonstrator Controller
// ------------------------------------------------------------------
/* jshint esversion:9, node:false, browser:true, strict:implied */
/* global window, document, XMLHttpRequest, navigator */

(function () {
  "use strict";

  // =========================================================================
  // 1. Constants, DOM Helpers & Storage
  // =========================================================================

  const $ = (id) => document.getElementById(id);
  const $all = (query) => document.querySelectorAll(query);

  const extraneousDoubleSlashFinder = /^(https?:\/\/[^/]+)\/\/(.+)$/;
  const html5AppId = "F82F76F0-0029-499B-AA68-A0EBB1CD01B2";

  const model = {
    "txt-baseurl": "",
    "txt-urlpath": "",
    "ta-addlheaderlist": "",
    "ta-body": "",
    "sel-verb": "GET",
    "sel-contenttype": "application/json",
  };

  const Store = {
    prefix: html5AppId + ".model.",
    get(key, fallback = "") {
      const val = window.localStorage.getItem(this.prefix + key);
      return val !== null ? val : fallback;
    },
    set(key, value) {
      window.localStorage.setItem(this.prefix + key, String(value));
    },
  };

  function debounce(fn, delay = 150) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function httpMethodHasPayload(method) {
    return method === "POST" || method === "PUT";
  }

  function reformIndents(s) {
    return s
      .split(/\r?\n/)
      .map((line) => line.trim())
      .join("\n")
      .trim();
  }

  function shredHeaders(text) {
    const keyValuePairRe = /^([^:]+):(.*)$/;
    const headers = {};
    if (!text) return headers;

    text.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (trimmed.length > 2) {
        const match = keyValuePairRe.exec(trimmed);
        if (match && match.length === 3) {
          headers[match[1].trim().toLowerCase()] = match[2].trim();
        }
      }
    });
    return headers;
  }

  // =========================================================================
  // 2. Form State & Visibility
  // =========================================================================

  function updatePayloadVisibility(verb) {
    const showPayload = httpMethodHasPayload(verb);
    $all(".for-payload").forEach((el) => {
      el.classList.toggle("notshown", !showPayload);
    });
  }

  function populateFormFields() {
    Object.keys(model).forEach((key) => {
      const el = $(key);
      if (!el) return;
      const stored = Store.get(key, model[key]);
      if (stored !== "") {
        model[key] = stored;
        el.value = stored;
      }
    });
    updatePayloadVisibility($("sel-verb").value);
  }

  function onInputChanged(event) {
    const el = event.target;
    const id = el.id;
    const val = el.value;
    if (model[id] !== val) {
      model[id] = val;
      Store.set(id, val);
    }
  }

  function onSelectChanged(event) {
    const el = event.target;
    const id = el.id;
    const val = el.value;
    model[id] = val;
    Store.set(id, val);

    if (id === "sel-verb") {
      updatePayloadVisibility(val);
    }
  }

  function handlePaste(e) {
    const el = e.target;
    setTimeout(() => {
      el.value = reformIndents(el.value);
      onInputChanged({ target: el });
    }, 80);
  }

  // =========================================================================
  // 3. Output Display & Copying
  // =========================================================================

  function clearOutput(event) {
    if (event) event.preventDefault();
    const output = $("output");
    output.innerHTML = "";
    output.classList.add("notshown");
    output.classList.remove("shown");

    const btnClear = $("btn-clear");
    if (btnClear) btnClear.classList.add("notshown");
  }

  function copyToClipboard(event) {
    if (event) event.preventDefault();
    const btn = event.currentTarget;
    const targetEl = $("results-content");
    if (!targetEl) return;

    const textToCopy = targetEl.textContent;

    const showFlash = () => {
      targetEl.classList.add("copy-to-clipboard-flash-bg");
      const label = btn.querySelector(".copy-text");
      if (label) {
        const orig = label.textContent;
        label.textContent = "Copied!";
        setTimeout(() => { label.textContent = orig; }, 1200);
      }
      setTimeout(() => targetEl.classList.remove("copy-to-clipboard-flash-bg"), 1000);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textToCopy).then(showFlash).catch(() => {});
      return;
    }

    const temp = document.createElement("textarea");
    document.body.appendChild(temp);
    temp.value = textToCopy;
    temp.select();
    try {
      if (document.execCommand("copy")) showFlash();
    } catch (_e) {}
    temp.remove();
  }

  function showOutput(xhr, requestedUrl, requestedMethod) {
    const status = xhr.status;
    const statusText = xhr.statusText || (status === 200 ? "OK" : "");
    const rawHeaders = xhr.getAllResponseHeaders() || "";
    const responseBody = xhr.responseText || "";

    const isSuccess = status >= 200 && status < 300;
    const isCorsFailure = status === 0;

    let badgeClass = "status-badge ";
    let badgeText = "";

    if (isSuccess) {
      badgeClass += "status-success";
      badgeText = `Status: ${status} ${statusText}`.trim();
    } else if (isCorsFailure) {
      badgeClass += "status-error";
      badgeText = "Status: 0 (CORS Blocked or Network Error)";
    } else {
      badgeClass += "status-error";
      badgeText = `Status: ${status} ${statusText}`.trim();
    }

    // Compose formatted text for easy copying and reading in presentations
    let displayText = `// REQUEST: ${requestedMethod} ${requestedUrl}\n\n`;
    displayText += `// RESPONSE STATUS: ${status} ${statusText}\n\n`;

    if (isCorsFailure) {
      displayText += "// CORS NOTICE:\n";
      displayText += "// The browser blocked this cross-origin response or the preflight OPTIONS check failed.\n";
      displayText += "// Check browser DevTools Console & Network tabs for CORS error details.\n\n";
    }

    displayText += "// RESPONSE HEADERS:\n";
    displayText += rawHeaders ? rawHeaders.trim() + "\n\n" : "(No headers exposed by CORS policy)\n\n";

    displayText += "// RESPONSE BODY:\n";
    displayText += responseBody ? responseBody : "(empty body)";

    const outputContainer = $("output");
    outputContainer.innerHTML = `
      <div class="output-header">
        <span class="${badgeClass}">${badgeText}</span>
        <button type="button" class="btn-copy" id="btn-copy-response" title="Copy entire response">
          <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
          <span class="copy-text">Copy Response</span>
        </button>
      </div>
      <div id="results-content" class="results-display">${displayText}</div>
    `;

    outputContainer.classList.remove("notshown");
    outputContainer.classList.add("shown");

    const btnCopy = $("btn-copy-response");
    if (btnCopy) btnCopy.addEventListener("click", copyToClipboard);

    const btnClear = $("btn-clear");
    if (btnClear) btnClear.classList.remove("notshown");

    // Scroll smoothly to output
    outputContainer.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // =========================================================================
  // 4. Request Submission
  // =========================================================================

  function submit(event) {
    if (event) event.preventDefault();

    try {
      const baseUrl = ($("txt-baseurl").value || "").trim();
      const urlPath = ($("txt-urlpath").value || "").trim();

      if (!baseUrl && !urlPath) {
        window.alert("Please provide a Base URL or URL Path to send a request.");
        return false;
      }

      let url = baseUrl + urlPath;
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = "https://" + url;
      }

      // Eliminate duplicate slashes (e.g. https://domain.com//path -> https://domain.com/path)
      for (let m = extraneousDoubleSlashFinder.exec(url); m; ) {
        url = m[1] + "/" + m[2];
        m = extraneousDoubleSlashFinder.exec(url);
      }

      clearOutput();

      const method = $("sel-verb").value.toUpperCase();
      const headers = shredHeaders($("ta-addlheaderlist").value);
      let payloadData = null;

      if (httpMethodHasPayload(method)) {
        headers["content-type"] = $("sel-contenttype").value;
        payloadData = $("ta-body").value;
      }

      const xhr = new XMLHttpRequest();
      xhr.open(method, url, true);

      // Set headers
      for (const [k, v] of Object.entries(headers)) {
        try {
          xhr.setRequestHeader(k, v);
        } catch (err) {
          console.warn("Could not set header:", k, err);
        }
      }

      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          showOutput(xhr, url, method);
        }
      };

      xhr.onerror = function () {
        showOutput(xhr, url, method);
      };

      xhr.send(payloadData);
    } catch (e) {
      window.alert("Request Exception: " + e.message);
    }
    return false;
  }

  // =========================================================================
  // 5. Initialization
  // =========================================================================

  document.addEventListener("DOMContentLoaded", () => {
    populateFormFields();

    $("btn-send").addEventListener("click", submit);
    $("btn-clear").addEventListener("click", clearOutput);

    const debouncedSave = debounce(onInputChanged, 200);
    $all("form .txt").forEach((el) => {
      el.addEventListener("input", debouncedSave);
      el.addEventListener("change", onInputChanged);
    });

    $all("form select").forEach((el) => {
      el.addEventListener("change", onSelectChanged);
    });

    $all("form textarea").forEach((el) => {
      el.addEventListener("paste", handlePaste);
    });
  });
})();
