// request-builder-page.js
// ------------------------------------------------------------------
//
// page logic for oauth1.0a request-builder.html
//
// created: Thu Oct  1 13:37:31 2015
// last saved: <2017-March-02 11:58:57>

var model = model || {
      reqmethod : '',
      targurl : '',
      qparams : '',
      consumerkey : '',
      consumersecret : '',
      token : '',
      tokensecret : ''
    };

// for localstorage
var html5AppId = html5AppId || "7AF40F8E-6334-478E-9410-019F5AF0940F";

function generateRandomString(L) {
  var c = function() {
        var m = Math.floor(Math.random() * 26),
            a = (Math.floor(Math.random() * 2) * 32);
        return String.fromCharCode(65 + m + a);
      },
      i,
      pw = '';

  L = Math.floor(Math.random() * (L || 7)) + 8;

  for (i=0; i<L; i++) {
    pw += c();
  }
  return pw;
}

function getQueryParams() {
  var value = $('#qparams').val(), a = [];
  if (value && value.length > 0) {
    a = value.split('&');
  }
  return a;
}

function getOauthParams() {
  var a = [
        'consumer_key=' + $('#consumerkey').val(),
        'nonce=' + $('#nonce').val(),
        'timestamp=' + $('#timestamp').val(),
        'version=1.0',
        'signature_method=HMAC-SHA1'
      ];
  ['callback', 'verifier', 'token'].forEach(function(term){
    var value = $('#' + term).val();
    if (value) { a.push(term + '=' + value); }
  });
  return a.map(function(elt){return 'oauth_' + elt;});
}

function computeHmacSha1(input, key) {
  var hmac = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA1, key);
  hmac.update(input);
  var hash = hmac.finalize();
  var hashInBase64 = CryptoJS.enc.Base64.stringify(hash);
  return hashInBase64;
}

function computeNormalizedParameters() {
  var allparams = getQueryParams()
    .concat( getOauthParams() )
    .sort();
  return allparams.join('&');
}

function getRequestMethod() {
  var $$ = $('#reqmethod'), value = '';
  $$.find("option:selected").each(function() {
    value = $( this ).text().toUpperCase();
  });
  return value;
}

function rfc3986EncodeURIComponent (str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, function(c) {
    return '%' + c.charCodeAt(0).toString(16);
  });
}

function computeBaseString(normalized) {
  return [
        getRequestMethod(),
        $('#targurl').val(),
        normalized
      ]
    .map(function(elt) { return rfc3986EncodeURIComponent(elt);})
    .join('&');
}

var onEquals = new RegExp('=(?=.+)');
function quoteValue(elt) {
  // elt is like:   name=value
  // we must return name="value"
  var pair = elt.split(onEquals, 2);
  return pair[0] + '="' + pair[1] + '"';
}

function produceHeader(signature, realm) {
  // Eg, something like:
  // OAuth realm="http://sp.example.com/",
  //    oauth_consumer_key="0685bd9184jfhq22",
  //    oauth_token="ad180jjd733klru7",
  //    oauth_signature_method="HMAC-SHA1",
  //    oauth_signature="wOJIO9A2W5mFwDgiDvZbTSMK%2FPY%3D",
  //    oauth_timestamp="137131200",
  //    oauth_nonce="4572616e48616d6d65724c61686176",
  //    oauth_version="1.0"
  var oauthparams = getOauthParams();
  oauthparams.push('oauth_signature=' + rfc3986EncodeURIComponent(signature));
  var oauthparams_in_qparams = getQueryParams().filter(function(elt){return elt.startsWith('oauth_');});
  if (oauthparams_in_qparams.length > 0) {
    oauthparams = oauthparams.concat(oauthparams_in_qparams);
  }
  oauthparams.sort();
  // return 'OAuth realm="'+ (realm || '')+'",' +
  //   oauthparams.map(quoteValue).join(',');
  var realmString = $('#realm').val() ? (quoteValue('realm=' +$('#realm').val().trim()) + ',') : '';
  return 'OAuth ' + realmString + oauthparams.map(quoteValue).join(',');
}


