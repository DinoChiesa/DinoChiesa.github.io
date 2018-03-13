// goog-login-page.js
// ------------------------------------------------------------------
//
// page logic for goog-login.html and oidc-login.html
//
// created: Thu Oct  1 13:37:31 2015
// last saved: <2018-March-13 09:27:49>

(function (){
  'use strict';
  var model = {
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
  var extraneousDoubleSlashFinder = new RegExp('^(https?://[^/]+)//(.+)$');
  var googleTokenUrl = 'https://www.googleapis.com/oauth2/v4/token';
  var html5AppId = html5AppId || "B673CC48-1927-46CB-827A-E6E9D7D5103D";
  var linkTemplate = linkTemplate || "${baseloginurl}?client_id=${clientid}&redirect_uri=${cburi}&response_type=${rtype}&state=${state}&scope=${scope}&nonce=${nonce}";

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
      var m = Math.floor(Math.random() * 26),
          a = (Math.floor(Math.random() * 2) * 32);
      return String.fromCharCode(65 + m + a);
    }

    var i, s = '';

    L = L || (Math.floor(Math.random() * 7) + 8);

    for (i=0; i<L; i++) {
      s += c();
    }
    return s;
  }

  function updateLink() {
    var link = linkTemplate;
    var copyModel = copyHash(model);
    if (copyModel.aud && copyModel.scope) {
      copyModel.scope.push('audience:server:client_id:' + copyModel.aud);
      delete copyModel.aud;
    }
    Object.keys(copyModel).forEach(function(key) {
      var pattern = "${" + key + "}", value = '';
      if (copyModel[key] !== null) {
        value = (typeof copyModel[key] != 'string') ? copyModel[key].join('+') : copyModel[key];
        if (value !== null) {
          console.log('setting into LS: ' + key + '= ' + value);
          window.localStorage.setItem(html5AppId + '.model.' + key, value);
        }
      }
      link = link.replace(pattern,value);
    });
    var m = extraneousDoubleSlashFinder.exec(link);
    if (m) { link = m[1] + '/' + m[2]; }
    $('#authzlink').text(link);
    $('#authzlink').attr('href', link);

    if (model.code) {
      var payload = {
            grant_type: 'authorization_code',
            client_secret : model.clientsecret,
            client_id : model.clientid,
            redirect_uri : model.cburi,
            code : model.code
          };
      $('#redeemCode').text('curl -X POST -H content-type:application/x-www-form-urlencoded ' +
                            wrapInSingleQuote(googleTokenUrl) + ' -d ' + wrapInSingleQuote($.param(payload)));
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
        if (value && value !== '') {
          if (typeof model[key] !== 'string') {
            // the value is a set of values concatenated by +
            // and the type of form field is select.
            value.split('+').forEach(function(part){
              var $f = $item.find("option[value='"+part+"']");
              $f.prop("selected", "selected");
            });
          }
          else {
            // value is a simple string, form field type is input.
            $item.val(value);
          }
        }
        else if (key === 'state' || key === 'nonce') {
          $item.val(generateRandomAlphaString(6));
        }
      });
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

    $( "#invokeRedemption" ).click(invokeRedemption);
    $( "#resetRedemption" ).click(resetRedemption);

    populateFormFields();

    $( "form input[type='text']" ).change(onInputChanged);
    $( "form select" ).change(onSelectChanged);
    $( "form button" ).submit(updateModel);

    if (typeof Clipboard != 'undefined') {
      // attach clipboard things
      new Clipboard('.clipboard-btn');
    }

    updateModel();

  });


}());
