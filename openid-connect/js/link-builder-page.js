// link-builder-page.js
// ------------------------------------------------------------------
//
// page logic for link-builder{1,2,3}.html
//
// created: Thu Oct  1 13:37:31 2015
// last saved: <2021-March-11 16:38:35>

/* jshint esversion:9, strict:implied */
/* global $, window, document, model, btoa */

(function (){
  let model = window.model || {
        apihost : '',
        edgeorg : '',
        edgeenv : '',
        clientid : '',
        cburi : '',
        state : '',
        nonce : '',
        rtype : [],
        scope : []
      };

  // for localstorage
  const html5AppId = window.html5AppId || "43C9BB71-3E94-441C-B7F5-7FAE6FCD8458";
  const linkTemplate = window.linkTemplate || "http://${edgeorg}-${edgeenv}.apigee.net/oauth2/v1/authorize?client_id=${clientid}&redirect_uri=${cburi}&response_type=${rtype}&state=${state}&scope=${scope}";

  function randomValue(len) {
    return Math.random().toString(36).substring(2, len? (len + 2): 8);
  }

  function reloadRandomValue(event) {
    const $elt = $(this),
        sourceElement = $elt.data('target'),
        // grab the element to copy
        $source = $('#' + sourceElement),
        newValue = randomValue();
    $source.val(newValue);
    model[sourceElement] = newValue;
    updateLink();
  }

  function wrapInSingleQuote(s) {return "'" + s + "'";}

  function copyToClipboard(event) {
    let $elt = $(this),
        sourceElement = $elt.data('target'),
        // grab the element to copy
        $source = $('#' + sourceElement),
        // Create a temporary hidden textarea.
        $temp = $("<textarea>");

    let textToCopy = ($source[0].tagName == 'TEXTAREA') ? $source.val() : $source.text();

    $('body').append($temp);
    $temp.val(textToCopy).select();
    document.execCommand('copy');
    $temp.remove();
  }

  function evalTemplate(template, model) {
    let s = template;
    Object.keys(model)
      .filter(excludeTransientFields)
      .forEach(function(key) {
        let pattern = '${' + key + '}', value = model[key];
        if ((model[key]) && (value !== null) && (typeof value !== 'undefined')) {
          if (typeof model[key] !== 'string') {
            // coerce arrays to a + separated string
            value = value.join('+');
          }
          window.localStorage.setItem(html5AppId + '.model.' + key, value);
        }
        s = s.replace(pattern,value);
      });
    return s;
  }

  function updateLink() {
    let link = evalTemplate(linkTemplate, model),
        extraneousDoubleSlashFinder = new RegExp('^(https?://[^/]+)//(.+)$'),
        m = extraneousDoubleSlashFinder.exec(link);
    if (m) { link = m[1] + '/' + m[2]; }
    $('#authzlink').text(link);
    $('#authzlink').attr('href', link);

    if (model.code) {
      let re1 = new RegExp('/authorize.+'),
          newUrl = link.replace(re1, '/token'),
          payload = 'grant_type=authorization_code&code=' + model.code + '&redirect_uri=' + model.cburi;
      $('#preBox').text('curl -X POST -H content-type:application/x-www-form-urlencoded -u ' +
                            model.clientid + ':' + model.clientsecret + ' ' +
                            wrapInSingleQuote(newUrl) + ' -d ' + wrapInSingleQuote(payload));
      $('#authzRedemption').show();
    }
    else {
      $('#authzRedemption').hide();
    }
  }

  function onInputChanged() {
    let $$ = $(this),
        id = $$.attr('id'),
    value = $$.val();

    model[id] = value;
    updateLink();
  }

  function onSelectChanged() {
    let $$ = $(this), name = $$.attr('name'),
        value = getFormSelectItemValue($$);
    model[name] = value;
    updateLink();
  }

  function getFormSelectItemValue($item) {
    let value = [];
      $item.find('option:selected' ).each(function() {
        value.push($( this ).text());
      });
    return value;
  }

  function getFormItemValue($item) {
    let eltType = $item.prop('nodeName');
    switch(eltType) {
    case 'INPUT' : return $item.val();
    case 'SELECT' : return getFormSelectItemValue($item);
    }
    return null;
  }

  function updateModel(event) {
    Object.keys(model).forEach(function(key) {
      let $item = $('#' + key), value = getFormItemValue($item);
      model[key] = value;
    });
    updateLink();
    if (event)
      event.preventDefault();
  }

  function resetRedemption(event) {
    //$('#redeemResult').html('');
    $('#preBox').text('');
    $('#code').val('');
    updateModel();
    if (event)
      event.preventDefault();
  }

  function invokeRedemption(event) {
    let linkUrl = $('#authzlink').text(),
        re1 = new RegExp('/authorize.+'),
        newUrl = linkUrl.replace(re1, '/token'),
        payload = {
          grant_type: 'authorization_code',
          code: model.code,
          redirect_uri : model.cburi
        };

    // NB: This call will fail if the server does not include CORS headers in the response
    $.ajax({
      url : newUrl,
      type: 'POST',
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
                JSON.stringify(jqXHR.responseJSON || 'error', null, 2) +
                '</pre>');
      }
    });

    if (event)
      event.preventDefault();
  }

  function excludeTransientFields(key) {
    return key != 'code'; // the only transient field, currently
  }

  function populateFormFields() {
    // get values from local storage, and place into the form
    Object.keys(model)
      .filter(excludeTransientFields)
      .forEach(key => {
        let value = window.localStorage.getItem(html5AppId + '.model.' + key),
            $item = $('#' + key);
        if (key === 'state' || key === 'nonce') {
          $item.val(randomValue(6));
        }
        else if (value && value !== '') {
          if (typeof model[key] !== 'string') {
            // the value is a set of values concatenated by +
            // and the type of form field is select.
            value.split('+').forEach(function(part){
              $item.find("option[value='"+part+"']").prop('selected', 'selected');
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


  $(document).ready(() => {
    $('.rtype-chosen').chosen({
      no_results_text: 'No matching response types...',
      allow_single_deselect: true
    });
    $('.scope-chosen').chosen({
      no_results_text: 'No matching scopes...',
      allow_single_deselect: true
    });

    $( `form input[type='text']` ).change(onInputChanged);
    $( 'form select' ).change(onSelectChanged);
    $( 'form button' ).submit(updateModel);
    $( '.btn-reload' ).on( 'click', reloadRandomValue);
    $( '#btn-copy' ).on( 'click', copyToClipboard);
    $( '#btn-redeem' ).on( 'click', invokeRedemption);
    $( '#btn-reset' ).on( 'click', resetRedemption);

    populateFormFields();

    updateModel();

  });


}());
