// simplecheck-enterprise.js
// ------------------------------------------------------------------
//
// created: Mon Jun  1 13:00:26 2020
// last saved: <2021-February-24 18:42:43>

/* jshint esversion:9, node:false, strict:implied, browser:true */
/* global jQuery, document, window, console, Buffer, grecaptcha  */

(function (){
  const appId = '64B04680-2834-4651-BFCB-B6E105CB0774';
  const $ = jQuery;
  var reCAPTCHA_site_key = null;

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
        'txt-sitekey': '',
        'txt-baseurl': ''
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
    //if (event) event.preventDefault();
  }

  function injectRecaptchaScript() {
    let head = document.getElementsByTagName('head')[0],
        script = document.createElement('script');
    script.type = 'text/javascript';
    script.onload =
      () => eval('grecaptcha.enterprise.ready(() => setTimeout(submitRequest, 50));');
    script.src = `https://www.google.com/recaptcha/enterprise.js?render=${reCAPTCHA_site_key}`;
    head.appendChild(script);
  }

  function applyRecaptchaAndSubmit(event) {
    if (event) { event.preventDefault(); }
    try {
      if (reCAPTCHA_site_key) {
        return submitRequest();
      }
      reCAPTCHA_site_key = $('#txt-sitekey').val();
      if (reCAPTCHA_site_key) {
        setTimeout(injectRecaptchaScript, 2);
      }
      else {
        window.alert( "specify a site key");
      }
    }
    catch (e) {
      window.alert( "exception: " + e);
    }
    return false;
  }


  function submitRequest() {
    try {
      // The browser will show an opaque promise error in this method if this
      // page is hosted on a domain which does not match the domain set for
      // the given site_key. The little recaptcha badge will show a warning
      // message.

      grecaptcha.enterprise.execute(reCAPTCHA_site_key, {action: 'homepage'})
        .then(recaptchaToken => {

          let baseurl = $('#txt-baseurl').val(),
              postbackEndpoint = `${baseurl}/recaptcha-enterprise/assess`;

          // post back to an API endpoint. The thing on the other end must call to
          // google using the site key secret, to ask for the 'score' for this token.
          var jqxhr = $.ajax({
                url: postbackEndpoint,
                method: "POST",
                data: JSON.stringify({ recaptcha_token: recaptchaToken }),
                contentType: 'application/json',
                dataType : 'json' // response
              })
            .done(responseData => {
              // The Apigee endpoint just returns what recaptcha said.
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

  $(document).ready(() => {
    resetState();
    $('#txt-baseurl').on('change keyup paste', storeSetting);
    $('#txt-sitekey').on('change keyup paste', storeSetting);
    $('#check').on('click', applyRecaptchaAndSubmit);
    $('#clear').on('click', clearOutput);
  });

}());
