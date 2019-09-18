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
  document.execCommand("copy");
  $temp.remove();
}


  function copyHash(obj) {
    var copy = {};
    if (null !== obj && typeof obj == "object") {
      Object.keys(obj).forEach(function(attr){
        copy[attr] = (Array.isArray(obj[attr])) ? obj[attr].slice() : obj[attr];
      });
    }
    return copy;
  }

  function wrapInSingleQuote(s) {return "'" + s + "'";}

  function generateRandomAlphaString(L) {
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

  function updateLink() {
    let link = linkTemplate,
        copyModel = copyHash(model);
    if (copyModel.aud && copyModel.scope) {
      copyModel.scope.push('audience:server:client_id:' + copyModel.aud);
      delete copyModel.aud;
    }
    Object.keys(copyModel).forEach(function(key) {
      let pattern = "${" + key + "}", value = '';
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
    $$.find("option:selected" ).each(function() {
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


  function excludeTransientFields(key) {
    return key != 'code'; // the only transient field, currently
  }

  function populateFormFields() {
    // get values from local storage, and place into the form
    Object.keys(model)
      .filter(excludeTransientFields)
      .forEach(function(key) {
        var value = window.localStorage.getItem(html5AppId + '.model.' + key);
        var $item = $('#' + key);
        if (key === 'state' || key === 'nonce') {
          $item.val(generateRandomAlphaString(6));
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
      url : googleTokenUrl,
      type: "POST",
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
      no_results_text: "No matching response types...",
      allow_single_deselect: true
    });
    $('.scope-chosen').chosen({
      no_results_text: "No matching scopes...",
      allow_single_deselect: true
    });

    $( "#btn-redeem" ).on('click', invokeRedemption);
    $( "#btn-reset" ).on('click', resetRedemption);
    $( '#btn-copy' ).on('click', copyToClipboard);

    populateFormFields();

    $( "form input[type='text']" ).change(onInputChanged);
    $( "form select" ).change(onSelectChanged);
    $( "form button" ).submit(updateModel);


    updateModel();

  });


}());
