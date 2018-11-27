// pkce-link-builder-page.js
// ------------------------------------------------------------------
//
// page logic for link-builder.html and link-builder2.html
//
// created: Thu Oct  1 13:37:31 2015
// last saved: <2018-November-27 13:45:14>

/* global $, CryptoJS, Clipboard */

(function (){
  'use strict';
  var model = model || {
        apihost : '',
        edgeorg : '',
        edgeenv : '',
        clientid : '',
        cburi : '',
        scope : []
      };
  var extraneousDoubleSlashFinder = new RegExp('^(https?://[^/]+)//(.+)$');

  // for localstorage
  var html5AppId = html5AppId || "6E72F190-495A-4064-B74E-BF299336629E";
  var linkTemplate = linkTemplate || "http://${edgeorg}-${edgeenv}.apigee.net/oauth2/v1/authorize?client_id=${clientid}&redirect_uri=${cburi}&response_type=${rtype}&state=${state}&scope=${scope}";

  function wrapInSingleQuote(s) {return "'" + s + "'";}

  function updateLink() {
    var link = linkTemplate;
    Object.keys(model)
      .forEach(function(key) {
        var pattern = "${" + key + "}", value = '';
        value = (typeof model[key] != 'string') ? model[key].join('+') : model[key];
        if ((model[key]) && (key !== 'code_challenge' && key !== 'code_verifier') && (value !== null) && (typeof value !== 'undefined')) {
          window.localStorage.setItem(html5AppId + '.model.' + key, value);
        }
        link = link.replace(pattern,value);
      });
    var m = extraneousDoubleSlashFinder.exec(link);
    if (m) { link = m[1] + '/' + m[2]; }
    $('#authzlink').text(link);
    $('#authzlink').attr('href', link);

    if (model.code) {
      var re1 = new RegExp('/authorize.+');
      var newUrl = link.replace(re1, '/token');
      var payload = 'grant_type=authorization_code&code=' + model.code + '&code_verifier=' + model.code_verifier;
      $('#redeemCode').text('curl -X POST -H content-type:application/x-www-form-urlencoded -u ' +
                            model.clientid + ':' + model.clientsecret + ' ' +
                            wrapInSingleQuote(newUrl) + ' -d ' + wrapInSingleQuote(payload));
      $('#authzRedemption').show();
    }
    else {
      $('#authzRedemption').hide();
    }
  }

  function onInputChanged() {
    var $$ = $(this), name = $$.attr('id'), value = $$.val();
    model[name] = value;
    updateLink();
  }

  function onSelectChanged() {
    var $$ = $(this), name = $$.attr('name'), values = [];
    $$.find("option:selected" ).each(function() {
      values.push($( this ).text());
    });
    model[name] = values;
    updateLink();
  }

  function updateModel(event) {
    Object.keys(model).forEach(function(key) {
      var $item = $('#' + key), value = $item.val();
      model[key] = value || '';
    });
    updateLink();
    if (event)
      event.preventDefault();
  }

  function resetRedemption(event) {
    $('#redeemResult').html('');
    $('#redeemCode').text('');
    $('#code').val('');
    updateModel();
    if (event)
      event.preventDefault();
  }

  function invokeRedemption(event) {
    var linkUrl = $('#authzlink').text();
    var re1 = new RegExp('/authorize.+');
    var newUrl = linkUrl.replace(re1, '/token');
    var payload = {
          grant_type: 'authorization_code',
          code: model.code
        };

    // NB: This call will fail if the server does not include CORS headers in the response
    $.ajax({
      url : newUrl,
      type: "POST",
      headers: { 'Authorization': 'Basic ' + btoa( model.clientid + ':' + model.clientsecret ) },
      data : payload,
      success: function(data, textStatus, jqXHR) {
        //data - response from server
        $('#redeemResult')
          .removeClass('error')
          .html('<pre class="access-token-response">' +
                JSON.stringify(data, null, 2) +
                '</pre>');
      },
      error: function (jqXHR, textStatus, errorThrown) {
        $('#redeemResult')
          .addClass('error')
          .html('<pre class="access-token-response">' +
                JSON.stringify(jqXHR.responseJSON || "error", null, 2) +
                '</pre>');
      }
    });

    if (event)
      event.preventDefault();
  }

  function excludeTransientFields(key) {
    return ['code', 'code_challenge', 'code_verifier'].indexOf(key) == -1;
  }

  function generateRandomAlphaNumericString(L) {
    function c() {
      return (Math.floor(Math.random() * 5)<1) ?
        (Math.floor(Math.random() * 10) + 48) :
        String.fromCharCode(65 + Math.floor(Math.random() * 26) + (Math.floor(Math.random() * 2) * 32));
    }
    var i, s = '';
    L = L || (Math.floor(Math.random() * 7) + 8);
    for (i=0; i<L; i++) {
      s += c();
    }
    return s;
  }

  function base64url(source) {
    var encodedSource = CryptoJS.enc.Base64
      .stringify(source)
      .replace(/=+$/, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    return encodedSource;
  }

  function populateFormFields() {
    // get values from local storage, and place into the form
    Object.keys(model)
      .filter(excludeTransientFields)
      .forEach(function(key) {
        var value = window.localStorage.getItem(html5AppId + '.model.' + key);
        var $item = $('#' + key);
        if ((key === 'code_challenge') || (key === 'code_verifier') ){
          // no-op. should never happen
        }
        else if (value && value !== '') {
          if (typeof model[key] !== 'string') {
            // the value is a set of values concatenated by +
            // and the type of form field is select.
            value.split('+').forEach(function(part){
              $item.find("option[value='"+part+"']").prop("selected", "selected");
            });
            $item.trigger("chosen:updated");
          }
          else {
            // value is a simple string, form field type is input.
            $item.val(value);
          }
        }
      });

    // RFC 7636 says "a random string of length between 43 and 128 chars"
    var chosenLength = (Math.floor(Math.random() * (128 - 43)) + 43);
    var code_verifier = generateRandomAlphaNumericString(chosenLength);
    $('#code_verifier').val(code_verifier);
    $('#code_challenge').val(base64url(CryptoJS.SHA256(code_verifier)));
  }


  $(document).ready(function() {
    $('.scope-chosen').chosen({
      no_results_text: "No matching scopes...",
      allow_single_deselect: true
    });

    $( "form input[type='text']" ).change(onInputChanged);
    $( "form select" ).change(onSelectChanged);
    $( "form button" ).submit(updateModel);

    $( "#invokeRedemption" ).click(invokeRedemption);
    $( "#resetRedemption" ).click(resetRedemption);

    populateFormFields();

    if (typeof Clipboard != 'undefined') {
      // attach clipboard things
      new Clipboard('.clipboard-btn');
    }

    updateModel();

  });


}());
