// page.js
// ------------------------------------------------------------------
//
// created: Thu Oct  5 21:17:16 2023
// last saved: <2023-October-11 14:33:57>

/* jshint esversion:9, browser:true, strict:implied */
/* global firebase, Promise, URLSearchParams */

const identityPlatformConfig = {
  apiKey: "AIzaSyDVl39KBTLNY_wDKVVgpRXz2KDRpiXxFAg",
  authDomain: "infinite-epoch-2900.firebaseapp.com"
};

const constants = {
  APIGEE_ENDPOINT: "https://apigee1.dchiesa.demo.altostrat.com",
  TOKEN_PATH: "/oauth2-firebase-id/token",
  GRANT_TYPE: "urn:ietf:params:oauth:grant-type:jwt-bearer",
  APIGEE_CLIENT_ID: "oAv16FqFGObyc555GULTsGAZDhji9uUMmIJi2ya933zzq4As",
  APP_ID: "03B11656-768B-457B-9CC8-6DC1AFBF7A54",
  OKTA_ENDPOINT: "https://dev-329615.okta.com",
  OIDC_PROVIDER: "oidc.okta-oidc-provider"
};

const model = {
  "txt-accesstoken": "",
  "txt-urlpath": "",
  "ta-addlheaderlist": "",
  "ta-body": "",
  "sel-idp": "",
  "sel-verb": "",
  "sel-contenttype": ""
};

let currentUser = null;

firebase.initializeApp(identityPlatformConfig);
const IdProvider = new firebase.auth.OAuthProvider(constants.OIDC_PROVIDER);

const $sel = (query) => document.querySelector(query),
  $all = (query) => document.querySelectorAll(query);

function debounce(interval, callback) {
  let debounceTimeoutId;
  return function (...args) {
    if (debounceTimeoutId) {
      clearTimeout(debounceTimeoutId);
    }
    debounceTimeoutId = setTimeout(() => callback.apply(this, args), interval);
  };
}

function message(msg) {
  document.getElementById("message").innerHTML = msg;
}

function displayAccessToken(json) {
  const $element = $sel("#txt-accesstoken");
  if (json) {
    const accessToken = json.access_token;
    $element.value = accessToken;
    storeItem("txt-accesstoken", accessToken);

    const issued = new Date(json.issued_at).toISOString(),
      expiry = new Date(json.issued_at + json.expires_in * 1000).toISOString(),
      now = new Date().toISOString();
    const htmlStr = `issued: ${issued}<br/>expiry: ${expiry}<br/>now: ${now}`;
    $element.nextElementSibling.innerHTML = htmlStr;
  } else {
    $element.value = "";
    storeItem("txt-accesstoken", "");
  }
}

function getDisplayedAccessToken() {
  // $sel("#token").innerHTML; // if div
  let value = $sel("#txt-accesstoken").value; // if input
  if (!value) {
    value = getItem("txt-accesstoken");
    if (value) {
      $sel("#txt-accesstoken").value = value;
    }
  }
  return value;
}

function setElementVisibility(discriminator, show) {
  const selectors = [`.when-${discriminator}`, `.when-no-${discriminator}`];
  const [toShow, toHide] = show ? selectors : selectors.reverse();

  [].forEach.call(document.querySelectorAll(toShow), (el) => {
    el.classList.toggle("hidden", false);
    //el.classList.toggle("visible", true);
  });
  [].forEach.call(document.querySelectorAll(toHide), (el) => {
    el.classList.toggle("hidden", true);
    //el.classList.toggle("visible", false);
  });
}

const storeItem = (key, value) =>
  window.localStorage.setItem(`${constants.APP_ID}.model.${key}`, value);

const getItem = (key) =>
  window.localStorage.getItem(`${constants.APP_ID}.model.${key}`);

function populateFormFields() {
  // get values from local storage, and place into the form
  Object.keys(model).forEach((key) => {
    const storedValue = getItem(key),
      element = $sel(`#${key}`);
    if (storedValue && storedValue !== "") {
      model[key] = storedValue;
      element.value = storedValue;
      if (key.startsWith("sel-")) {
        onSelectChanged.call(null, { target: element });
      }
    }
  });
}

function showIdToken(event) {
  event.preventDefault();
  showDecodedIdToken(currentUser);
}

