// goog-signin-page.js
// ------------------------------------------------------------------
/* jshint esversion: 9, node:false, strict:implied*/
/* global console, Buffer, window, gapi, document, atob, copyToClipboard, google */

(function () {
  const settings = {
    "google-signin-scope": "profile email",
    // "Web client 2" in infinite-epoch-2900
    "google-signin-client_id":
      "1078192672979-6p4frb4s8sk78lnc79s6e9av37tfd8e1.apps.googleusercontent.com"
  };

  const jwtRe = new RegExp("^([^\\.]+)\\.([^\\.]+)\\.([^\\.]+)$");

  function randomString() {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }

  function oneDiv(label, value) {
    const isToken = label.match(/token/i),
      isImage = label.match(/Image|Picture/i),
      elementId = randomString();
    let copyButton = "",
      valueClasses = ["value"];
    if (isToken) {
      valueClasses.push("token");
    }
    valueClasses = valueClasses.join(" ");

    if (!isImage) {
      copyButton =
        `<button type="button" class="btn-copy" data-target="${elementId}" title="Click to copy">` +
        `<svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>` +
        `<span>Copy</span>` +
        `</button>`;
    }

    return (
      '<div class="result-card">' +
      `  <div class="result-card-header"><span class="result-label">${label}</span>${copyButton}</div>` +
      `  <div id="${elementId}" class="${valueClasses}">${value}</div>` +
      `</div>`
    );
  }

  function getJwtPayload(jwtString) {
    const matches = jwtRe.exec(jwtString);
    if (matches && matches.length == 4) {
      return JSON.parse(atob(matches[2]));
    }
    return null;
  }

  function renderIdToken(token) {
    const matches = jwtRe.exec(token);
    if (matches && matches.length == 4) {
      // colorize the base64-encoded blobs
      let html = oneDiv(
        "ID Token",
        token.replace(
          jwtRe,
          '<span class="jwt-header">$1</span>.<span class="jwt-payload">$2</span>.<span class="jwt-signature">$3</span>'
        )
      );
      const styles = ["header", "payload"];
      matches.slice(1, -1).forEach((item, index) => {
        const json = atob(item),
          obj = JSON.parse(json);
        html += oneDiv(
          "Decoded " + styles[index].charAt(0).toUpperCase() + styles[index].slice(1),
          '<pre class="jwt-' +
            styles[index] +
            '">' +
            JSON.stringify(obj, null, 2) +
            "</pre>"
        );
      });
      return html;
    }
    return oneDiv("ID Token", token);
  }

  function getElementsByTagAndClass(root, tag, clazz) {
    // there's a better way to do this, in modern JavaScript with document.querySelector
    let nodes = root.getElementsByClassName(clazz);
    if (tag) {
      const tagUpper = tag.toUpperCase();
      nodes = Array.prototype.filter.call(
        nodes,
        (testElement) => testElement.nodeName.toUpperCase() === tagUpper
      );
    }
    return nodes;
  }

  function onSignIn(response) {
    // fields: response.clientId, response.credential
    const credential = response.credential, // base64-encoded token
      jwtPayload = getJwtPayload(credential);

    // Everything below here is done for demonstration purposes,
    // to show the decoded token.
    const elt = document.getElementById("output");

    let outputHtml =
      '<div class="output-header">' +
      '  <h3 class="output-heading">Authentication Results</h3>' +
      '  <span class="badge-success">Authenticated</span>' +
      "</div>";

    outputHtml +=
      oneDiv(
        "Full Name",
        (jwtPayload.given_name || "") + " " + (jwtPayload.family_name || "")
      ) +
      oneDiv("Email", jwtPayload.email) +
      (jwtPayload.picture
        ? oneDiv(
            "Profile Picture",
            '<img src="' + jwtPayload.picture + '" alt="Profile picture">'
          )
        : "") +
      renderIdToken(credential) +
      oneDiv("Issued At", new Date(jwtPayload.iat * 1000).toISOString()) +
      oneDiv("Expires At", new Date(jwtPayload.exp * 1000).toISOString());

    elt.innerHTML = outputHtml;

    // attach click listeners for all the copy buttons
    const nodes = document.querySelectorAll(".btn-copy");
    nodes.forEach((btn) => {
      btn.addEventListener("click", copyToClipboard);
    });
  }

  window.onload = function () {
    google.accounts.id.initialize({
      client_id: settings["google-signin-client_id"],
      callback: onSignIn
    });
    google.accounts.id.renderButton(
      document.getElementById("signin-button"),
      { theme: "outline", size: "large" } // customization attributes
    );
    google.accounts.id.prompt(); // also display the One Tap dialog
  };
})();
