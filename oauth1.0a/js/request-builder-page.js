// request-builder-page.js
// ------------------------------------------------------------------
//
// page logic for oauth1.0a request-builder.html
//
// created: Thu Oct  1 13:37:31 2015
// last saved: <2019-July-24 09:25:37>

/* global $, CryptoJS, Clipboard */

var model = model || {
      reqmethod : '',
      targurl : '',
      qfparams : '',
      consumerkey : '',
      consumersecret : '',
      version : '',
      token : '',
      tokensecret : '',
      timestamp : '',
      nonce : ''
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
  return getQueryOrFormParams('qparam');
}

function getQueryOrFormParams(divClass) {
  var a = [];
  $('div.' + divClass).each(function(ix) {
    var $inputs = $(this).children('input');
    if ($inputs.length == 2 && $inputs[0].value) { // non-blank
      a.push(rfc3986EncodeURIComponent($inputs[0].value) + '=' + rfc3986EncodeURIComponent($inputs[1].value));
    }
  });
  return a;
}

function getQueryAndFormParams() {
  return getQueryOrFormParams('qparam').concat(getQueryOrFormParams('fparam'));
}

function getOauthParams(nonce, timestamp) {
  var a = [
        'consumer_key=' + $('#consumerkey').val(),
        'nonce=' + nonce,
        'timestamp=' + timestamp,
        'version=' + $('#version').val(),
        'signature_method=HMAC-SHA1'
      ];
  ['callback', 'verifier', 'token'].forEach(function(term){
    var value = $('#' + term).val();
    if (value) { a.push(term + '=' + rfc3986EncodeURIComponent(value)); }
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

function computeNormalizedParameters(nonce, timestamp) {
  var allparams = getQueryAndFormParams()
    .concat( getOauthParams(nonce, timestamp) )
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

function produceHeader(signature, nonce, timestamp) {
  // Eg, something like:
  // OAuth realm="http://sp.example.com/",
  //    oauth_consumer_key="0685bd9184jfhq22",
  //    oauth_token="ad180jjd733klru7",
  //    oauth_signature_method="HMAC-SHA1",
  //    oauth_signature="wOJIO9A2W5mFwDgiDvZbTSMK%2FPY%3D",
  //    oauth_timestamp="137131200",
  //    oauth_nonce="4572616e48616d6d65724c61686176",
  //    oauth_version="1.0"
  var oauthparams = getOauthParams(nonce, timestamp);
  oauthparams.push('oauth_signature=' + rfc3986EncodeURIComponent(signature));
  var oauthparams_in_qparams = getQueryAndFormParams().filter(function(elt){return elt.startsWith('oauth_');});
  if (oauthparams_in_qparams.length > 0) {
    oauthparams = oauthparams.concat(oauthparams_in_qparams);
  }
  oauthparams.sort();
  // return 'OAuth realm="'+ (realm || '')+'",' +
  //   oauthparams.map(quoteValue).join(',');
  var realmString = $('#realm').val() ? (quoteValue('realm=' +$('#realm').val().trim()) + ',') : '';
  return 'OAuth ' + realmString + oauthparams.map(quoteValue).join(',');
}

function now() {
  var value = (new Date()).valueOf() / 1000;
  value = value.toFixed(0);
  return value;
}

function newNonce() {
  var length = Math.floor((Math.random() * 18 + 4));
  return generateRandomString(length);
}

function produceSignature(event) {
  var nonce = ($('#chk-nonce').is(':checked')) ? newNonce() : $('#nonce').val();
  var timestamp = ($('#chk-timestamp').is(':checked')) ? now() : $('#timestamp').val();

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
    var normalized = computeNormalizedParameters(nonce, timestamp);
    var baseString = computeBaseString(normalized);
    var key = $('#consumersecret').val() + '&';
    var tokenSecret = $('#tokensecret').val();
    if (tokenSecret !== '') { key += tokenSecret; }
    var signature = computeHmacSha1(baseString, key);
    var header = produceHeader(signature, nonce, timestamp);
    var url = $('#targurl').val();
    var qparams = getQueryParams();
    if (qparams.length > 0) { url += '?' + qparams.join('&'); }
    $table.append('<tr><th>Normalized parameters</th><td style="overflow-wrap:break-word;">'+ normalized +'</td></tr>');
    $table.append('<tr><th>Signature base string</th><td style="overflow-wrap:break-word;">'+ baseString +'</td></tr>');
    $table.append('<tr><th>Key</th><td>'+ key +'</td></tr>');
    $table.append('<tr><th>Signature</th><td>'+ signature +'</td></tr>');
    $table.append('<tr><th>Authorization Header</th><td style="overflow-wrap:break-word;">'+ header +'</td></tr>');
    $table.append('<tr><th>curl command' +
                  '<button class="btn btn-default no-padding" id="btn-copy" type="button">Copy</button>' +
                  '</th><td id="curlcmd" style="overflow-wrap:break-word;">curl -i -X '+ getRequestMethod() +
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


function clearError() {
  var $output = $('#output');
  $output.html('');
}

function emitError(msg) {
  var $output = $('#output');
  clearError();
  var $div = $('<div id="error-message" class="error-message">' + msg + '</div>');
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
    var $item = $('#' + key);
    if (key === 'nonce') {
      $item.val(newNonce());
    }
    else if (key === 'timestamp') {
      $item.val(now());
    }
    else {
      var storedValue = window.localStorage.getItem(html5AppId + '.model.' + key);
      if (storedValue && storedValue !== '') {
        if (key === 'reqmethod') { // (typeof model[key] != 'string')
          // the value is a string, one item in a select
          $item.find("option[value='"+storedValue+"']").prop("selected", "selected");
          $item.trigger("chosen:updated");
        }
        else {
          // value is a simple string, form field type is input.
          $item.val(storedValue);
        }
      }
      else {
        if (key === 'version') {
          $item.val('1.0');
        }
      }
    }
  });
}

function insertNow(event) {
  //var $$ = $(this), name = $$.attr('id'), value = $$.val();
  var $$ = $('#timestamp');
  $$.val(now());
  if (event)
    event.preventDefault();
}

function insertNonce(event) {
  var $$ = $('#nonce');
  $$.val(newNonce());
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

function addQueryOrFormParam(type, event) {
  event.preventDefault();
  var divClass = (type == 'query')? 'qparam' : 'fparam';
  var $params = $('div.form-group.' + divClass);
  var max_num_fields = 10;
  if($params.length < max_num_fields) {
    var x = $params.length + 1;
    var keyid = divClass + '_key_' + x;
    var valueid = divClass + '_val_' + x;
    var $containingDiv = $(event.target).parent().parent();
    $containingDiv.next('div').before('<div class="form-group ' + divClass + '">' +
                               '<label><button class="btn btn-default remove-param no-padding" type="button" class="btn btn-default">X</button></label>' +
                               '<input class="form-control" title="parameter name" id="'+keyid+'"/>' +
                               '<input class="form-control" title="parameter value" id="'+valueid+'"/>' +
                               '</div>');
  }
}

function addQueryParam(event) {
  return addQueryOrFormParam('query', event);
}

function addFormParam(event) {
  return addQueryOrFormParam('form', event);
}

function removeParam(event){
  event.preventDefault();
  var $containingDiv = $(event.target).parent().parent();
  $containingDiv.remove();
}

function checkedChange(which) {
  return function() {
    let $which = $('#' + which);
    if (this.checked) {
      $which.prop('disabled', true);
      $('#btn-' + which).prop('disabled', true);
      $which.val('....');
    }
    else {
      $which.prop('disabled', false);
      $('#btn-' + which).prop('disabled', false);
      $which.val((which == 'nonce')?newNonce():now());
    }
  };
}

$(document).ready(function() {
  $('.reqmethod-chosen').chosen({
    no_results_text: 'No matching method...',
    allow_single_deselect: true
  });

  $( '#btn-timestamp' ).click(insertNow);
  $( '#btn-nonce' ).click(insertNonce);
  $( '#btn-add-qparam').click(addQueryParam);
  $( '#btn-add-fparam').click(addFormParam);
  $( '#btn-sign' ).click(produceSignature);
  $( '#btn-reset' ).click(resetForm);
  $('form').on('click', '.remove-param', removeParam);

  populateFormFields();

  $("#chk-timestamp")
    .change( checkedChange('timestamp') )
    .trigger('click');

  $("#chk-nonce")
    .change( checkedChange('nonce') )
    .trigger('click');


});