async function showDecodedIdToken(user) {
  if (user) {
    const idToken = await user.getIdToken();
    // display the received ID Token
    const [header, payload] = decodeIdToken(idToken);
    const str =
      `ID token for authenticated user:\n\n` +
      `HEADER: ${JSON.stringify(header, null, 2)}\n\n` +
      `PAYLOAD: ${JSON.stringify(payload, null, 2)}\n\n`;
    const ta = $sel("#output textarea");
    ta.value = str;
    return payload;
  }
  return null;
}

function showExpiryInTooltip(claims, $element) {
  const issued = new Date(claims.iat * 1000).toISOString(),
    expiry = new Date(claims.exp * 1000).toISOString(),
    now = new Date().toISOString();
  // const str = `issued: ${issued}\nexpiry: ${expiry}\nnow: ${now}`;
  // $element.setAttribute("title", str);

  const htmlStr = `issued: ${issued}<br/>expiry: ${expiry}<br/>now: ${now}`;
  $element.nextElementSibling.innerHTML = htmlStr;
}

function addFirebaseAuthChangeListener() {
  firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
      message(`Signed in.`);
      currentUser = user;
      const $useremail = $sel(`#txt-useremail`);
      $useremail.value = user.email;
      const payload = await showDecodedIdToken(user);
      showExpiryInTooltip(payload, $useremail);
      $sel(`#txt-clientid`).value = constants.APIGEE_CLIENT_ID;
      setElementVisibility("signedin", true);
      setElementVisibility("emailpw", false);
    } else {
      message("There is no user signed in.");
      const idp = document.querySelector(`#sel-idp`).value;
      setElementVisibility("emailpw", idp === "emailpw");
      setElementVisibility("signedin", false);
      setElementVisibility("response", false);
    }
    setElementVisibility("havetoken", getItem("txt-accesstoken"));
  });
}

function httpMethodHasPayload(method) {
  return method == "POST" || method == "PUT";
}

function onSelectChanged(event) {
  const source = event.target || event.srcElement,
    id = source.getAttribute("id"),
    value = $sel(`#${id}`).value;

  if (model[id] != value) {
    model[id] = value;
    storeItem(id, value);

    if (id == "sel-verb") {
      setElementVisibility("havepayload", httpMethodHasPayload(value));
    }

    if (id == "sel-idp") {
      setElementVisibility("emailpw", value === "emailpw");
    }
  }
}

function onInputChanged(event) {
  const source = event.target || event.srcElement,
    id = source.getAttribute("id"),
    value = $sel(`#${id}`).value;

  if (model[id] != value) {
    model[id] = value;
    storeItem(id, value);
  }
}

function decodeIdToken(idToken) {
  const parts = idToken.split(".", 3);
  const header = JSON.parse(atob(parts[0])),
    payload = JSON.parse(atob(parts[1]));
  return [header, payload];
}

function signin(event) {
  event.preventDefault();
  const signin_option = $sel(`#sel-idp`).value;

  let p = null;
  if (signin_option == "OIDC") {
    p = firebase.auth().signInWithPopup(IdProvider);
  } else {
    const email = document.getElementById("inputEmail").value.trim();
    const password = document.getElementById("inputPassword").value.trim();
    if (email && password) {
      p = firebase.auth().signInWithEmailAndPassword(email, password);
    }
  }
  if (p) {
    p = p
      .then((result) => {
        console.log("user is logged in...");
        showDecodedIdToken(result.user);
      })
      .catch((error) => {
        // Handle error.
        document.getElementById("message").innerHTML = error.message;
        console.log("error logging in: " + error.message);
      });
  }
  return false;
}

function signout(event) {
  event.preventDefault();
  // const currentUser = firebase.auth().currentUser;
  // const token = currentUser && (await currentUser.getIdToken()); // fbase id token
  // console.log(`id token: ${token}`);
  // const tokenResult = currentUser && (await currentUser.getIdTokenResult()); // fbase id token
  // console.log(`token result: ${tokenResult}`);

  firebase.auth().signOut();
  displayAccessToken();
  $sel("#output textarea").value = "";

  const idp = document.querySelector(`#sel-idp`).value;
  if (idp == "OIDC") {
    // extra step for Okta-specific signout. This can be done in GCIP.
    // signout and return to this page
    window.location = `${constants.OKTA_ENDPOINT}/login/signout?fromURI=${window.location.href}`;
  }

  return false;
}

