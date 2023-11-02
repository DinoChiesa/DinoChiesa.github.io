// page.js
// ------------------------------------------------------------------
//
// created: Thu Oct  5 21:17:16 2023
// last saved: <2023-November-02 14:42:09>

/* jshint esversion:9, browser:true, strict:implied */
/* global firebase, Promise, URLSearchParams, JSON_StringifyPrettyCompact, bootstrap */

const identityPlatformConfig = {
  apiKey: "AIzaSyDVl39KBTLNY_wDKVVgpRXz2KDRpiXxFAg",
  authDomain: "infinite-epoch-2900.firebaseapp.com"
};

const constants = {
  APIGEE_ENDPOINT: "https://apigee1.dchiesa.demo.altostrat.com",
  OPA_BASEPATH: "/opa-1",
  TOKEN_PATH: "/oauth2-firebase-id/token",
  GRANT_TYPE: "urn:ietf:params:oauth:grant-type:jwt-bearer",
  APIGEE_CLIENT_ID: "oAv16FqFGObyc555GULTsGAZDhji9uUMmIJi2ya933zzq4As",
  LOCALSTORAGE_APP_ID: "03B11656-768B-457B-9CC8-6DC1AFBF7A54",
  OKTA_ENDPOINT: "https://dev-329615.okta.com",
  OIDC_PROVIDER: "oidc.okta-oidc-provider"
};

const model = {
  "active-tab": "",
  "txt-accesstoken": "",
  "txt-api-urlpath": "",
  "sel-api-contenttype": "",
  "ta-api-body": "",
  "sel-api-idp": "",
  "sel-api-verb": "",
  "ta-opa-body": "",
  "sel-opa-action": "",
  "sel-opa-data": "",
  "sel-opa-perms": ""
};

let currentUser = null;

firebase.initializeApp(identityPlatformConfig);
const IdProviders = {
  Okta: new firebase.auth.OAuthProvider(constants.OIDC_PROVIDER),
  Google: (() => {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: "select_account"
    });
    return provider;
  })()
};

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
  let value = $sel("#txt-accesstoken").value;
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

  [].forEach.call($all(toShow), (el) => {
    el.classList.toggle("hidden", false);
  });
  [].forEach.call($all(toHide), (el) => {
    el.classList.toggle("hidden", true);
  });
}

const storeItem = (key, value) =>
  window.localStorage.setItem(
    `${constants.LOCALSTORAGE_APP_ID}.model.${key}`,
    value
  );

const getItem = (key) =>
  window.localStorage.getItem(`${constants.LOCALSTORAGE_APP_ID}.model.${key}`);

function populateFormFields() {
  // get values from local storage, and place into the form
  Object.keys(model).forEach((key) => {
    const storedValue = getItem(key);
    if (storedValue && storedValue !== "") {
      model[key] = storedValue;
      if (key == "active-tab") {
        // defer tab selection til later
        // const el = $sel(`#nav-tabs button[id="${storedValue}"]`);
        // if (el) {
        //   bootstrap.Tab.getInstance(el).show();
        // }
      } else {
        const element = $sel(`#${key}`);
        if (element) {
          element.value = storedValue;
          if (key.startsWith("sel-")) {
            onSelectChanged.call(null, { target: element });
          }
        }
      }
    }
  });
}

