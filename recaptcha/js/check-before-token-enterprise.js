// check-before-token-enterprise.js
// ------------------------------------------------------------------

/* jshint esversion:9, node:false, strict:implied */
/* global jQuery, document, window, console, Buffer, grecaptcha, btoa */

(function (){
  const appId = 'FAE20A3D-ADD0-4F96-8BE9-394C317F5E77';
  const reCAPTCHA_site_key = '6LdxvGIaAAAAAKGfmqySabPwwKzTLxoxtTaIwFhi';
  const postbackEndpoint = 'https://5g-dev.dinochiesa.net/oauth2-cc-recaptcha/token',
        $ = jQuery;

  const LocalStorage = (function () {
          function AppScopedStoreManager(appid) {
            this.appid = appid;
          }

          AppScopedStoreManager.prototype.get = function(key) {
            return window.localStorage.getItem(this.appid + '.datamodel.' + key);
          };

          AppScopedStoreManager.prototype.remove = function(key) {
            return window.localStorage.removeItem(this.appid + '.datamodel.' + key);
          };

          AppScopedStoreManager.prototype.store = function(key, value) {
            return window.localStorage.setItem(this.appid + '.datamodel.' + key, value);
          };

          const init = function(id) {
                  return new AppScopedStoreManager(id);
                };
          return {init};
        }());

  const storage = LocalStorage.init(appId);
  let datamodel = {
        'txt-clientid': '',
        'txt-clientsecret': ''
      };
  function clearOutput(event) {
    $('#output').addClass('notshown').empty();
    $('#clear').parent().addClass('notshown');
  }

  function retrieveLocalState() {
    Object.keys(datamodel)
      .forEach(key => {
        var value = storage.get(key);
        if (key.startsWith('chk-')) {
          datamodel[key] = Boolean(value);
        }
        else {
          datamodel[key] = value;
        }
      });
  }

  function applyState() {
    Object.keys(datamodel)
      .forEach(key => {
        var value = datamodel[key];
        if (value) {
          var $item = $('#' + key);
          if (key.startsWith('txt-')) {
            $item.val(value);
          }
        }
      });
  }

  function resetState() {
    retrieveLocalState();
    applyState();
  }

  function saveSetting(key, value) {
    datamodel[key] = value;
    storage.store(key, value);
  }

  function storeSetting(event) {
    let $this = $(this),
    value = $this.val(),
    key = $this.attr('id');
    saveSetting(key, value);
    event.preventDefault();
  }

  function applyRecaptchaAndSubmit(event) {
    if (event) { event.preventDefault(); }
    try {
      grecaptcha.enterprise.execute(reCAPTCHA_site_key, {action: 'token'})
        .then(recaptchaToken => {
          let clientId = $('#clientid').val(),
              clientSecret = $('#clientsecret').val();
          // post back to an API endpoint. The other end must call to google
          // using the site key secret, to ask for the 'score' for this token.
          let jqxhr = $.ajax({
                url: postbackEndpoint,
                method: "POST",
                headers: {
                  "Authorization": "Basic " + btoa(clientId + ":" + clientSecret),
                  "recaptcha-token": recaptchaToken
                },
                data: 'grant_type=client_credentials',
                contentType: 'application/x-www-form-urlencoded',
                dataType : 'json'
              })
            .done(responseData => {
              // The Apigee endpoint returns a token payload.
              // Display it on the page.
              let $ta = $('<textarea>');
              $ta.attr('class', 'results code');
              $ta.attr('spellcheck','false');
              $ta.attr('disabled','true');
              $ta.text(JSON.stringify(responseData, null, 2));
              $('#output').empty().removeClass('notshown').append($ta);
              $('#clear').parent().removeClass('notshown');
            })
            .fail((response, error, exc) => {
              window.alert( "error: " + exc);
            });
        });
    }
    catch (e) {
      window.alert( "exception: " + e);
    }
    return false;
  }

  grecaptcha.enterprise.ready(() =>
                   $(document).ready(() => {
                     resetState();
                     $('#clientid').on('change keyup paste', storeSetting);
                     $('#clientsecret').on('change keyup paste', storeSetting);
                     $('#check').on('click', applyRecaptchaAndSubmit);
                     $('#clear').on('click', clearOutput);
                   })
                  );
}());
