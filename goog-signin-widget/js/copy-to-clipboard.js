// copy-to-clipboard.js
// ------------------------------------------------------------------
//
// created: Tue Oct  1 16:53:51 2019
// last saved: <2019-October-01 16:56:23>

/* jshint esversion:9, node:false, strict:implied */
/* global window, document */

(function () {
  const copyReceiverId = '_copy-receiver-' + randomString();

  function randomString(){
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  function copyToClipboard(elem) {
    // create hidden text element, if it doesn't already exist
    let sourceId = elem.getAttribute('data-target'),
        source = document.getElementById(sourceId),
        isInput = source.tagName === "INPUT" || source.tagName === "TEXTAREA";

    let origSelectionStart, origSelectionEnd, receiverElement;
    if (isInput) {
      // can just use the original source element for the selection and copy
      receiverElement = source;
      origSelectionStart = source.selectionStart;
      origSelectionEnd = source.selectionEnd;
    }
    else {
      // must use a temporary form element for the selection and copy
      receiverElement = document.getElementById(copyReceiverId);
      if (!receiverElement) {
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
    var currentFocus = document.activeElement;
    receiverElement.focus();
    receiverElement.setSelectionRange(0, receiverElement.value.length);

    // copy the selection
    let success;
    try {
      success = document.execCommand("copy");
    }
    catch(e) {
      success = false;
    }
    // restore original focus
    if (currentFocus && typeof currentFocus.focus === "function") {
      currentFocus.focus();
    }

    if (isInput) {
      // restore prior selection
      elem.setSelectionRange(origSelectionStart, origSelectionEnd);
    }
    else {
      // clear temporary content
      receiverElement.textContent = "";
    }
    return success;
  }

  window.gapiPostInit = copyToClipboard;

}());
