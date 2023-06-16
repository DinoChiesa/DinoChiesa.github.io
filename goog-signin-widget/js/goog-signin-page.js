// goog-signin-page.js
// ------------------------------------------------------------------
/* jshint esversion: 9, node:false, strict:implied*/
/* global console, Buffer, window, gapi, document, atob, copyToClipboard */

(function () {
  const settings = {
          "google-signin-scope": "profile email",
          "google-signin-client_id": "1078192672979-6p4frb4s8sk78lnc79s6e9av37tfd8e1.apps.googleusercontent.com"
        };

  const jwtRe = new RegExp('^([^\\.]+)\\.([^\\.]+)\\.([^\\.]+)$');

  function randomString(){
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  function oneDiv(label, value) {
    let isToken = label.match(/token/i),
        isImage = label.match(/Image/),
        valueClasses = ['value'],
        copySpan = '',
        elementId = randomString();
    if (isToken) {
      valueClasses.push('token');
    }
    valueClasses = valueClasses.join(' ');

    if ( ! isImage) {
      copySpan =
        '  <span class="icon icon-copy" data-target="'+elementId+'">' +
        '     <img src="./img/copyicon.png" title="Click to Copy">' +
        '  </span>';
    }

    return '<div class="item">'+
      '  <div class="label">'+ label + copySpan + '</div>' +
      '  <div id="'+elementId+'" class="'+ valueClasses + '">' + value + '</div>'+
      '</div>';
  }

  function getJwtPayload(jwtString) {
    let matches = jwtRe.exec(jwtString);
    if (matches && matches.length == 4) {
      let payload = JSON.parse(atob(matches[2]));
      return payload;
    }
    return null;
  }

  function renderIdToken(token) {
    let matches = jwtRe.exec(token);
    if (matches && matches.length == 4) {
      // colorize the base64-encoded blobs
      let html = oneDiv("ID Token",
                        token.replace(jwtRe, '<span class="jwt-header">$1</span>.<span class="jwt-payload">$2</span>.<span class="jwt-signature">$3</span>'));
      let styles = ['header','payload'];
      matches.slice(1,-1).forEach((item,index) => {
        let json = atob(item),
            obj = JSON.parse(json);
        html += oneDiv(styles[index], '<pre class="jwt-'+ styles[index] +'">' +
                       JSON.stringify(obj,null,2) +
                       '</pre>');
      });
      return html;
    }
    return oneDiv("ID Token", token);
  }


  function getElementsByTagAndClass(root, tag, clazz) {
    var nodes = root.getElementsByClassName(clazz);
    if (tag) {
      var tagUpper = tag.toUpperCase();
      nodes = Array.prototype.filter.call(nodes,
                                          testElement => testElement.nodeName.toUpperCase() === tagUpper );
    }
    return nodes;
  }

  function onSignIn(response) {
    // fields: response.clientId, response.credential
    let credential = response.credential,
        jwtPayload = getJwtPayload(credential);

    let elt = document.getElementById("output");
     elt.innerHTML = renderIdToken(credential);

    elt.innerHTML =
      oneDiv('Full Name', jwtPayload.given_name + ' ' + jwtPayload.family_name) +
      oneDiv("Email", jwtPayload.email) +
      oneDiv('Image', '<img src="' + jwtPayload.picture + '">') +
      renderIdToken(credential) +
      oneDiv("issued", (new Date(jwtPayload.iat * 1000)).toISOString()) +
      oneDiv("expires", (new Date(jwtPayload.exp * 1000)).toISOString());

    // attach click listeners for all the copy buttons
    let nodes = getElementsByTagAndClass(document, 'span', 'icon-copy');
    Array.prototype.forEach.call(nodes, span => {
      span.addEventListener("click", copyToClipboard );
    });

    //showSignout(true);
  }

  // function showSignout(visible) {
  //   let signout = document.getElementById('signout');
  //   if (signout) {
  //     signout.classList.add(visible?'visible':'hidden');
  //     signout.classList.remove(visible?'hidden':'visible');
  //   }
  // }

  //window.onSignIn = onSignIn;
  //window.signOut = signOut;
  //window.gapiPostInit = gapiPostInit;

  window.onload = function () {
    google.accounts.id.initialize({
      client_id: settings["google-signin-client_id"],
      callback: onSignIn
    });
    google.accounts.id.renderButton(
      document.getElementById("signin-button"),
      { theme: "outline", size: "large" }  // customization attributes
    );
    google.accounts.id.prompt(); // also display the One Tap dialog
  };

}());
