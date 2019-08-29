/* jshint esversion: 9 */
/* global $ atob KJUR KEYUTIL CodeMirror */

const tenMinutes = 10 * 60;
const reSignedJwt2 = new RegExp('^([^\\.]+)(\\.)([^\\.]+)(\\.)([^\\.]+)$');
const reSignedJwt = new RegExp('^([^\\.]+)\\.([^\\.]+)\\.([^\\.]+)$');
const sampledata = {
        initialJwt :
        "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJpc3MiOiJEaW5vQ2hpZXNhLmdpdGh1Yi5pbyIsInN1YiI6ImFubmEiLCJhdWQiOiJhbG1hIiwiaWF0IjoxNTY3MDk4NjI0LCJleHAiOjE1NjcwOTkyMjR9.YHjyxxBBJhjjTAVetV79SpSodffq-gDdCkY3P393cNBgpTuBBARlDqKN2BFbiKOZd0p7G2SAmQd3rdYe1r3SFVt4BOp_9jhEHQH9_KfExJ_adbqO3Cbul87vzKIFVW8JlN0CKZypp58XIaBoLGOGOMXbB_P3V0cIOtblOskYowe_FqDvUJ-yuLTDW6MPIzAQRtOOoJj3pZm97GlAM8uS4vvIz32yK3qEzHfSqVOdrS8mk1W97ec0OIXXz9ZjazQ8Kxzt83favYWL9UctwJ_mHyVPWKUUfQmykr1kDRwzDJwmhLp2Y-LM0f2II-1P_a8UJOfEhJfSWxSMy1x0CTMjVg",
        startingKeys : {
          rsapublic :
          "-----BEGIN PUBLIC KEY-----\n" +
            "...\n" +
            "-----END PUBLIC KEY-----\n",
          // "-----BEGIN PUBLIC KEY-----\n" +
          //   "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtRxbunkP43TVuRwgXIam\n" +
          //   "mdVArEcOerG1cGkqukFlEHtWdY5qy5RXBcqmhzGvuQH9l/oU08ikH9fQlM1O4oez\n" +
          //   "2gMkX2hWRt8kx3LsCbpFY12lPAtldDHTorvVQ7Sgv+6Z/YzdDkC58sPaOVp0lMYX\n" +
          //   "kzF1DW+Uj6CW0ojLwTaCyKaZzdfuV9cHi+n25K5fgxQhM2OkbutRO/cwaq7Eal4F\n" +
          //   "V7xZZXIzVrIOfYL6bNOyGzR7DJRrpA6K4Ys76CQQTUd0+ueY8kgusGly1vb3iEiO\n" +
          //   "vHPGJhWrLREiBJEScXvjn6EP7aBHCwW3mB1AgnTwrQrZmGgCZvKRe81IJcb2cab1\n" +
          //   "jwIDAQAB\n" +
          //   "-----END PUBLIC KEY-----\n",

          rsaprivate :
          "-----BEGIN PRIVATE KEY-----\n" +
            "...\n" +
            "-----END PRIVATE KEY-----\n"
          // "-----BEGIN PRIVATE KEY-----\n" +
          //   "MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC1HFu6eQ/jdNW5\n" +
          //   "HCBchqaZ1UCsRw56sbVwaSq6QWUQe1Z1jmrLlFcFyqaHMa+5Af2X+hTTyKQf19CU\n" +
          //   "zU7ih7PaAyRfaFZG3yTHcuwJukVjXaU8C2V0MdOiu9VDtKC/7pn9jN0OQLnyw9o5\n" +
          //   "WnSUxheTMXUNb5SPoJbSiMvBNoLIppnN1+5X1weL6fbkrl+DFCEzY6Ru61E79zBq\n" +
          //   "rsRqXgVXvFllcjNWsg59gvps07IbNHsMlGukDorhizvoJBBNR3T655jySC6waXLW\n" +
          //   "9veISI68c8YmFastESIEkRJxe+OfoQ/toEcLBbeYHUCCdPCtCtmYaAJm8pF7zUgl\n" +
          //   "xvZxpvWPAgMBAAECggEAWaOojvnecFDie1U9ey42BUu0T9B3jSipyfJzcG5vjCHP\n" +
          //   "oC2WFB7el4I+vAlOlP40OuVPK6dR/GS/2vZnBd3umYgWl5Y3papKNOFfjE0CjPTL\n" +
          //   "lJV7aHBE9HWNT452Rajd1M3El4pXvp1LRDnOG9iT0ImZCsZgPFpaa+fDGWVWg+KE\n" +
          //   "TpFbVbYV33QEKIQzETZd3xxVhJspF3QObq+su3MttSvDlChRZy1quC8gtozdu84x\n" +
          //   "6DBMTKGpqVuGHH0UE8P/rgLaVDpjmxu98nedCgRTDdWHMfZkhK//+SYiuqE1a0ti\n" +
          //   "fP3L7gHii9tWO90mHjcIMN1M3vCT/6CYkv3FZOO5qQKBgQDfm4U4QYU/q2YRpGrn\n" +
          //   "vGxgKI2wW92JRQvEmqLt/TciZX3TiJGZh8mcM7Scnb43TvqAUhyQHumh9NSxBapR\n" +
          //   "PSM1JWHQPyDH99XRuxA2kJ42dcIUjg8xa+ZtWomzNNbX57G62xL9B4UGPE1N1784\n" +
          //   "tRBCqukmL0fdUeVhpDAJcC0YgwKBgQDPWNkBj1nrwjnKZcG1Dkwl/OuOrvulrQYI\n" +
          //   "3K5LsieAOD6YjV0w3o1CsYbjLJonUQF7M+2I2YEi1GlURz3xSFFdnIFGW/Bu6MGF\n" +
          //   "rImnM8cQZoLOST2RQchCxTVwnAnaTSOOjnMceiPaK94zV43rFW5zuq554ONm57WH\n" +
          //   "2aPt3F2pBQKBgHkndZ4OehkOUCZc9IOM5xeOwX59t+HpZD/pHUBfg2ECppNXmrQa\n" +
          //   "C5WzujdljKvBAh9G3i0EYsgatKcZj7emrY3dLEs9+Q//631Qoq892ktdsIOcmQTJ\n" +
          //   "FrfHZ3aOuZ2P7w90JaytR1kikSwNKpGaIS5OFjdXRNPYzLUD1fc3LWfrAoGBAL+S\n" +
          //   "gFVfpB4eQpTM9W8aOaLzjpQy+hB1z1iKxILtpG9kB/mcythnFy7ipRTp1bezsWGq\n" +
          //   "dbH1+8k5ZePXOtTeE0chXZOrSHbAmGSwKDKStT5i6EI+CyNVGvkOCjT0Bmpq0Qpa\n" +
          //   "dOJ/uvZNh6v6HgZws687cQ7siE5AkUll/X68FtEdAoGAJJQ1V96dv6kEpeOSzWSl\n" +
          //   "unG5mW5JAq2EVNAG4bhRj8G3M78jkrAvVR3OTW9cJhE4crsyfkMfktfUJm8wtKL+\n" +
          //   "KTWeDxFRb/M6g61XuxKy9dn1okIkYokDj/KPjja8X3oJj4aLhfs6p5nCT7KNgxv3\n" +
          //   "r1XzPLWHQE7QZ+A91M0Gna4=\n" +
          //   "-----END PRIVATE KEY-----\n"
        },
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

// function colorCode(tokenString){
//   var matches = reSignedJwt.exec(tokenString);
//   if (matches.length == 4) {
//     // color code
//     return tokenString.replace(reSignedJwt, '<div id="token-raw"><span class="jwt-header">$1</span>.<span class="jwt-payload">$2</span>.<span class="jwt-signature">$3</span></div>');
//   }
//   return tokenString;
// }

function copyButtonHtml(elementid) {
  return '<button type="button" title="copy to clipboard" class="btn btn-outline-secondary btn-md btn-copy" data-target="'+ elementid +'">' +
    '<span class="oi oi-clipboard"></span>' +
    '</button>';
}

function capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// function selectAll(event) {
//   // select all text in the parent of the parent
//   let $elt = $(this),
//       element = $elt.parent().parent().get(0);
//   selectText(element);
// }
//
// function selectText(element) {
//     if (document.body.createTextRange) { // ms
//         let range = document.body.createTextRange();
//         range.moveToElementText(element);
//         range.select();
//     } else if (window.getSelection) {
//         var selection = window.getSelection();
//       let range = document.createRange();
//         range.selectNodeContents(element);
//         selection.removeAllRanges();
//         selection.addRange(range);
//     }
// }


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
    editors[elementId].save();
    let text =  $('#' + elementId).val();
    values[flavor] = JSON.parse(text);
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
  // TODO: implement this?
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
  updateKeyValue('private',pem1);
  updateKeyValue('public', pem2);
  encodeJwt(event); // re-sign same content
}

