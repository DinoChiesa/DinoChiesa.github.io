// page.js
// ------------------------------------------------------------------
//
// created: Mon Jun  1 13:00:26 2020
// last saved: <2021-February-22 09:51:52>

/* jshint esversion:9, node:false, strict:implied */
/* global jQuery, document, window, console, Buffer, grecaptcha  */

(function (){
  const reCAPTCHA_site_key = '6LeEA3gUAAAAAPRenCnqy8K4IuLepRPAPLNIKOY_';
  const postbackEndpoint = 'https://gaccelerate3-test.apigee.net/recaptcha-v3/check',
        $ = jQuery;

  function clearOutput(event) {
    $('#output').addClass('notshown').empty();
    $('#clear').parent().addClass('notshown');
  }

  function applyRecaptchaAndSubmit(event) {
    // prevent form submit
    if (event) { event.preventDefault(); }

    try {

      // The browser will show an opaque promise error in this method if this
      // page is hosted on a domain which does not match the domain set for
      // the given site_key. The little recaptcha badge will show a warning
      // message.

      grecaptcha.execute(reCAPTCHA_site_key, {action: 'homepage'})
        .then(function(recaptchaToken) {

          // post back to an API endpoint. The thing on the other end must call to
          // google using the site key secret, to ask for the 'score' for this token.
          var jqxhr = $.ajax({
                url: postbackEndpoint,
                method: "POST",
                data: JSON.stringify({ recaptcha_token: recaptchaToken }),
                contentType: 'application/json',
                dataType : 'json' // response
              })
            .done(function(responseData) {
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
            .fail(function(response, error, exc) {
              window.alert( "error: " + exc);
            });
        });
    }
    catch (e) {
      window.alert( "exception: " + e);
    }
    return false;
  }

  grecaptcha.ready(function() {
    $(document).ready(function() {
      $('#check').on('click', applyRecaptchaAndSubmit);
      $('#clear').on('click', clearOutput);
    });

  });
}());
