/* jshint esversion: 9 */
/* global $ atob KJUR KEYUTIL CodeMirror */

const tenMinutes = 10 * 60;
const reSignedJwt2 = new RegExp('^([^\\.]+)(\\.)([^\\.]+)(\\.)([^\\.]+)$');
const reSignedJwt = new RegExp('^([^\\.]+)\\.([^\\.]+)\\.([^\\.]+)$');
const sampledata = {
        names : ['audrey', 'olaf', 'vinit', 'alma', 'ming', 'naimish', 'anna', ]
      };

const rsaAlgs = ['RS','PS'].reduce( (a, v) =>
    [...a, ...[256,384,512].map(x=>v+x)], []);

let editors = {}; // codemirror editors

CodeMirror.defineSimpleMode("encodedjwt", {
  start : [
    {
      regex: reSignedJwt2,
      sol: true,
      token: ["jwt-header", "", "jwt-payload", "", "jwt-signature"]
    }
  ]
});

function selectRandomValueExcept (a, b) {
  let v = null;
  do {
    v = selectRandomValue (a);
  } while(v == b);
  return v;
}

function selectRandomValue (a) {
  let L = a.length,
      n = Math.floor(Math.random() * L);
  return a[n];
}

function getPrivateKey() {
  editors.privatekey.save();
  let keyvalue = $('#ta_privatekey').val();
  return keyvalue;
}

function createJwt(header, payload) {
  if ( ! header.typ) { header.typ = "JWT"; }
  if ( ! header.alg) { header.alg = "RS256"; }
  let privateKey = getPrivateKey();
  let signed = KJUR.jws.JWS.sign(null, header, payload, privateKey);
  return signed;
}

function capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function copyToClipboard(event) {
  let $elt = $(this),
      sourceElement = $elt.data('target'),
      // grab the element to copy
      $source = $('#' + sourceElement),
      // Create a temporary hidden textarea.
      $temp = $("<textarea>");

  if (editors[sourceElement]) {
    editors[sourceElement].save();
  }

  let textToCopy = ($source[0].tagName == 'TEXTAREA') ? $source.val() : $source.text();

  $("body").append($temp);
  $temp.val(textToCopy).select();
  document.execCommand("copy");
  $temp.remove();
}

function encodeJwt(event) {
  let flavors = ['header', 'payload'],
      values = {};
  flavors.forEach( flavor => {
    let elementId = 'token-decoded-' + flavor;
    if (editors[elementId]) {
      editors[elementId].save();
      let text =  $('#' + elementId).val();
      values[flavor] = JSON.parse(text);
    }
  });

  try {
    let jwt = createJwt(values.header, values.payload);
    editors.encoded.setValue(jwt);
    editors.encoded.save();
    showDecoded(); // why? to re-format JSON
  }
  catch (e) {
    setAlert(e);
    $("#mainalert").show();
  }
}

function decodeJwt(event) {
  showDecoded();
}

function setAlert(html) {
  let buttonHtml = '<button type="button" class="close" data-dismiss="alert" aria-label="Close">\n' +
    ' <span aria-hidden="true">&times;</span>\n' +
    '</button>';
  $("#mainalert").html(html + buttonHtml);
}

function toggleAlert(event){
  $("#mainalert").toggle();
  return false; // Keep close.bs.alert event from removing from DOM
}

function updateKeyValue(flavor /* public || private */, keyvalue) {
  let editor = editors[flavor+'key'];
  if (editor) {
    editor.setValue(keyvalue);
    editor.save();
  }
}

function newKeyPair(event) {
  let keypair = KEYUTIL.generateKeypair("RSA", 2048),
      pem1 = KEYUTIL.getPEM(keypair.prvKeyObj, "PKCS8PRV"),
      pem2 = KEYUTIL.getPEM(keypair.pubKeyObj);
  updateKeyValue('private', pem1);
  updateKeyValue('public', pem2);
  //encodeJwt(event); // re-sign same content
}

function showDecoded() {
  editors.encoded.save();
  let tokenString = $('#encodedjwt').val(),
      matches = reSignedJwt.exec(tokenString);
  if (matches && matches.length == 4) {
    $("#mainalert").hide();
    let flavors = ['header','payload']; // cannot decode signature
    //var $decodeddiv = $("<div id='token-decoded' class='decoded'/>");
    matches.slice(1,-1).forEach(function(item,index) {
      let json = atob(item),  // base64-decode
          obj = JSON.parse(json),
          flavor = flavors[index],
          prettyPrintedJson = JSON.stringify(obj,null,2),
          elementId = 'token-decoded-' + flavor;
      editors[elementId].setValue(prettyPrintedJson);
    });
  }
  else {
    setAlert("That does not appear to be a signed JWT");
    $("#mainalert").show();
  }

}

function contriveJwt(event) {
    let now = Math.floor((new Date()).valueOf() / 1000),
        sub = selectRandomValue(sampledata.names),
        aud = selectRandomValueExcept(sampledata.names, sub),
        payload = {
          iss:"DinoChiesa.github.io",
          sub,
          aud,
          iat: now,
          exp: now + tenMinutes
        },
        header = {};

  editors['token-decoded-header'].setValue(JSON.stringify(header));
  editors['token-decoded-payload'].setValue(JSON.stringify(payload));
  encodeJwt(event);
}

$(document).ready(function() {
  $( '.btn-copy' ).on('click', copyToClipboard);
  $( '.btn-encode' ).on('click', encodeJwt);
  $( '.btn-decode' ).on('click', decodeJwt);
  $( '.btn-newkeypair' ).on('click', newKeyPair);
  $( '.btn-regen' ).on('click', contriveJwt);

  $("#mainalert").hide();
  $('#mainalert').on('close.bs.alert', toggleAlert);

  editors.encoded = CodeMirror.fromTextArea(document.getElementById('encodedjwt'), {
    mode: 'encodedjwt',
    lineWrapping: true
  });

  editors.encoded.on('inputRead', function(cm, event) {
    /* event -> object{
       origin: string, can be '+input', '+move' or 'paste'
       doc for origins >> http://codemirror.net/doc/manual.html#selection_origin
       from: object {line, ch},
       to: object {line, ch},
       removed: array of removed strings
       text: array of pasted strings
       } */
    if (event.origin == 'paste') {
      setTimeout(decodeJwt, 220);
    }
  });

  ['private', 'public'].forEach( flavor => {
    let keytype = flavor+'key', // private || public
        elementId = 'ta_'+ keytype;
    editors[keytype] = CodeMirror.fromTextArea(document.getElementById(elementId), {
      mode: 'encodedjwt',
      lineWrapping: true
    });
  });

  ['header', 'payload'].forEach( portion => {
    let elementId = 'token-decoded-' + portion;
    editors[elementId] = CodeMirror.fromTextArea(document.getElementById(elementId), {
      mode: {
        name: 'javascript',
        json: true,
        indentWithTabs: false,
        statementIndent : 2,
        indentUnit : 2,
        tabSize: 2
      }
    });
  });

  newKeyPair();
  contriveJwt();

});