function showIdToken(event) {
  event.preventDefault();
  clearApiOutput();
  setTimeout(() => showDecodedIdToken(currentUser), 1);
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
    const ta = $sel("#api-output textarea");
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
      const idp = document.querySelector(`#sel-api-idp`).value;
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

    if (id == "sel-api-verb") {
      setElementVisibility("havepayload", httpMethodHasPayload(value));
    }

    if (id == "sel-api-idp") {
      setElementVisibility("emailpw", value === "emailpw");
    }

    if (id == "sel-opa-action") {
      setElementVisibility("readconfig", value == "READCONFIG");
      setElementVisibility("authzquery", value == "AUTHZQUERY");
      setElementVisibility("updateperms", value == "UPDATEPERMS");
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
  const signin_option = $sel(`#sel-api-idp`).value;

  let p = null;
  if (signin_option == "Okta" || signin_option == "Google") {
    p = firebase.auth().signInWithPopup(IdProviders[signin_option]);
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
        console.log("user is signed in...");
        showDecodedIdToken(result.user);
      })
      .catch((error) => {
        document.getElementById("message").innerHTML = "failed to sign in";
        const ta = $sel("#api-output textarea");
        try {
          const c = JSON.parse(error.message);
          ta.value = JSON.stringify(c, null, 2);
        } catch (e) {
          ta.value = error.message;
        }
        console.log("error logging in: " + error.message);
      });
  }
  return false;
}

function signout(event) {
  event.preventDefault();
  firebase.auth().signOut();
  displayAccessToken();
  $sel("#api-output textarea").value = "";

  const idp = document.querySelector(`#sel-api-idp`).value;
  if (idp == "Okta") {
    // An extra step for Okta-specific signout. The goal here is to allow
    // re-prompt when later signing in with Okta. If this app does not fully
    // sign-out, the signin experience will be no-touch, based on stored
    // cookies.
    //
    // You wouldn't force the signout in a real app.
    window.location = `${constants.OKTA_ENDPOINT}/login/signout?fromURI=${window.location.href}`;
  } else if (idp == "Google") {
    // It is not necesary to signout from Google. The Google auth provider
    // allows this app to ask that the signin expeprience prompt the user
    // to select an account.
  }

  return false;
}

