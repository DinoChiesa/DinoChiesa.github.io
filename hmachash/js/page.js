// page.js
// ------------------------------------------------------------------

/* jshint esversion:9, node:false, strict:implied */
/* global md5, console, Blob, $, jQuery, TextEncoder, crypto, window, Buffer */

(function () {
  const newlineRegex = new RegExp('(\r\n|\n)', 'g');
  let utf8Encoder = new TextEncoder("utf-8");
  let appId = '63894937-8A1F-40F0-8C4C-6656B3B9C056';

  function getHashName() {
    var hashName = $('#function option:selected').val();
    return hashName.toUpperCase();
  }

  function hexToByteArrayBuffer(hex) {
    for (var bytes = [], c = 0; c < hex.length; c += 2)
      bytes.push(parseInt(hex.substr(c, 2), 16));
    return new Uint8Array(bytes).buffer;
  }

  function getHash(message) {
    let algo = getHashName();
    if (algo == 'MD-5') {
      let r = md5(message); // md5('abc') = 900150983cd24fb0d6963f7d28e17f72
      return Promise.resolve(hexToByteArrayBuffer(r));
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    return crypto.subtle.digest(algo, data);
    // The result is a Promise that  returns an ArrayBuffer
  }

  function hexEncode(hashArray) {
    // convert bytes to hex string
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }
  function eraseResults() {
    $('#resultB16').text('');
    $('#resultB64').text('');
    $('#output').addClass('notshown').removeClass('shown');
  }

  function arrayToBase64( bytes ) {
    let binary = '';
    var len = bytes.length;
    for (var i = 0; i < len; i++) {
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


  function publishResults(resultBuffer, errorMessage) {
    if (errorMessage) {
      $('#resultB16').text(errorMessage);
      $('#resultB64').text('error');
      $('#resultB64url').text('error');
    }
    else if (resultBuffer) {
      // convert buffer to byte array
      const hashArray = Array.from(new Uint8Array(resultBuffer));
      const hashInBase16 = hexEncode(hashArray);
      $('#resultB16').text(hashInBase16);
      var hashInBase64 = arrayToBase64(hashArray);
      $('#resultB64').text(hashInBase64);
      $('#resultB64url').text(b64ToB64url(hashInBase64));
    }
    $('#output').addClass('shown').removeClass('notshown');
  }

  function convertKeyForHmac(key) {
    return window.crypto.subtle.importKey(
      "raw", // raw format of the key - should be Uint8Array
      utf8Encoder.encode(key),
      { // algorithm details
        name: "HMAC",
        hash: { name: getHashName() }
      },
      false, // export = false
      ["sign", "verify"] // what this key can do
    );
  }

  function calcHmac() {
    let message = $('#text').val();
    let key = $('#key').val();
    if (message!=null && key) {
      message = (new TextEncoder()).encode(message.replace(newlineRegex,'\n'));
      return convertKeyForHmac(key)
        .then(key => crypto.subtle.sign("HMAC", key, message))
        .then(arrayBuffer => publishResults(arrayBuffer))
        .catch(e => publishResults(null, e) );
    }
    else {
      publishResults(null, 'You must specify a message and a key');
    }
  }

  function calcHash() {
    var message = $('#text').val();
    if (message!=null) {
      var re1 = new RegExp('(\r\n|\n)', 'g');
      message = message.replace(re1,'\n');
      return getHash(message)
        .then(hashBuffer => publishResults(hashBuffer) )
        .catch(e => publishResults(null, e) );
    }
  }

  function calcResult(event) {
    if (event) { event.preventDefault(); }
    var message = $('#text').val();
    //var re1 = new RegExp('(\r\n|\n)', 'g');
    //alert('message:\n' + message.replace(re1,'\\n\n'));
    //if (message) {
    if ($('#hmac').is(':checked')) {
      return calcHmac();
    }
    else {
      return calcHash();
    }
    //}
  }

  function changeText(event) {
    let message = $('#text').val();
    window.localStorage.setItem(appId + '.model.text', message );
    if (getHashName()) {
      return calcResult(event);
    }
  }

  function changeKey(event) {
    let key = $('#key').val();
    window.localStorage.setItem(appId + '.model.key', key );
    if (getHashName()) {
      calcResult(event);
    }
  }

  function changeFunction(event) {
    if (event) { event.preventDefault(); }
    window.localStorage.setItem(appId + '.model.function', getHashName() );
    // enable the compute button
    // $( "#submit" ).removeClass('disabled').prop("disabled", false);
    //eraseResults();
    calcResult(event);
  }

  function changeHmac(event) {
    if (event) { event.preventDefault(); }

    let isChecked = $('#hmac').is(':checked');
    window.localStorage.setItem(appId + '.model.hmac', '' + isChecked );
    // display or hide the key as appropriate
    if (isChecked) {
      $('#pageHead').text('Calculate an HMAC with SHA or MD5');
      $('#key').addClass('shown') .removeClass('notshown');
      $('#keylabel').addClass('shown') .removeClass('notshown');
      $( "#key" ).removeClass('disabled') .prop("disabled", false);
    }
    else {
      $('#pageHead').text('Calculate a SHA or MD5');
      $('#key').addClass('notshown') .removeClass('shown');
      $('#keylabel').addClass('notshown') .removeClass('shown');
      $( "#key" ).addClass('disabled') .prop("disabled", true);
    }
    //eraseResults();
    calcResult(event);
  }

  function applySettings() {
    let propNames = ['key', 'text', 'hmac', 'function'];
    propNames.forEach( name => {
      let value = window.localStorage.getItem(appId + '.model.' + name );
      if (value) {
        if (name == 'hmac') {
          $("#hmac"). prop("checked", value.toLowerCase() == "true");
        }
        else if (name == 'function') {
          $('#function option[value='+ value.toLowerCase() +']').prop('selected', true);
        }
        else {
          $('#' + name).val(value);
        }
      }
    });
  }

  function copyToClipboard(event) {
    let $elt = $(this),
        $textHolder = $elt.next(),
        // Create a temporary hidden textarea.
        $temp = $("<textarea>");

    let textToCopy = ($textHolder.tagName == 'TEXTAREA' || $textHolder.tagName == 'INPUT') ? $textHolder.val() : $textHolder.text();

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
    catch (e) {
      success = false;
    }
    $temp.remove();
    return success;
  }

  $(window.document).ready(function() {
    $('#function').val('');
    $('#function').change(changeFunction);
    $('#function').val('sha-256');
    $('#hmac').change(changeHmac);
    $('#submit').on('click', calcResult);
    $('#text').bind('input propertychange', changeText);
    $('#key').bind('input propertychange', changeKey);
    $('.copyIconHolder').on('click', copyToClipboard);
    applySettings();
    changeHmac();
  });

}());
