// page.js
// ------------------------------------------------------------------
//
// created: Mon Jun  1 13:00:26 2020
// last saved: <2020-June-02 09:42:30>

/* jshint esversion:9, node:false, strict:implied */
/* global jQuery, document, window, console, Buffer, grecaptcha */


(function (){
  const reCAPTCHA_site_key = '6LeEA3gUAAAAAPRenCnqy8K4IuLepRPAPLNIKOY_',
        postbackEndpoint = 'https://gaccelerate3-test.apigee.net/recaptcha-v3/compute',
        $ = jQuery;

  // function eraseResults() {
  //   $('#output').addClass('notshown').removeClass('shown');
  // }
  //
  // function publishResults(arg1, arg2) {
  //   $('#output').addClass('shown').removeClass('notshown');
  // }

  function copyToClipboard(event) {
    let $elt = $(this),
        sourceElement = $elt.data('target'),
        // grab the element to copy
        $source = $('#' + sourceElement),
        // Create a temporary hidden textarea.
        $temp = $("<textarea>");

    //let textToCopy = $source.val();
    // in which case do I need text() ?
    let textToCopy = ($source[0].tagName == 'TEXTAREA' || $source[0].tagName == 'INPUT') ? $source.val() : $source.text();

    $("body").append($temp);
    $temp.val(textToCopy).select();
    let success;
    try {
      success = document.execCommand("copy");
      if (success) {
        // Animation to indicate copy.
        // CodeMirror obscures the original textarea, and appends a div as the next sibling.
        // We want to flash THAT.
        let $cmdiv = $source.next();
        if ($cmdiv.length>0 && $cmdiv.prop('tagName').toLowerCase() == 'div' && $cmdiv.hasClass('CodeMirror')) {
          $cmdiv.addClass('copy-to-clipboard-flash-bg')
            .delay('1000')
            .queue( _ => $cmdiv.removeClass('copy-to-clipboard-flash-bg').dequeue() );
        }
        else {
          // no codemirror (probably the secretkey field, which is just an input)
          $source.addClass('copy-to-clipboard-flash-bg')
            .delay('1000')
            .queue( _ => $source.removeClass('copy-to-clipboard-flash-bg').dequeue() );
        }
      }
    }
    catch (e) {
      success = false;
    }
    $temp.remove();
    return success;
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
              $ta.attr('style', 'border:none;height:100%;');
              $ta.text("success:\n" + JSON.stringify(responseData));
              $('#output').empty().append($ta);
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
      $('#go').on('click', applyRecaptchaAndSubmit);
      $('.copyIconHolder').on('click', copyToClipboard);
    });

  });
}());