function newAccessToken(event) {
  event.preventDefault();
  if (currentUser && currentUser.ya) {
    const payload = {
      grant_type: constants.GRANT_TYPE,
      client_id: constants.APIGEE_CLIENT_ID,
      assertion: currentUser.ya
    };
    return fetch(constants.APIGEE_ENDPOINT + constants.TOKEN_PATH, {
      method: "POST",
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams(payload)
    })
      .then(async (res) => [res.status, await res.json()])

      .then(([status, json]) => {
        const ta = $sel("#output textarea");
        ta.value = JSON.stringify(json, null, 2);

        if (status == 401) {
          // ID token expired?
          if (
            json.fault &&
            json.fault.faultstring &&
            json.fault.faultstring.startsWith("The Token has expired")
          ) {
            message("the ID token has expired");
          }
        } else {
          const accessToken = json.access_token;
          if (accessToken) {
            displayAccessToken(json);
            setElementVisibility("havetoken", true);
          }
        }
      })
      .catch((_e) => {
        displayAccessToken();
        message("Could not obtain a new access token");
      });
  }
  return Promise.resolve(null);
}

async function showOutput(res) {
  const json = await res.text();
  // const ta = document.createElement("textarea");
  // ta.setAttribute("class", "results code");
  // ta.setAttribute("spellcheck", "false");
  // ta.setAttribute("disabled", "true");
  const ta = $sel("#output textarea");
  const h = [];
  for (const pair of res.headers.entries()) {
    const lc = pair[0].toLowerCase();
    if (
      !lc.startsWith("sec-") &&
      !lc.startsWith("access-control-") &&
      !lc.startsWith("alt-svc")
    ) {
      h.push(`${pair[0]}: ${pair[1]}`);
    }
  }

  const label = `status: ${res.status}`;
  ta.value = label + "\n\n" + h.join("\n") + "\n\n" + json;

  $sel("#btn-clear").classList.toggle("hidden", false);
}

function clearOutput(event) {
  if (event) {
    event.preventDefault();
  }
  $sel("#output textarea").value = "";
  $sel("#btn-clear").classList.toggle("hidden", true);
}

function sendRequest(event) {
  event.preventDefault();
  const accessToken = getDisplayedAccessToken();
  if (!accessToken) {
    message("There is no access token");
    return false;
  }

  const extraneousDoubleSlashFinder = new RegExp("^(https?://[^/]+)//(.+)$");
  let url = $sel("#txt-baseurl").innerHTML + $sel("#txt-urlpath").value;

  for (const m = extraneousDoubleSlashFinder.exec(url); m; ) {
    url = m[1] + "/" + m[2];
  }

  // POST to the API endpoint.
  const method = $sel("#sel-verb").value,
    headers = {};
  let body = null;

  headers.Authorization = `Bearer ${accessToken}`;

  if (httpMethodHasPayload(method)) {
    headers["content-type"] = $sel("#sel-contenttype").value;
    body = $sel("#ta-body").value;
  }

  fetch(url, { method, headers, body })
    .then(showOutput)
    .catch((e) => {
      console.log(e);
    });

  return false;
}

document.addEventListener("DOMContentLoaded", (_event) => {
  addFirebaseAuthChangeListener();
  document.querySelector("#message").innerHTML = ""; // clear message
  document.querySelector("#btn-signin").addEventListener("click", signin);
  document.querySelector("#btn-signout").addEventListener("click", signout);
  document
    .querySelector("#btn-showIdToken")
    .addEventListener("click", showIdToken);
  document
    .querySelector("#btn-newAccessToken")
    .addEventListener("click", newAccessToken);

  populateFormFields();

  // preset things based on the select boxes
  const method = document.querySelector(`#sel-verb`).value;
  setElementVisibility("havepayload", httpMethodHasPayload(method));

  const idp = document.querySelector(`#sel-idp`).value;
  setElementVisibility("emailpw", idp === "emailpw");

  [].forEach.call($all("#form-send .txt"), (el) => {
    const handler = debounce(450, onInputChanged);
    el.addEventListener("change", handler);
    el.addEventListener("input", handler);
    el.addEventListener("keyup", handler);
  });

  document.getElementById("txt-baseurl").innerHTML = constants.APIGEE_ENDPOINT;

  $sel("#btn-send").addEventListener("click", sendRequest);
  $sel("#btn-clear").addEventListener("click", clearOutput);
  [].forEach.call(document.querySelectorAll("#form-signin select"), (el) => {
    el.addEventListener("change", onSelectChanged);
  });
  [].forEach.call(document.querySelectorAll("#form-send select"), (el) => {
    el.addEventListener("change", onSelectChanged);
  });
});