function produceSignature(event) {
  var nonce = $('#nonce');
  var timestamp = $('#timestamp');
  if (nonce === '' || nonce == 'undefined') {
    emitError('missing required parameter: nonce');
  }
  else if (timestamp === '' || timestamp == 'undefined') {
    emitError('missing required parameter: timestamp');
  }
  else if (getRequestMethod() === ''){
    emitError('missing required parameter: method');
  }
  else {
    storeFormFieldValues();
    var $output = $('#output');
    var $table = $('<table id="sigtable" class="table table-hover table-mc-light-blue table-bordered"></table>');
    var normalized = computeNormalizedParameters();
    var baseString = computeBaseString(normalized);
    var key = $('#consumersecret').val() + '&';
    var tokenSecret = $('#tokensecret').val();
    if (tokenSecret !== '') { key += tokenSecret; }
    var signature = computeHmacSha1(baseString, key);
    var header = produceHeader(signature);
    var url = $('#targurl').val();
    var qparams = $('#qparams').val();
    if (qparams !== '') { url += '?' + qparams; }
    $table.append('<tr><th>Normalized parameters</th><td>'+ normalized +'</td></tr>');
    $table.append('<tr><th>Signature base string</th><td>'+ baseString +'</td></tr>');
    $table.append('<tr><th>Key</th><td>'+ key +'</td></tr>');
    $table.append('<tr><th>Signature</th><td>'+ signature +'</td></tr>');
    $table.append('<tr><th>Authorization Header</th><td>'+ header +'</td></tr>');
    $table.append('<tr><th>curl command' +
                  '<button class="btn" id="btn-copy" type="button">Copy</button>' +
                  '</th><td id="curlcmd">curl -i -X '+ getRequestMethod() +
                  ' -H \'Authorization: '+ header + '\' \'' + url +
                  '\'</td></tr>');
    new Clipboard('#btn-copy', {
      target: function(trigger) { return document.getElementById( "curlcmd" ); }
    });
    $output.html('');
    $output.append($table);
  }
  if (event)
    event.preventDefault();
}

function emitError(msg) {
  var $output = $('#output');
  var $div = $('<div class="error-message">' + msg + '</div>');
  $output.append($div);

}

// function updateModel(event) {
//   Object.keys(model).forEach(function(key) {
//     var $item = $('#' + key), value = $item.val();
//     model[key] = value;
//   });
//
//   if (event)
//     event.preventDefault();
// }

function storeFormFieldValues() {
  Object.keys(model).forEach(function(key) {
    var $item = $('#' + key);
    var value = $item.val();
    window.localStorage.setItem(html5AppId + '.model.' + key, value);
  });
}

function populateFormFields() {
  // get values from local storage, and place into the form
  Object.keys(model).forEach(function(key) {
    var value = window.localStorage.getItem(html5AppId + '.model.' + key);
    if (value && value !== '') {
      var $item = $('#' + key);
      if (typeof model[key] != 'string') {
        // the value is a set of values concatenated by +
        // and the type of form field is select.
        value.split('+').forEach(function(part){
          $item.find("option[value='"+part+"']").prop("selected", "selected");
        });
      }
      else {
        // value is a simple string, form field type is input.
        $item.val(value);
      }
    }
  });
}

function insertNow(event) {
  //var $$ = $(this), name = $$.attr('id'), value = $$.val();
  var $$ = $('#timestamp');
  var value = (new Date()).valueOf() / 1000;
  value = value.toFixed(0);
  $$.val(value + '');
  if (event)
    event.preventDefault();
}

function insertNonce(event) {
  var $$ = $('#nonce');
  var length = Math.floor((Math.random() * 13 + 13));
  $$.val(generateRandomString(length));
  if (event)
    event.preventDefault();
}

function resetForm(event){
  $('#output').html('');
  $('#timestamp').val('');
  $('#nonce').val('');
  $('#realm').val('');
  if (event)
    event.preventDefault();
}

$(document).ready(function() {
  $('.reqmethod-chosen').chosen({
    no_results_text: "No matching method...",
    allow_single_deselect: true
  });


  $( "#btn-now" ).click(insertNow);
  $( "#btn-random" ).click(insertNonce);
  $( "#btn-sign" ).click(produceSignature);
  $( "#btn-reset" ).click(resetForm);

  populateFormFields();

});