function newAccessToken(event) {
  event.preventDefault();
  clearApiOutput();
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
        const ta = $sel("#api-output textarea");
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

async function showOutput(res, variant, opaOptions) {
  const txt = await res.text();
  const json = txt ? JSON.parse(txt) : null;
  const ta = $sel(`#${variant}-output textarea`);
  const label = `status: ${res.status}`;
  let headers = "";
  if (variant == "api") {
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
    headers = h.join("\n") + "\n\n";
    ta.value = label + "\n\n" + headers + JSON.stringify(json, null, 2);
  } /* opa */ else {
    const textToShow = () => {
      if (opaOptions.isAuthzCheck) {
        return JSON.stringify(json, null, 2);
      }
      if (opaOptions.itemType == "data") {
        return JSON_StringifyPrettyCompact(json.result);
      }
      if (opaOptions.itemType == "policies") {
        return json.result.raw;
      }
      return json ? JSON.stringify(json, null, 2) : "";
    };
    ta.value = label + "\n\n" + textToShow();
  }

  $sel(`#btn-${variant}-clear`).classList.toggle("hidden", false);
}

function showApiOutput(res) {
  showOutput(res, "api");
}

const showOpaOutput = (isAuthzCheck, itemType) => (res) =>
  showOutput(res, "opa", { isAuthzCheck, itemType });

function clearOutput(event, variant) {
  if (event) {
    event.preventDefault();
  }
  $sel(`#${variant}-output textarea`).value = "";
  $sel(`#btn-${variant}-clear`).classList.toggle("hidden", true);
}

function clearApiOutput(event) {
  clearOutput(event, "api");
}
function clearOpaOutput(event) {
  clearOutput(event, "opa");
}

function sendApiRequest(event) {
  event.preventDefault();
  clearApiOutput();
  const accessToken = getDisplayedAccessToken();
  if (!accessToken) {
    message("There is no access token");
    return false;
  }
  const extraneousDoubleSlashFinder = new RegExp("^(https?://[^/]+)//(.+)$");
  let url = $sel("#txt-api-baseurl").innerHTML + $sel("#txt-api-urlpath").value;

  for (const m = extraneousDoubleSlashFinder.exec(url); m; ) {
    url = m[1] + "/" + m[2];
  }

  // POST to the API endpoint.
  const method = $sel("#sel-api-verb").value,
    headers = {};
  let body = null;

  headers.Authorization = `Bearer ${accessToken}`;

  if (httpMethodHasPayload(method)) {
    headers["content-type"] = $sel("#sel-contenttype").value;
    body = $sel("#ta-api-body").value;
  }

  fetch(url, { method, headers, body })
    .then(showApiOutput)
    .catch((e) => {
      console.log(e);
    });

  return false;
}

function sendOpaRequest(event) {
  event.preventDefault();
  clearOpaOutput();
  const urlBase = `${constants.APIGEE_ENDPOINT}${constants.OPA_BASEPATH}`;
  const action = $sel("#sel-opa-action").value;
  let method, headers, body, url;
  let cb = null;
  if (action == "AUTHZQUERY") {
    url = `${urlBase}/v1/data/protected_apis/authz/allowed`;
    method = "POST";
    headers = { "content-type": "application/json" };
    body = $sel("#ta-opa-body").value;
    cb = showOpaOutput(true);
  } else if (action == "READCONFIG") {
    method = "GET";
    headers = {};
    const dataSelection = $sel("#sel-opa-data").value,
      [prefix, id] = dataSelection.split(":");
    url = `${urlBase}/v1/${prefix}/${id}`;
    cb = showOpaOutput(false, prefix);
  } else if (action == "UPDATEPERMS") {
    method = "POST";
    headers = { "content-type": "application/x-www-form-urlencoded" };
    const permsSelection = $sel("#sel-opa-perms").value,
      [prefix, id] = permsSelection.split(":");
    url = `${urlBase}/permissions/${id}`;
    cb = showOpaOutput(false, prefix);
    body = "";
  }
  if (method) {
    fetch(url, { method, headers, body })
      .then(cb)
      .catch((e) => {
        console.log(e);
      });
  }

  return false;
}

function tabChanged(event) {
  // event.target // newly activated tab
  // event.relatedTarget // previous active tab
  const source = event.target, // the button that was clicked
    id = source.getAttribute("id");
  storeItem("active-tab", id);
}

document.addEventListener("DOMContentLoaded", (_event) => {
  addFirebaseAuthChangeListener();
  $sel("#message").innerHTML = ""; // clear message
  $sel("#btn-signin").addEventListener("click", signin);
  $sel("#btn-signout").addEventListener("click", signout);
  $sel("#btn-showIdToken").addEventListener("click", showIdToken);
  $sel("#btn-newAccessToken").addEventListener("click", newAccessToken);

  populateFormFields();

  // preset things based on the select boxes
  const method = $sel(`#sel-api-verb`).value;
  setElementVisibility("havepayload", httpMethodHasPayload(method));

  const idp = $sel(`#sel-api-idp`).value;
  setElementVisibility("emailpw", idp === "emailpw");

  const action = $sel(`#sel-opa-action`).value;
  setElementVisibility("readconfig", action == "READCONFIG");
  setElementVisibility("authzquery", action == "AUTHZQUERY");
  setElementVisibility("updateperms", action == "UPDATEPERMS");

  [].forEach.call($all("form .txt"), (el) => {
    const handler = debounce(450, onInputChanged);
    el.addEventListener("change", handler);
    el.addEventListener("input", handler);
    el.addEventListener("keyup", handler);
  });

  document.getElementById("txt-api-baseurl").innerHTML =
    constants.APIGEE_ENDPOINT;

  $sel("#btn-api-send").addEventListener("click", sendApiRequest);
  $sel("#btn-api-clear").addEventListener("click", clearApiOutput);
  $sel("#btn-opa-send").addEventListener("click", sendOpaRequest);
  $sel("#btn-opa-clear").addEventListener("click", clearOpaOutput);

  [].forEach.call($all("form select"), (el) => {
    el.addEventListener("change", onSelectChanged);
  });

  [].forEach.call($all('button[data-bs-toggle="tab"]'), (el) =>
    el.addEventListener("shown.bs.tab", tabChanged)
  );

  const el = $sel(`#nav-tabs button[id="${model["active-tab"]}"]`);
  if (el) {
    el.click();
  }
});
