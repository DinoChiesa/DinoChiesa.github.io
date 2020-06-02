// page.js
// ------------------------------------------------------------------
//
// created: Mon Jun  1 13:00:26 2020
// last saved: <2020-June-02 10:29:40>

/* jshint esversion:9, node:false, strict:implied */
/* global jQuery, document, window, console, Buffer, grecaptcha */


(function (){
  const reCAPTCHA_site_key = '6LeEA3gUAAAAAPRenCnqy8K4IuLepRPAPLNIKOY_',
        postbackEndpoint = 'https://gaccelerate3-test.apigee.net/recaptcha-v3/compute',
        $ = jQuery;

  function clearOutput(event) {
    $('#output').addClass('notshown').empty();
    $('#clear').parent().addClass('notshown');
  }

  function applyRecaptchaAndSubmit(event) {
    // prevent form submit
    if (event) { event.preventDefault(); }
    // get new token for this click
    try {

      // The browser will show an opaque promise error in this method if this
      // page is hosted on a domain which does not match the domain set for
      // the given site_key.

      grecaptcha.execute(reCAPTCHA_site_key, {action: 'homepage'})
        .then(function(recaptchaToken) {

          //alert("recaptcha token:\n "+ recaptchaToken);

          // post back to an endpoint. The thing on the other end will call to
          // google to ask for the 'score' for this token.
          var jqxhr = $.ajax({
                url: postbackEndpoint,
                method: "POST",
                data: JSON.stringify({ recaptcha_token: recaptchaToken }),
                contentType: 'application/json',
                dataType : 'json' // response
              })
            .done(function(responseData) {
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
          //.always(function() {
          //  alert( "complete" );
          //});

          //$('#form1').submit();
        });
      // .catch( e => {
      //   alert( "exception: " + e);
      // });
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
