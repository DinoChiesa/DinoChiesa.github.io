// okta-login-page.js
// ------------------------------------------------------------------
//
// This demonstrates a signin with a PKCE challenge and verifier.
//
/* jshint esversion: 9, browser:true, strict:implied */
/* global $, TextEncoder */


(function (){

  const extraneousDoubleSlashFinder = new RegExp('^(https?://[^/]+)//(.+)$');

  const html5AppId = "32649BAF-6FA5-4725-B992-5E48CDD37AE2",
        endpointTemplate = 'https://${oktadomain}/oauth2/${authzserver}',
        linkParams = [
          "max_age=${maxage}",
          "client_id=${clientid}",
          "response_type=${rtype}",
          "scope=${scope}",
          "state=${state}",
          "redirect_uri=${cburi}",
          "code_challenge_method=S256",
          "code_challenge=${pkce_challenge}"
        ];

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

  const applyTemplate = (template, model, wantStore) => {
          let t = template;
          Object.keys(model).forEach(key => {
            let pattern = '${' + key + '}', value = '';
            if (model[key] !== null) {
              value = (typeof model[key] != 'string') ? model[key].join('+') : model[key];
              if (wantStore) {
                if ((key !== 'state' && key !== 'nonce') && (value !== null) && (typeof value !== 'undefined')) {
                  window.localStorage.setItem(html5AppId + '.model.' + key, value);
                }
              }
            }
            t = t.replace(pattern,value);
          });
          return t;
        };

  const oktaAuthz = () => applyTemplate(endpointTemplate, model);

  const randomValue = (len) => {
          let v = '';
          do {
            v += Math.random().toString(36).substring(2, 8);
          } while (v.length<len);
          return v.substring(0, len);
        };

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
    let success;
    try {
      success = document.execCommand('copy');
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

  function copyHash(obj) {
    var copy = {};
    if (null !== obj && typeof obj == 'object') {
      Object.keys(obj)
        .forEach(attr =>
                 copy[attr] = (Array.isArray(obj[attr])) ? obj[attr].slice() : obj[attr] );

    }
    return copy;
  }

  const wrapInSingleQuote = s => `'${s}'`;

  async function updateLink() {
    let baselink = oktaAuthz() + '/v1/authorize',
        copyModel = copyHash(model),  // not sure why i need to copy this?
        params = linkParams.join('&'),
        link = baselink + '?' + applyTemplate(params, copyModel, true);

    link = link.replace('${pkce_challenge}', await sha256base64(copyModel.verifier));

    let m = extraneousDoubleSlashFinder.exec(link);
    if (m) { link = m[1] + '/' + m[2]; }
    $('#authzlink').text(link);
    $('#authzlink').attr('href', link);

    if (model.code) {
      let payload = {
            grant_type: 'authorization_code',
            client_id : model.clientid,
            client_secret : model.clientsecret,
            code_verifier : model.verifier,
            redirect_uri : model.cburi,
            code : model.code
          };
      $('#preBox').html('<pre>curl -X POST -H content-type:application/x-www-form-urlencoded ' +
                        wrapInSingleQuote(oktaAuthz() + '/v1/token') + ' -d ' + wrapInSingleQuote($.param(payload)) + '</pre>');
      $('#authzRedemption').show();
    }
    else {
      $('#authzRedemption').hide();
    }
  }

  function onInputChanged() {
    var $this = $(this);
    model[$this.attr('id')] = $this.val();
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
    Object.keys(model).forEach(key => model[key] = $('#' + key).val());
    updateLink();
    if (event)
      event.preventDefault();
  }

  //const excludeTransientFields = key => key != 'code' && key != 'verifier';

  function populateFormFields() {
    // get values from local storage, and place into the form
    Object.keys(model)
      //.filter(excludeTransientFields)
      .forEach( key => {
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
            value.split('+').forEach(part => {
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
    let payload = {
          grant_type: 'authorization_code',
          client_id : model.clientid,
          client_secret : model.clientsecret,
          code_verifier : model.verifier,
          redirect_uri : model.cburi,
          code: model.code
        };

    // NB: This call will fail if the server does not include CORS headers in the response
    $.ajax({
      url : oktaAuthz() + '/v1/token',
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
