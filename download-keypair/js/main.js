/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./node_modules/mini-css-extract-plugin/dist/loader.js??ruleSet[1].rules[1].use[1]!./node_modules/css-loader/dist/cjs.js!./node_modules/sass-loader/dist/cjs.js!./src/scss/app.scss":
/*!******************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/mini-css-extract-plugin/dist/loader.js??ruleSet[1].rules[1].use[1]!./node_modules/css-loader/dist/cjs.js!./node_modules/sass-loader/dist/cjs.js!./src/scss/app.scss ***!
  \******************************************************************************************************************************************************************************************/
/***/ (() => {

// extracted by mini-css-extract-plugin

/***/ }),

/***/ "./node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js":
/*!****************************************************************************!*\
  !*** ./node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js ***!
  \****************************************************************************/
/***/ ((module) => {

"use strict";


var stylesInDOM = [];
function getIndexByIdentifier(identifier) {
  var result = -1;
  for (var i = 0; i < stylesInDOM.length; i++) {
    if (stylesInDOM[i].identifier === identifier) {
      result = i;
      break;
    }
  }
  return result;
}
function modulesToDom(list, options) {
  var idCountMap = {};
  var identifiers = [];
  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    var id = options.base ? item[0] + options.base : item[0];
    var count = idCountMap[id] || 0;
    var identifier = "".concat(id, " ").concat(count);
    idCountMap[id] = count + 1;
    var indexByIdentifier = getIndexByIdentifier(identifier);
    var obj = {
      css: item[1],
      media: item[2],
      sourceMap: item[3],
      supports: item[4],
      layer: item[5]
    };
    if (indexByIdentifier !== -1) {
      stylesInDOM[indexByIdentifier].references++;
      stylesInDOM[indexByIdentifier].updater(obj);
    } else {
      var updater = addElementStyle(obj, options);
      options.byIndex = i;
      stylesInDOM.splice(i, 0, {
        identifier: identifier,
        updater: updater,
        references: 1
      });
    }
    identifiers.push(identifier);
  }
  return identifiers;
}
function addElementStyle(obj, options) {
  var api = options.domAPI(options);
  api.update(obj);
  var updater = function updater(newObj) {
    if (newObj) {
      if (newObj.css === obj.css && newObj.media === obj.media && newObj.sourceMap === obj.sourceMap && newObj.supports === obj.supports && newObj.layer === obj.layer) {
        return;
      }
      api.update(obj = newObj);
    } else {
      api.remove();
    }
  };
  return updater;
}
module.exports = function (list, options) {
  options = options || {};
  list = list || [];
  var lastIdentifiers = modulesToDom(list, options);
  return function update(newList) {
    newList = newList || [];
    for (var i = 0; i < lastIdentifiers.length; i++) {
      var identifier = lastIdentifiers[i];
      var index = getIndexByIdentifier(identifier);
      stylesInDOM[index].references--;
    }
    var newLastIdentifiers = modulesToDom(newList, options);
    for (var _i = 0; _i < lastIdentifiers.length; _i++) {
      var _identifier = lastIdentifiers[_i];
      var _index = getIndexByIdentifier(_identifier);
      if (stylesInDOM[_index].references === 0) {
        stylesInDOM[_index].updater();
        stylesInDOM.splice(_index, 1);
      }
    }
    lastIdentifiers = newLastIdentifiers;
  };
};

/***/ }),

/***/ "./node_modules/style-loader/dist/runtime/insertBySelector.js":
/*!********************************************************************!*\
  !*** ./node_modules/style-loader/dist/runtime/insertBySelector.js ***!
  \********************************************************************/
