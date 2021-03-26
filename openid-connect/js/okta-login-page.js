// okta-login-page.js
// ------------------------------------------------------------------
//
// This demonstrates a signin with a PKCE challenge and verifier.
//
//
// https://dev-329615.okta.com/oauth2/aus3nfybl0MgXSZtd357/v1/authorize?
// max_age=300&
// client_id=0oa3nwjx7q2Gbh0Df357&
// response_type=code&
// scope=openid%20offline_access&
// state=b3f8fcc4d1cb3a3180900648e23adae5ab66ae06974fba7fe6a1a31af0918170&
// redirect_uri=https://5g-dev.dinochiesa.net/oidc-1/callback&
// code_challenge_method=S256&
// code_challenge=BfrnJew_mGg-h4ztHpVlgP1O65HjOZEdT0uVdebiV6c
//
/* jshint esversion: 9, browser:true, strict:implied */
/* global $, TextEncoder */




(function (){

  const oktaTokenUrl = 'https://www.googleapis.com/oauth2/v4/token',
        extraneousDoubleSlashFinder = new RegExp('^(https?://[^/]+)//(.+)$');

  var html5AppId = html5AppId || "32649BAF-6FA5-4725-B992-5E48CDD37AE2",
      linkTemplate = linkTemplate || "https://${oktadomain}/oauth2/${authzserver}/v1/authorize?max_age=${maxage}&client_id=${clientid}&response_type=${rtype}&scope=${scope}&state=${state}&redirect_uri=${cburi}&code_challenge_method=S256&code_challenge=${pkce_challenge}";

  let model = {
        oktadomain : '',
        authzserver : '',
        clientid : '',
        clientsecret : '',
        maxage : '',
        cburi : '',
        state : '',
        verifier : '',
        code : '',
        rtype : [],
        scope : []
      };

  function randomValue(len) {
    let v = '';
    do {
      v += Math.random().toString(36).substring(2, 8);
    } while (v.length<len);
    return v.substring(0, len);
  }

  function reloadRandomValue(event) {
    let $elt = $(this),
        sourceElement = $elt.data('target'),
        // grab the element to copy
        $source = $('#' + sourceElement),
        desiredLength = Number($source.data('desired-length')) || 8,
        newValue = randomValue(desiredLength);
    $source.val(newValue);
    model[sourceElement] = newValue;
    updateLink();
  }

  const sha256 = message => {
          const encoder = new TextEncoder();
          const data = encoder.encode(message);
          return window.crypto.subtle.digest('SHA-256', data);
        };

const bufferToBase64UrlEncoded = (input) => {
  const bytes = new Uint8Array(input);
  return urlEncodeBase64(window.btoa(String.fromCharCode(...bytes)));
      };

const urlEncodeBase64 = (input) => {
  const chars = {'+': '-', '/': '_', '=': ''};
  return input.replace(/[\+\/=]/g, m => chars[m]);
      };

const sha256base64 = async msg => {
  const shaBuffer = await sha256(msg);
        const encoded = bufferToBase64UrlEncoded(shaBuffer);
        return encoded;
      };


  function copyToClipboard(event) {
    let $elt = $(this),
        sourceElement = $elt.data('target'),
        // grab the element to copy
        $source = $('#' + sourceElement),
        // Create a temporary hidden textarea.
        $temp = $('<textarea>');

    let textToCopy = ($source[0].tagName == 'TEXTAREA') ? $source.val() : $source.text();

    $('body').append($temp);
    $temp.val(textToCopy).select();
    document.execCommand('copy');
    $temp.remove();
  }

  function copyHash(obj) {
    var copy = {};
    if (null !== obj && typeof obj == 'object') {
      Object.keys(obj).forEach(function(attr){
        copy[attr] = (Array.isArray(obj[attr])) ? obj[attr].slice() : obj[attr];
      });
    }
    return copy;
  }

  const wrapInSingleQuote = s => `'${s}'`;

  async function updateLink() {
    let link = linkTemplate,
        copyModel = copyHash(model);
    Object.keys(copyModel).forEach(function(key) {
      let pattern = '${' + key + '}', value = '';
      if (copyModel[key] !== null) {
        value = (typeof copyModel[key] != 'string') ? copyModel[key].join('+') : copyModel[key];
        if ((key !== 'state' && key !== 'nonce') && (value !== null) && (typeof value !== 'undefined')) {
          window.localStorage.setItem(html5AppId + '.model.' + key, value);
        }
      }
      link = link.replace(pattern,value);
    });

    link = link.replace('${pkce_challenge}', await sha256base64(copyModel.verifier));

    let m = extraneousDoubleSlashFinder.exec(link);
    if (m) { link = m[1] + '/' + m[2]; }
    $('#authzlink').text(link);
    $('#authzlink').attr('href', link);

    if (model.code) {
      let payload = {
            grant_type: 'authorization_code',
            client_secret : model.clientsecret,
            client_id : model.clientid,
            redirect_uri : model.cburi,
            code : model.code
          };
      $('#preBox').html('<pre>curl -X POST -H content-type:application/x-www-form-urlencoded ' +
                            wrapInSingleQuote(oktaTokenUrl) + ' -d ' + wrapInSingleQuote($.param(payload)) + '</pre>');
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
    $$.find('option:selected' ).each(function() {
      values.push($( this ).text());
    });
    model[name] = values;
    updateLink();
  }

  function updateModel(event) {
    Object.keys(model).forEach(function(key) {
      var $item = $('#' + key), value = $item.val();
      model[key] = value;
    });
    updateLink();
    if (event)
      event.preventDefault();
  }

  //const excludeTransientFields = key => key != 'code' && key != 'verifier';

  function populateFormFields() {
    // get values from local storage, and place into the form
    Object.keys(model)
      //.filter(excludeTransientFields)
      .forEach(function(key) {
        var value = window.localStorage.getItem(html5AppId + '.model.' + key);
        var $item = $('#' + key);
        if (key === 'state' || key === 'verifier') {
          let desiredLength = Number($item.data('desired-length')) || 8;
          $item.val(randomValue(desiredLength));
        }
        else if (key === 'code') {
          // no-op
        }
        else if (value && value !== '') {
          if (typeof model[key] !== 'string') {
            // the value is a set of values concatenated by +
            // and the type of form field is select.
            value.split('+').forEach(function(part){
              $item.find("option[value='" + part + "']").prop('selected', 'selected');
            });
            $item.trigger('chosen:updated');
          }
          else {
            // value is a simple string, form field type is input.
            $item.val(value);
          }
        }
      });
  }

  function resetRedemption(event) {
    $('#preBox').html('');
    $('#code').val('');
    updateModel();
    if (event)
      event.preventDefault();
  }

  function invokeRedemption(event) {
    var payload = {
          client_id : model.clientid,
          client_secret : model.clientsecret,
          redirect_uri : model.cburi,
          grant_type: 'authorization_code',
          code: model.code
        };

    // NB: This call will fail if the server does not include CORS headers in the response
    $.ajax({
      url : oktaTokenUrl,
      type: 'POST',
      data : payload,
      success: function(data, textStatus, jqXHR) {
        $('#preBox')
          .removeClass('error')
          .html('<pre class="access-token-response">' +
                JSON.stringify(data, null, 2) +
                '</pre>');
      },
      error: function (jqXHR, textStatus, errorThrown) {
        $('#preBox')
          .addClass('error')
          .html('<pre class="access-token-response">' +
                JSON.stringify(jqXHR.responseJSON, null, 2) +
                '</pre>');

      }
    });

    if (event)
      event.preventDefault();
  }


  $(document).ready(function() {
    $('.rtype-chosen').chosen({
      no_results_text: 'No matching response types...',
      allow_single_deselect: true
    });
    $('.scope-chosen').chosen({
      no_results_text: 'No matching scopes...',
      allow_single_deselect: true
    });

    $( '#btn-redeem' ).on('click', invokeRedemption);
    $( '#btn-reset' ).on('click', resetRedemption);
    $( '#btn-copy' ).on('click', copyToClipboard);
    $( '.btn-reload' ).on('click', reloadRandomValue);

    populateFormFields();

    $( "form input[type='text']" ).change(onInputChanged);
    $( 'form select' ).change(onSelectChanged);
    $( 'form button' ).submit(updateModel);

    updateModel();

  });


}());
