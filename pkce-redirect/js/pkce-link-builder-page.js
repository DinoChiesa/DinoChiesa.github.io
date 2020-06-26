// pkce-link-builder-page.js
// ------------------------------------------------------------------
//
// page logic for link-builder.html and link-builder2.html
//
// created: Thu Oct  1 13:37:31 2015
// last saved: <2020-June-26 09:52:53>

/* jshint esversion:9, strict:implied */
/* global $, CryptoJS, document, window, btoa */

(function (){
     let model = {
       edgeorg : '',
       edgeenv : '',
       basepath : '',
       clientid : '',
       clientsecret : '',
       cburi : '',
       code_verifier : '',
       code_challenge : '',
       code : '',
       scope : []
         };
  const defaults = {
          basepath : '/20181127/oauth2-ac-pkce',
          cburi: 'https://dinochiesa.github.io/pkce-redirect/callback-handler.html',
          scope : 'A'
      };
  // for localstorage
  const html5AppId = '07c2a3c2-b9dc-4ee3-882e-b5f8a40f2ad4';
  const linkTemplate = "https://${edgeorg}-${edgeenv}.apigee.net/${basepath}/authorize?client_id=${clientid}&redirect_uri=${cburi}&response_type=code&scope=${scope}&code_challenge_method=S256&code_challenge=${code_challenge}";

  const extraneousDoubleSlashFinder = new RegExp('^(https?://[^/]+)//(.+)$');

  function copyToClipboard(event) {
    let $elt = $(this),
        sourceElement = $elt.data('target'),
        // grab the element to copy
        $source = $('#' + sourceElement),
        // Create a temporary hidden textarea.
        $temp = $("<textarea>");

    let textToCopy = ($source[0].tagName == 'TEXTAREA') ? $source.val() : $source.text();

    $("body").append($temp);
    $temp.val(textToCopy).select();
    let success;
    try {
      success = document.execCommand("copy");
      if (success) {
        $source.addClass('copy-to-clipboard-flash-bg')
          .delay('1000')
          .queue( _ => $source.removeClass('copy-to-clipboard-flash-bg').dequeue() );
      }
    }
    catch(e) {
      success = false;
    }
    $temp.remove();
    return success;
  }

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
      let re1 = new RegExp('/authorize.+'),
          newUrl = link.replace(re1, '/token'),
          payloadParams = {
            grant_type : 'authorization_code',
            code: model.code,
            code_verifier: model.code_verifier,
            client_id : model.clientid
          },
          payload = new URLSearchParams(payloadParams).toString();
      $('#redeemCode').text('curl -X POST -H content-type:application/x-www-form-urlencoded ' +
                            wrapInSingleQuote(newUrl) + ' -d ' + wrapInSingleQuote(payload));
      $('#authzRedemption').show();
    }
    else {
      $('#authzRedemption').hide();
    }
  }

  function onInputChanged() {
    let $$ = $(this), name = $$.attr('id'), value = $$.val();
    model[name] = value;
    updateLink();
  }

  function onSelectChanged() {
    let $$ = $(this), name = $$.attr('name'), values = [];
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
          code: model.code,
          code_verifier : $('#code_verifier').val()
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

  function applyValue($item, key, value) {
    if (typeof model[key] !== 'string') {
      // the value is a set of values concatenated by +
      // and the type of form field is select.
      value.split('+').forEach(function(part){
        $item.find("option[value='"+part+"']").prop("selected", "selected");
      });
      $item.trigger("chosen:updated");
    }
    else {
      $item.val(value);
    }
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
          applyValue($item, key, value);
        }
        else if (defaults[key]) {
          // this probably happens on first page load
          applyValue($item, key, defaults[key]);
        }
      });

    newPkceVerifier();
  }

  function newPkceVerifier(event) {
    // RFC 7636 says "a random string of length between 43 and 128 chars"
    var chosenLength = (Math.floor(Math.random() * (128 - 43)) + 43);
    var code_verifier = generateRandomAlphaNumericString(chosenLength);
    $('#code_verifier').val(code_verifier)
      .trigger('change');
    $('#code_challenge').val(base64url(CryptoJS.SHA256(code_verifier)))
      .trigger('change');
  }


  $(document).ready(function() {
    $('.scope-chosen').chosen({
      no_results_text: "No matching scopes...",
      allow_single_deselect: true
    });

    populateFormFields();

    $( "form input[type='text']" ).change(onInputChanged);
    $( "form select" ).change(onSelectChanged);
    $( "form button" ).submit(updateModel);

    $( "#invokeRedemption" ).click(invokeRedemption);
    $( "#resetRedemption" ).click(resetRedemption);

    $( '.btn-copy' ).on('click', copyToClipboard);
    $( '.btn-reload' ).on('click', newPkceVerifier);

    $( '[data-bootstrap-ui="tooltip"]').tooltip();

    updateModel();

  });


}());