/***/ ((module) => {

"use strict";


var memo = {};

/* istanbul ignore next  */
function getTarget(target) {
  if (typeof memo[target] === "undefined") {
    var styleTarget = document.querySelector(target);

    // Special case to return head of iframe instead of iframe itself
    if (window.HTMLIFrameElement && styleTarget instanceof window.HTMLIFrameElement) {
      try {
        // This will throw an exception if access to iframe is blocked
        // due to cross-origin restrictions
        styleTarget = styleTarget.contentDocument.head;
      } catch (e) {
        // istanbul ignore next
        styleTarget = null;
      }
    }
    memo[target] = styleTarget;
  }
  return memo[target];
}

/* istanbul ignore next  */
function insertBySelector(insert, style) {
  var target = getTarget(insert);
  if (!target) {
    throw new Error("Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid.");
  }
  target.appendChild(style);
}
module.exports = insertBySelector;

/***/ }),

/***/ "./node_modules/style-loader/dist/runtime/insertStyleElement.js":
/*!**********************************************************************!*\
  !*** ./node_modules/style-loader/dist/runtime/insertStyleElement.js ***!
  \**********************************************************************/
/***/ ((module) => {

"use strict";


/* istanbul ignore next  */
function insertStyleElement(options) {
  var element = document.createElement("style");
  options.setAttributes(element, options.attributes);
  options.insert(element, options.options);
  return element;
}
module.exports = insertStyleElement;

/***/ }),

/***/ "./node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js":
/*!**********************************************************************************!*\
  !*** ./node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js ***!
  \**********************************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


/* istanbul ignore next  */
function setAttributesWithoutAttributes(styleElement) {
  var nonce =  true ? __webpack_require__.nc : 0;
  if (nonce) {
    styleElement.setAttribute("nonce", nonce);
  }
}
module.exports = setAttributesWithoutAttributes;

/***/ }),

/***/ "./node_modules/style-loader/dist/runtime/styleDomAPI.js":
/*!***************************************************************!*\
  !*** ./node_modules/style-loader/dist/runtime/styleDomAPI.js ***!
  \***************************************************************/
/***/ ((module) => {

"use strict";


/* istanbul ignore next  */
function apply(styleElement, options, obj) {
  var css = "";
  if (obj.supports) {
    css += "@supports (".concat(obj.supports, ") {");
  }
  if (obj.media) {
    css += "@media ".concat(obj.media, " {");
  }
  var needLayer = typeof obj.layer !== "undefined";
  if (needLayer) {
    css += "@layer".concat(obj.layer.length > 0 ? " ".concat(obj.layer) : "", " {");
  }
  css += obj.css;
  if (needLayer) {
    css += "}";
  }
  if (obj.media) {
    css += "}";
  }
  if (obj.supports) {
    css += "}";
  }
  var sourceMap = obj.sourceMap;
  if (sourceMap && typeof btoa !== "undefined") {
    css += "\n/*# sourceMappingURL=data:application/json;base64,".concat(btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap)))), " */");
  }

  // For old IE
  /* istanbul ignore if  */
  options.styleTagTransform(css, styleElement, options.options);
}
function removeStyleElement(styleElement) {
  // istanbul ignore if
  if (styleElement.parentNode === null) {
    return false;
  }
  styleElement.parentNode.removeChild(styleElement);
}

/* istanbul ignore next  */
function domAPI(options) {
  if (typeof document === "undefined") {
    return {
      update: function update() {},
      remove: function remove() {}
    };
  }
  var styleElement = options.insertStyleElement(options);
  return {
    update: function update(obj) {
      apply(styleElement, options, obj);
    },
    remove: function remove() {
      removeStyleElement(styleElement);
    }
  };
}
module.exports = domAPI;

/***/ }),

/***/ "./node_modules/style-loader/dist/runtime/styleTagTransform.js":
/*!*********************************************************************!*\
  !*** ./node_modules/style-loader/dist/runtime/styleTagTransform.js ***!
  \*********************************************************************/
/***/ ((module) => {

"use strict";


/* istanbul ignore next  */
function styleTagTransform(css, styleElement) {
  if (styleElement.styleSheet) {
    styleElement.styleSheet.cssText = css;
  } else {
    while (styleElement.firstChild) {
      styleElement.removeChild(styleElement.firstChild);
    }
    styleElement.appendChild(document.createTextNode(css));
  }
}
module.exports = styleTagTransform;

/***/ }),

