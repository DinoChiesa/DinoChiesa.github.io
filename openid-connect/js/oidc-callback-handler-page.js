// callback-handler-page.js
// ------------------------------------------------------------------
//
// for callback-handler.html
//
// created: Thu Oct  1 13:37:31 2015
// last saved: <2025-November-13 21:36:25>

/* jshint esversion: 9 */
/* global atob */

function randomId() {
  return Math.random().toString(36).substring(2, 15);
}
function decodeToken(matches) {
  if (matches.length == 4) {
    const styles = ["header", "payload", "signature"],
      decodeddiv = document.getElementById("id_token-decoded");

    if (!decodeddiv) return;
    // skip header and signature
    matches.slice(1, -1).forEach(function (item, index) {
      const json = atob(item),
        obj = JSON.parse(json),
        id = "pre-" + randomId();
      decodeddiv.insertAdjacentHTML(
        "beforeend",
        '<div><pre id="' +
          id +
          '" class="jwt-' +
          styles[index] +
          '">' +
          JSON.stringify(obj, null, 2) +
          "</pre>" +
          copyButtonHtml(id) +
          "</div>",
      );
    });
  }
}

function formatIdToken() {
  const valueDiv = document.querySelector("#id_token-value div.cb-value");
  if (valueDiv) {
    let text = valueDiv.textContent;
    const re1 = new RegExp("^([^\\.]+)\\.([^\\.]+)\\.([^\\.]+)$");
    if (text) {
      const matches = re1.exec(text);
      if (matches) {
        decodeToken(matches);
        text = text.replace(
          re1,
          '<span class="jwt-header">$1</span>.<span class="jwt-payload">$2</span>.<span class="jwt-signature">$3</span>',
        );
        valueDiv.innerHTML = text;
      }
    }
  }
}

function copyButtonHtml(targetElementId) {
  let html =
    '<button type="button" title="copy to clipboard" class="btn btn-outline-secondary btn-sm btn-copy" ' +
    'data-target="' +
    targetElementId +
    '" title="copy to clipboard">\n' +
    '  <span class="oi oi-clipboard"></span>' +
    "</button>\n";
  return html;
}

function copyToClipboard() {
  const sourceElementId = this.dataset.target,
    // grab the element to copy
    source = document.getElementById(sourceElementId);
  if (!source) return false;

  // Create a temporary hidden textarea.
  const temp = document.createElement("textarea"),
    textToCopy =
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

document.addEventListener("DOMContentLoaded", function () {
  let search = window.location.hash,
    hash = {},
    fnStartsWith = function (s, searchString, position) {
      position = position || 0;
      return s.lastIndexOf(searchString, position) === position;
    };

  if (!search || search === "") {
    search = window.location.search.replace("?", "");
  }

  search.split("&").forEach(function (item) {
    let e = item.split("=");
    if (e[0] && e[0] !== "") {
      if (fnStartsWith(e[0], "#")) {
        e[0] = e[0].substring(1);
      }
      hash[e[0]] = decodeURIComponent(e[1]);
    }
  });

  // emit that information into fields in the output:
  const outputDiv = document.getElementById("output");
  if (!outputDiv) return;

  outputDiv.innerHTML = "";

  Object.keys(hash).forEach(function (key) {
    if (key) {
      const newdiv = document.createElement("div");
      newdiv.id = key + "-value";
      newdiv.className = "cb-element cb-clearfix";

      const valueId = "val-" + randomId(),
        html = {
          label:
            '<div class="cb-label">' + key + copyButtonHtml(valueId) + "</div>",
          value:
            '<div id="' + valueId + '"class="cb-value">' + hash[key] + "</div>",
        };
      newdiv.innerHTML = html.label + html.value;
      outputDiv.appendChild(newdiv);
      if (key == "id_token") {
        newdiv.insertAdjacentHTML(
          "beforeend",
          "<div id='id_token-decoded' class='jwt-decoded'/>",
        );
      }
    }
  });

  outputDiv.addEventListener("click", function (e) {
    const copyButton = e.target.closest(".btn-copy");
    if (copyButton) {
      copyToClipboard.call(copyButton);
    }
  });

  if (window.opener && hash.code) {
    window.opener.postMessage(
      { code: hash.code, state: hash.state, scope: hash.scope },
      "*",
    );
    setTimeout(() => window.close(), 2500);
  }

  setTimeout(formatIdToken, 2100);
});