function showDecoded() {
  //let tokenString = $( '#encodedjwt').text();
  let tokenString = $( '#encodedjwt').val();
  var matches = reSignedJwt.exec(tokenString);
  if (matches && matches.length == 4) {
    var flavors = ['header','payload']; // cannot decode signature
    //var $decodeddiv = $("<div id='token-decoded' class='decoded'/>");
    matches.slice(1,-1).forEach(function(item,index) {
      let json = atob(item),  // base64-decode
          obj = JSON.parse(json),
          flavor = flavors[index],
          //prettyPrintedJson = markupJson(styles[index], JSON.stringify(obj,null,2)),
          prettyPrintedJson = JSON.stringify(obj,null,2),
          elementId = 'token-decoded-' + flavor,
          html = '<p>' + capitalize(flavor) + copyButtonHtml(elementId) + '</p>'+
        '<textarea title="decoded ' + flavor + '" ' + 'class="jwt-'+ flavor + '" ' + 'id="' + elementId + '" ' + '>' +
        prettyPrintedJson + '</textarea>';
      $('#' + flavor).html(html);
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
    $( '.btn-copy' )
      .off('click')
      .on('click', copyToClipboard);

    // $( 'pre.CodeMirror-line > span' )
    //   .off('click')
    //   .on('click', selectAll);
  }
}

function setInitialKeyValue(flavor, keyvalue) {
  let keytype = flavor+'key', // private || public
      elementId = 'ta_'+ keytype;
  $('#' + keytype).html('<p>'+ capitalize(flavor)+ ' key' + copyButtonHtml(elementId) + '</p>'+
                        '<textarea id="'+elementId+'">' + keyvalue +'</textarea>');
  if (editors[keytype]) {
    let wrapper = editors[keytype].getWrapperElement();
    wrapper.parentNode.removeChild(wrapper);
  }
  editors[keytype] = CodeMirror.fromTextArea(document.getElementById(elementId), {
    mode: 'encodedjwt',
    lineWrapping: true
  });
}


$(document).ready(function() {

  $( '.btn-encode' ).on('click', encodeJwt);
  $( '.btn-decode' ).on('click', decodeJwt);
  $( '.btn-refresh' ).on('click', newKeyPair);
  $( '.btn-alert' ).on('click', toggleAlert);
  $("#mainalert").hide();
  $('#mainalert').on('close.bs.alert', toggleAlert);

  ['private', 'public'].forEach( flavor => setInitialKeyValue(flavor, sampledata.startingKeys['rsa'+flavor].trim()) );

  $( '.btn-copy' ).on('click', copyToClipboard);

  setTimeout(function() {
    // let now = Math.floor((new Date()).valueOf() / 1000),
    //     sub = selectRandomValue(sampledata.names),
    //     aud = selectRandomValueExcept(sampledata.names, sub),
    //     payload = {
    //       iss:"DinoChiesa.github.io",
    //       sub,
    //       aud,
    //       iat: now,
    //       exp: now + tenMinutes
    //     },
    //     header = {},
    //     jwt = createJwt(header, payload);
    // $( '#encodedjwt').val(jwt);

    $( '#encodedjwt').val(sampledata.initialJwt);

    editors.encoded = CodeMirror.fromTextArea(document.getElementById('encodedjwt'), {
      mode: 'encodedjwt',
      lineWrapping: true
    });

    showDecoded();
  }, 180);
});