/***/ "./src/js/LocalStorage.js":
/*!********************************!*\
  !*** ./src/js/LocalStorage.js ***!
  \********************************/
/***/ ((module) => {

// Copyright © 2019-2024 Google LLC.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

/* jshint esversion:9, node:true, strict:implied */
/* global window, console */

function AppScopedStoreManager(appid) {
  this.appid = appid;
}

AppScopedStoreManager.prototype.get = function (key) {
  return window.localStorage.getItem(this.appid + ".datamodel." + key);
};

AppScopedStoreManager.prototype.remove = function (key) {
  return window.localStorage.removeItem(this.appid + ".datamodel." + key);
};

AppScopedStoreManager.prototype.store = function (key, value) {
  return window.localStorage.setItem(this.appid + ".datamodel." + key, value);
};

const init = function (id) {
  return new AppScopedStoreManager(id);
};

module.exports = {
  init
};


/***/ }),

/***/ "./src/js/copy-to-clipboard.js":
/*!*************************************!*\
  !*** ./src/js/copy-to-clipboard.js ***!
  \*************************************/
/***/ ((module) => {

// Copyright © 2019-2024 Google LLC.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// created: Tue Oct  1 16:53:51 2019
// last saved: <2024-February-12 17:53:52>

/* jshint esversion:9, node:false, strict:implied */
/* global window, document, setTimeout */

const copyReceiverId = "_copy-receiver-" + randomString();

function randomString() {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

function copy(event) {
  const elem = event.currentTarget, // or this?
    sourceId = elem.getAttribute("data-target"),
    source = document.getElementById(sourceId),
    isInput = source.tagName === "INPUT" || source.tagName === "TEXTAREA";

  let origSelectionStart, origSelectionEnd, receiverElement;
  if (isInput) {
    // can just use the original source element for the selection and copy
    receiverElement = source;
    origSelectionStart = source.selectionStart;
    origSelectionEnd = source.selectionEnd;
  } else {
    // must use a temporary form element for the selection and copy
    receiverElement = document.getElementById(copyReceiverId);
    if (!receiverElement) {
      // create hidden text element, if it doesn't already exist
      receiverElement = document.createElement("textarea");
      receiverElement.style.position = "absolute";
      receiverElement.style.left = "-9999px";
      receiverElement.style.top = "0";
      receiverElement.id = copyReceiverId;
      document.body.appendChild(receiverElement);
    }
    receiverElement.textContent = source.textContent;
  }

  // select the content
  const currentFocus = document.activeElement;
  receiverElement.focus();
  receiverElement.setSelectionRange(0, receiverElement.value.length);

  // copy the selection
  let success;
  try {
    success = document.execCommand("copy");
    if (success) {
      source.classList.add("copy-to-clipboard-flash-bg");
      setTimeout(() => {
        source.classList.remove("copy-to-clipboard-flash-bg");
      }, 1000);
    }
  } catch (e) {
    success = false;
  }

  // restore original focus
  if (currentFocus && typeof currentFocus.focus === "function") {
    currentFocus.focus();
  }

  if (isInput) {
    // restore prior selection
    receiverElement.setSelectionRange(origSelectionStart, origSelectionEnd);
  } else {
    // clear temporary content
    receiverElement.textContent = "";
  }
  return success;
}

module.exports = {
  copy
};


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/nonce */
/******/ 	(() => {
/******/ 		__webpack_require__.nc = undefined;
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be in strict mode.
(() => {
"use strict";
var __webpack_exports__ = {};
/*!***********************!*\
  !*** ./src/js/app.js ***!
  \***********************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _LocalStorage_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./LocalStorage.js */ "./src/js/LocalStorage.js");
/* harmony import */ var _LocalStorage_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_LocalStorage_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _copy_to_clipboard_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./copy-to-clipboard.js */ "./src/js/copy-to-clipboard.js");
/* harmony import */ var _copy_to_clipboard_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_copy_to_clipboard_js__WEBPACK_IMPORTED_MODULE_1__);
// Copyright © 2020-2024 Google LLC.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

/* global atob, Buffer, BUILD_VERSION, Blob  */

/* import { _Tooltip, Popover } from "bootstrap"; */




const RSA_KEYTYPE = "RSASSA-PKCS1-v1_5", // "RSA-PSS"
  RSA_HASH = "SHA-256";
const html5AppId = "40F735E1-7977-4997-A7EE-FD1CFD84D470";
const storage = _LocalStorage_js__WEBPACK_IMPORTED_MODULE_0___default().init(html5AppId);
const $sel = (query) => document.querySelector(query),
  $all = (query) => document.querySelectorAll(query);

const datamodel = {
  "sel-variant": "",
  "sel-curve": "",
  "ta-publickey-RSA": "",
  "ta-privatekey-RSA": "",
  "ta-keyid-RSA": "",
  "ta-publickey-EC": "",
  "ta-privatekey-EC": "",
  "ta-keyid-EC": ""
};

function retrieveLocalState() {
  Object.keys(datamodel).forEach((key) => {
    const value = storage.get(key);
    if (key.startsWith("chk-")) {
      datamodel[key] = String(value) == "true";
    } else {
      datamodel[key] = value;
    }
  });
}

function saveSetting(key, value) {
  datamodel[key] = value;
  storage.store(key, value);
}

function setSelectOptionByValue(el, etxt) {
  for (let i = 0; i < el.options.length; ++i) {
    if (el.options[i].value === etxt) {
      el.options[i].selected = true;
    }
  }
}

function applyState() {
  // ordering is important. We must apply variant before curve.
  const keys = Object.keys(datamodel);
  keys.sort((a, b) =>
    a == "sel-variant" ? -1 : b == "sel-variant" ? 1 : a.localeCompare(b)
  );
  keys.forEach((key) => {
    const value = datamodel[key];
    if (value) {
      let el = $sel("#" + key);
      if (key.startsWith("sel-")) {
        setSelectOptionByValue(el, value);
        el.dispatchEvent(new Event("change", { bubbles: true }));
      } else if (key.startsWith("chk-")) {
        el.checked = String(value) == "true";
      } else if (
        key.startsWith("ta-publickey-") ||
        key.startsWith("ta-privatekey-") ||
        key.startsWith("ta-keyid-")
      ) {
        //const keytype = key.substr(3);
        const parts = key.split("-");
        if (parts[2] == datamodel["sel-variant"]) {
          const id = parts.slice(0, -1).join("-");
          el = $sel(`#${id}`);
          el.value = value;
        }
      } else {
        el.value = value;
      }
    }
  });

  const currentlySelectedVariant = getSelectedVariant();
  if (currentlySelectedVariant == "RSA") {
    const elCurve = $sel("#sel-curve");
    elCurve.classList.add("hide");
    elCurve.classList.remove("show");
  }
}

function str2ab(str) {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

function reformIndents(s) {
  const s2 = s
    .split(new RegExp("\n", "g"))
    .map((s) => s.trim())
    .join("\n");
  return s2.trim();
}

function handlePaste(event) {
  const elem = event.currentTarget;
  setTimeout(function () {
    const text = reformIndents(elem.value);
    elem.value = text;
  }, 100);
}

// function setAlert(html, alertClass) {
//   const buttonHtml =
//       '<button type="button" class="close" data-dismiss="alert" aria-label="Close">\n' +
//       ' <span aria-hidden="true">&times;</span>\n' +
//       "</button>",
//     mainalert = $sel("#mainalert");
//   mainalert.innerHTML = html + buttonHtml;
//   if (alertClass) {
//     mainalert.classList.remove("alert-warning"); // this is the default
//     mainalert.classList.add("alert-" + alertClass); // success, primary, warning, etc
//   } else {
//     mainalert.classList.add("alert-warning");
//   }
//   // show()
//   mainalert.classList.remove("fade");
//   mainalert.classList.add("show");
//   setTimeout(() => {
//     const mainalert = $sel("#mainalert");
//     mainalert.classList.add("fade");
//     mainalert.classList.remove("show");
//   }, 5650);
// }

function closeAlert(_event) {
  const mainalert = $sel("#mainalert");
  mainalert.classList.remove("show");
  mainalert.classList.add("fade");
  return false; // Keep close.bs.alert event from removing from DOM
}

function getKeyValue(flavor /* public || private */) {
  return $sel("#ta-" + flavor + "key").value;
}

function key2pem(flavor, keydata) {
  let body = window.btoa(String.fromCharCode(...new Uint8Array(keydata)));
  body = body.match(/.{1,64}/g).join("\n");
  return `-----BEGIN ${flavor} KEY-----\n${body}\n-----END ${flavor} KEY-----`;
}

function userDownload(blob, fileName) {
  const a = document.createElement("a");
  document.body.appendChild(a);
  a.style = "display: none";
  const url = window.URL.createObjectURL(blob);
  a.href = url;
  a.download = fileName;
  a.click();
  window.URL.revokeObjectURL(url);
}

// function getTimestampString() {
//   let s = (new Date()).toISOString(); // ex: 2019-09-04T21:29:23.428Z
//   let re = new RegExp('[-:TZ\\.]', 'g');
//   return s.replace(re, '');
// }

function displayKeyValues(publickey, privatekey, keyid) {
  $sel("#ta-publickey").value = publickey + "\n";
  $sel("#ta-privatekey").value = privatekey + "\n";
  $sel("#ta-keyid").value = keyid;
}

function displayAndStoreKeyValues(publickey, privatekey, keyid) {
  const variant = getSelectedVariant();
  displayKeyValues(publickey, privatekey, keyid);
  saveSetting(`ta-privatekey-${variant}`, privatekey);
  saveSetting(`ta-publickey-${variant}`, publickey);
  saveSetting(`ta-keyid-${variant}`, keyid);
}

function exportPublicToPem(key) {
  return window.crypto.subtle
    .exportKey("spki", key.publicKey)
    .then((r) => key2pem("PUBLIC", r));
}

function exportPrivateToPkcs8(key) {
  return window.crypto.subtle
    .exportKey("pkcs8", key.privateKey)
    .then((r) => key2pem("PRIVATE", r));
}

function reconstitutePrivateKeyFromPem(variant, namedCurve) {
  const pem = getKeyValue("private");
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = pem.substring(
    pemHeader.length,
    pem.length - pemFooter.length - 1
  );
  // base64 decode the string to get the binary data
  const binaryDerString = window.atob(pemContents);
  // convert from a binary string to an ArrayBuffer
  const binaryDer = str2ab(binaryDerString);
  const params =
    variant == "EC"
      ? { name: "ECDSA", namedCurve }
      : {
          name: RSA_KEYTYPE,
          hash: RSA_HASH
        };

  return window.crypto.subtle.importKey("pkcs8", binaryDer, params, true, [
    "sign"
  ]);
}

function getGenKeyParamsForECDSA() {
  const el = $sel("#sel-curve");
  const namedCurve = el.options[el.selectedIndex].value;
  return {
    name: "ECDSA",
    namedCurve
  };
}

function getGenKeyParamsForRSA(hash) {
  return {
    name: RSA_KEYTYPE,
    modulusLength: 2048, //can be 1024, 2048, or 4096
    publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
    hash: { name: hash } // eg "SHA-256", or "SHA-512"
  };
}

function newKeyPair(_event) {
  const variant = getSelectedVariant(),
    genKeyParams =
      variant == "RSA"
        ? getGenKeyParamsForRSA(RSA_HASH)
        : getGenKeyParamsForECDSA(),
    isExtractable = true,
    keyUse = ["sign", "verify"]; // relevant only for JWK export

  return window.crypto.subtle
    .generateKey(genKeyParams, isExtractable, keyUse)
    .then((key) =>
      Promise.all([exportPublicToPem(key), exportPrivateToPkcs8(key)])
    )
    .then(([publickey, privatekey]) => {
      const keyid = generateKeyId();
      displayAndStoreKeyValues(publickey, privatekey, keyid);
    })
    .then(() => {
      const mainalert = $sel("#mainalert");
      mainalert.classList.remove("show");
      mainalert.classList.add("fade");
    });
}

function generateKeyId() {
  const LENGTH = 28;
  let s = "";
  do {
    s += Math.random().toString(36).substring(2, 15);
  } while (s.length < LENGTH);
  return s.substring(0, LENGTH);
}

function getKeyId() {
  return $sel("#ta-keyid").value;
}

function getSelectedCurve() {
  const elCurve = $sel("#sel-curve");
  return elCurve.options[elCurve.selectedIndex].value;
}

function getSelectedVariant() {
  const elVariant = $sel("#sel-variant");
  return elVariant.options[elVariant.selectedIndex].value;
}

function downloadPem(event) {
  const elem = event.currentTarget, // or this?
    keyFlavor = elem.getAttribute("data-flavor"),
    privatekey = getKeyValue(keyFlavor),
    blob = new Blob([privatekey], { type: "text/plain; encoding=utf8" }),
    keyId = getKeyId(),
    variant = getSelectedVariant(),
    filename =
      variant == "RSA"
        ? `${variant}-${keyFlavor}key-${keyId}.pem`
        : `${variant}-${getSelectedCurve()}-${keyFlavor}key-${keyId}.pem`;
  userDownload(blob, filename);
}

function downloadJsonKeypair() {
  const variant = getSelectedVariant(),
    key_id = getKeyId(),
    json = {
      type: `${variant} key pair`,
      generated: new Date().toISOString(),
      generator: "dinochiesa.github.io/download-keypair",
      key_id,
      public_key: getKeyValue("public"),
      private_key: getKeyValue("private")
    };

  if (variant == "EC") {
    json.namedCurve = getSelectedCurve();
  }
  const blob = new Blob([JSON.stringify(json, null, 2)], {
      type: "text/plain; encoding=utf8"
    }),
    filename =
      variant == "RSA"
        ? `${variant}-keypair-${key_id}.json`
        : `${variant}-${getSelectedCurve()}-keypair-${key_id}.json`;

  userDownload(blob, filename);
}

async function exportPrivateToJwk(cryptoKey) {
  const jwk = await window.crypto.subtle.exportKey("jwk", cryptoKey);
  return [jwk, "private"];
  //    .then((r) => JSON.stringify(r, null, "  "));
}

async function exportPublicToJwk(cryptoKey) {
  // bunch of pushups to convert private key to public key JWK
  const [jwkPrivate] = await exportPrivateToJwk(cryptoKey);
  const alg = cryptoKey.algorithm;
  delete jwkPrivate.d;
  if (jwkPrivate.dp) {
    delete jwkPrivate.dp;
    delete jwkPrivate.dq;
    //delete jwkPrivate.p;
    delete jwkPrivate.q;
    delete jwkPrivate.qi;
  }
  jwkPrivate.key_ops = ["verify"];
  const jwk = await window.crypto.subtle
    .importKey(
      "jwk",
      jwkPrivate,
      {
        name: alg.name,
        namedCurve: alg.namedCurve,
        hash: alg.hash && alg.hash.name
      },
      true,
      ["verify"]
    )
    .then((key) => window.crypto.subtle.exportKey("jwk", key));
  return [jwk, "public"];
}

function downloadJwk(exportFn) {
  return async function () {
    const variant = getSelectedVariant(),
      key_id = getKeyId(),
      key = await reconstitutePrivateKeyFromPem(
        variant,
        variant == "EC" ? getSelectedCurve() : false
      ),
      [json, pubpriv] = await exportFn(key);

    json.kid = key_id;

    const blob = new Blob([JSON.stringify({ keys: [json] }, null, 2)], {
        type: "text/plain; encoding=utf8"
      }),
      filename =
        variant == "RSA"
          ? `${variant}-jwk-${pubpriv}-${key_id}.json`
          : `${variant}-${json.crv}-jwk-${pubpriv}-${key_id}.json`;

    userDownload(blob, filename);
  };
}

function conditionallyShowCurve(variantSelection) {
  const elCurve = $sel("#sel-curve");
  if (variantSelection == "RSA") {
    // not used for RSA
    elCurve.classList.add("hide");
    elCurve.classList.remove("show");
  } else {
    elCurve.classList.add("show");
    elCurve.classList.remove("hide");
  }
}

function resetKeyValues(variant) {
  const ids = ["publickey", "privatekey", "keyid"].map(
    (w) => `ta-${w}-${variant}`
  );
  const values = ids.map((id) => datamodel[id] || "");

  displayKeyValues(values[0], values[1], values[2]);
}

function onChangeVariant(_event) {
  const newSelection = getSelectedVariant();
  conditionallyShowCurve(newSelection);
  saveSetting("sel-variant", newSelection);
  resetKeyValues(newSelection);
}

function onChangeCurve(_event) {
  const elCurve = $sel("#sel-curve");
  const newSelection = elCurve.options[elCurve.selectedIndex].value;
  resetKeyValues();
  saveSetting("sel-curve", newSelection);
}

document.addEventListener("DOMContentLoaded", (_event) => {
  retrieveLocalState();
  applyState();

  $sel("#version_id").innerHTML = "1.0.4.6\n";
  $sel(".btn-newkeypair").addEventListener("click", newKeyPair);
  $sel(".btn-download-json").addEventListener("click", downloadJsonKeypair);
  $sel(".btn-download-jwk-private").addEventListener(
    "click",
    downloadJwk(exportPrivateToJwk)
  );
  $sel(".btn-download-jwk-public").addEventListener(
    "click",
    downloadJwk(exportPublicToJwk)
  );

  $all(".btn-copy").forEach((btn) =>
    btn.addEventListener("click", (_copy_to_clipboard_js__WEBPACK_IMPORTED_MODULE_1___default().copy))
  );
  $all(".btn-download-pem").forEach((btn) =>
    btn.addEventListener("click", downloadPem)
  );
  $all(".reform-indent-on-paste").forEach((ta) =>
    ta.addEventListener("paste", handlePaste)
  );

  $sel("#sel-variant").addEventListener("change", onChangeVariant);
  $sel("#sel-curve").addEventListener("change", onChangeCurve);

  const mainalert = $sel("#mainalert");
  mainalert.classList.add("fade");
  // not sure if the following is used
  mainalert.addEventListener("close.bs.alert", closeAlert);

  const variant = getSelectedVariant();
  conditionallyShowCurve(variant);
  if (
    !datamodel[`ta-privatekey-${variant}`] ||
    !datamodel[`ta-publickey-${variant}`]
  ) {
    newKeyPair();
  }
});

})();

// This entry need to be wrapped in an IIFE because it need to be in strict mode.
(() => {
"use strict";
/*!***************************!*\
  !*** ./src/scss/app.scss ***!
  \***************************/
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! !../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js */ "./node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! !../../node_modules/style-loader/dist/runtime/styleDomAPI.js */ "./node_modules/style-loader/dist/runtime/styleDomAPI.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! !../../node_modules/style-loader/dist/runtime/insertBySelector.js */ "./node_modules/style-loader/dist/runtime/insertBySelector.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! !../../node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js */ "./node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! !../../node_modules/style-loader/dist/runtime/insertStyleElement.js */ "./node_modules/style-loader/dist/runtime/insertStyleElement.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! !../../node_modules/style-loader/dist/runtime/styleTagTransform.js */ "./node_modules/style-loader/dist/runtime/styleTagTransform.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var _node_modules_mini_css_extract_plugin_dist_loader_js_ruleSet_1_rules_1_use_1_node_modules_css_loader_dist_cjs_js_node_modules_sass_loader_dist_cjs_js_app_scss__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! !!../../node_modules/mini-css-extract-plugin/dist/loader.js??ruleSet[1].rules[1].use[1]!../../node_modules/css-loader/dist/cjs.js!../../node_modules/sass-loader/dist/cjs.js!./app.scss */ "./node_modules/mini-css-extract-plugin/dist/loader.js??ruleSet[1].rules[1].use[1]!./node_modules/css-loader/dist/cjs.js!./node_modules/sass-loader/dist/cjs.js!./src/scss/app.scss");
/* harmony import */ var _node_modules_mini_css_extract_plugin_dist_loader_js_ruleSet_1_rules_1_use_1_node_modules_css_loader_dist_cjs_js_node_modules_sass_loader_dist_cjs_js_app_scss__WEBPACK_IMPORTED_MODULE_6___default = /*#__PURE__*/__webpack_require__.n(_node_modules_mini_css_extract_plugin_dist_loader_js_ruleSet_1_rules_1_use_1_node_modules_css_loader_dist_cjs_js_node_modules_sass_loader_dist_cjs_js_app_scss__WEBPACK_IMPORTED_MODULE_6__);
/* harmony reexport (unknown) */ var __WEBPACK_REEXPORT_OBJECT__ = {};
/* harmony reexport (unknown) */ for(const __WEBPACK_IMPORT_KEY__ in _node_modules_mini_css_extract_plugin_dist_loader_js_ruleSet_1_rules_1_use_1_node_modules_css_loader_dist_cjs_js_node_modules_sass_loader_dist_cjs_js_app_scss__WEBPACK_IMPORTED_MODULE_6__) if(__WEBPACK_IMPORT_KEY__ !== "default") __WEBPACK_REEXPORT_OBJECT__[__WEBPACK_IMPORT_KEY__] = () => _node_modules_mini_css_extract_plugin_dist_loader_js_ruleSet_1_rules_1_use_1_node_modules_css_loader_dist_cjs_js_node_modules_sass_loader_dist_cjs_js_app_scss__WEBPACK_IMPORTED_MODULE_6__[__WEBPACK_IMPORT_KEY__]
/* harmony reexport (unknown) */ __webpack_require__.d(__webpack_exports__, __WEBPACK_REEXPORT_OBJECT__);

      
      
      
      
      
      
      
      
      

var options = {};

options.styleTagTransform = (_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default());
options.setAttributes = (_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default());

      options.insert = _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default().bind(null, "head");
    
options.domAPI = (_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default());
options.insertStyleElement = (_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default());

var update = _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default()((_node_modules_mini_css_extract_plugin_dist_loader_js_ruleSet_1_rules_1_use_1_node_modules_css_loader_dist_cjs_js_node_modules_sass_loader_dist_cjs_js_app_scss__WEBPACK_IMPORTED_MODULE_6___default()), options);




       /* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ((_node_modules_mini_css_extract_plugin_dist_loader_js_ruleSet_1_rules_1_use_1_node_modules_css_loader_dist_cjs_js_node_modules_sass_loader_dist_cjs_js_app_scss__WEBPACK_IMPORTED_MODULE_6___default()) && (_node_modules_mini_css_extract_plugin_dist_loader_js_ruleSet_1_rules_1_use_1_node_modules_css_loader_dist_cjs_js_node_modules_sass_loader_dist_cjs_js_app_scss__WEBPACK_IMPORTED_MODULE_6___default().locals) ? (_node_modules_mini_css_extract_plugin_dist_loader_js_ruleSet_1_rules_1_use_1_node_modules_css_loader_dist_cjs_js_node_modules_sass_loader_dist_cjs_js_app_scss__WEBPACK_IMPORTED_MODULE_6___default().locals) : undefined);

})();

/******/ })()
;
//# sourceMappingURL=main.js.map