// page.js
// ------------------------------------------------------------------
//
// created: Tue Apr 21 12:25:22 2020
// last saved: <2023-August-21 11:13:35>

/* jshint esversion:9, node:false, strict:implied */
/* global window, console, Blob, $, jQuery, Buffer */

(function () {
  //const newlineRegex = new RegExp('(\r\n|\n)', 'g');

  function getOperation() {
    const op = $('#operation option:selected').val();
    return op.toUpperCase();
  }

  function hexToByteArrayBuffer(hex) {
    const bytes = [];
    for (let c = 0; c < hex.length; c += 2)
      bytes.push(parseInt(hex.substr(c, 2), 16));
    return new Uint8Array(bytes).buffer;
  }

  function hexEncode(hashArray) {
    // convert bytes to hex string
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  function arrayToBase64( bytes ) {
    let binary = '';
    const LEN = bytes.length;
    for (let i = 0; i < LEN; i++) {
      binary += String.fromCharCode( bytes[ i ] );
    }
    return window.btoa( binary );
  }

  function b64ToB64url(text) {
    return text
      .replace(new RegExp('\\+', 'g'), '-')
      .replace(new RegExp('/', 'g'), '_')
      .replace(new RegExp('=+$'), '');
  }

  function calcResult(event) {
    if (event) { event.preventDefault(); }
    //debugger;
    const message = $('#text').val();
    if (message) {
      const op = getOperation();
      if (op == 'ENCODE') {
        const result = window.btoa(message);
        $('#resultB64').text(result);
        $('#resultB64url').text(b64ToB64url(result));
        $('#output_encoded').addClass('shown').removeClass('notshown');
        $('#output_decoded').addClass('notshown').removeClass('shown');
      }
      else if (op === 'DECODE') {
        try {
          const result = window.atob(message);
          const roundtrip = window.btoa(result);
          if (result == roundtrip) {
            $('#resultPlain').text(result);
          }
          else {
            // cannot decode into UTF-8 string
          }
        }
        catch(exc){
          $('#resultPlain').text(exc.message);
        }
        $('#output_decoded').addClass('shown').removeClass('notshown');
        $('#output_encoded').addClass('notshown').removeClass('shown');
      }
    }
    else {
      // blank
      $('#resultB64').text("");
      $('#resultB64url').text("");
      $('#resultPlain').text("");
      $('#output_encoded').addClass('notshown').removeClass('shown');
      $('#output_decoded').addClass('notshown').removeClass('shown');
    }
  }

  function changeText(event) {
    return calcResult(event);
  }

  function changeOperation(event) {
    const message = $('#text').val();
    if (message) {
      const op = getOperation();
      if (op == 'ENCODE') {
        const plain = $('#resultPlain').text();
        $('#text').val(plain);
      }
      else if (op === 'DECODE') {
        const encoded = $('#resultB64').text();
        $('#text').val(encoded);
      }
    }

    return calcResult(event);
  }

  function copyToClipboard(_event) {
    const $elt = $(this),
          $textHolder = $elt.next(),
          // Create a temporary hidden textarea.
          $temp = $("<textarea>");

    const textToCopy = ($textHolder.tagName == 'TEXTAREA' || $textHolder.tagName == 'INPUT') ? $textHolder.val() : $textHolder.text();

    $("body").append($temp);
    $temp.val(textToCopy).select();
    let success;
    try {
      success = window.document.execCommand("copy");
      if (success) {
        // Animation to indicate copy.
        $textHolder.addClass('copy-to-clipboard-flash-bg')
          .delay('1000')
          .queue( _ => $textHolder.removeClass('copy-to-clipboard-flash-bg').dequeue() );
      }
    }
    catch (_e) {
      success = false;
    }
    $temp.remove();
    return success;
  }

  $(window.document).ready(function() {
    $('#operation').val('');
    $('#operation').change(changeOperation);
    $('#operation').val('encode');
    $('#text').bind('input propertychange', changeText);
    $('.copyIconHolder').on('click', copyToClipboard);
    changeText();
  });

}());
