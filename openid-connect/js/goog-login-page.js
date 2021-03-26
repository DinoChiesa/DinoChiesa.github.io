// goog-login-page.js
// ------------------------------------------------------------------
//
/* jshint esversion: 9 */
/* global $ */

(function (){

  const googleTokenUrl = 'https://www.googleapis.com/oauth2/v4/token',
        extraneousDoubleSlashFinder = new RegExp('^(https?://[^/]+)//(.+)$');

  var html5AppId = html5AppId || "B673CC48-1927-46CB-827A-E6E9D7D5103D",
      linkTemplate = linkTemplate || "${baseloginurl}?client_id=${clientid}&redirect_uri=${cburi}&response_type=${rtype}&state=${state}&scope=${scope}&nonce=${nonce}";
  let model = {
        baseloginurl : '',
        clientid : '',
        clientsecret : '',
        cburi : '',
        state : '',
        nonce : '',
        code : '',
        rtype : [],
        scope : [],
        aud : ''
      };

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
      Object.keys(obj).forEach(function(attr){
        copy[attr] = (Array.isArray(obj[attr])) ? obj[attr].slice() : obj[attr];
      });
    }
    return copy;
  }

  const wrapInSingleQuote = s => `'${s}'`;

  function updateLink() {
    let link = linkTemplate,
        copyModel = copyHash(model);
    if (copyModel.aud && copyModel.scope) {
      copyModel.scope.push('audience:server:client_id:' + copyModel.aud);
      delete copyModel.aud;
    }
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
                            wrapInSingleQuote(googleTokenUrl) + ' -d ' + wrapInSingleQuote($.param(payload)) + '</pre>');
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
    Object.keys(model).forEach(key => model[key] = $('#' + key).val());
    updateLink();
    if (event)
      event.preventDefault();
  }

  const excludeTransientFields = key => key != 'code';

  function populateFormFields() {
    // get values from local storage, and place into the form
    Object.keys(model)
      .filter(excludeTransientFields)
      .forEach(key => {
        let value = window.localStorage.getItem(html5AppId + '.model.' + key),
            $item = $('#' + key);
        if (key === 'state' || key === 'nonce') {
          let desiredLength = Number($item.data('desired-length')) || 6;
          $item.val(desiredLength);
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
          client_id : model.clientid,
          client_secret : model.clientsecret,
          redirect_uri : model.cburi,
          grant_type: 'authorization_code',
          code: model.code
        };

    // NB: This call will fail if the server does not include CORS headers in the response
    $.ajax({
      url : googleTokenUrl,
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


  $(document).ready(() => {
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
