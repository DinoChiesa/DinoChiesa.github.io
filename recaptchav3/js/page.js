// page.js
// ------------------------------------------------------------------
//
// created: Mon Jun  1 13:00:26 2020
// last saved: <2020-June-01 13:51:36>

/* jshint esversion:9, node:true, strict:implied */
/* global $, console, Buffer */

     var reCAPTCHA_site_key = '6LeEA3gUAAAAAPRenCnqy8K4IuLepRPAPLNIKOY_';
     var postbackEndpoint = 'https://gaccelerate3-test.apigee.net/recaptcha-v3/compute';

     function getHashName() {
       var hashName = $('#function option:selected').val();
       return hashName;
     }

     function getAlgo() {
       switch (getHashName()) {
         case 'md-5':
           return CryptoJS.algo.MD5;
           break;
         case 'sha-1':
           return CryptoJS.algo.SHA1;
           break;
         case 'sha-224':
           return CryptoJS.algo.SHA224;
           break;
         case 'sha-256':
           return CryptoJS.algo.SHA256;
           break;
         case 'sha-384':
           return CryptoJS.algo.SHA384;
           break;
         case 'sha-512':
           return CryptoJS.algo.SHA512;
           break;
       }
       throw { error: 'unsupported hash name.'};
     }

     function getHash(message) {
       switch (getHashName()) {
         case 'md-5':
           return CryptoJS.MD5(message);
           break;
         case 'sha-1':
           return CryptoJS.SHA1(message);
           break;
         case 'sha-224':
           return CryptoJS.SHA224(message);
           break;
         case 'sha-256':
           return CryptoJS.SHA256(message);
           break;
         case 'sha-384':
           return CryptoJS.SHA384(message);
           break;
         case 'sha-512':
           return CryptoJS.SHA512(message);
           break;
       }
       throw { error: 'unsupported hash name.'};
     }

     function eraseResults() {
       $('#resultB16').text('');
       $('#resultB64').text('');
       $('#output').addClass('notshown').removeClass('shown');
     }

     function publishResults(arg1, arg2) {
       if (arg2) {
         $('#resultB16').text(arg2);
         $('#resultB64').text('error');
       }
       else if (arg1) {
         var hashInBase16 = CryptoJS.enc.Hex.stringify(arg1);
         $('#resultB16').text(hashInBase16);
         var hashInBase64 = CryptoJS.enc.Base64.stringify(arg1);
         $('#resultB64').text(hashInBase64);
       }
       $('#output').addClass('shown').removeClass('notshown');
     }

     function calcHmac() {
       var message = $('#text').val();
       var key = $('#key').val();
       if (message!=null && key) {
         var re1 = new RegExp('(\r\n|\n)', 'g');
         message = message.replace(re1,'\n');
         var hmac = CryptoJS.algo.HMAC.create(getAlgo(), key);
         hmac.update(message);
         var hash = hmac.finalize();
         publishResults(hash);
       }
       else {
         publishResults(null, 'You must specify a message and a key');
       }
     }

     function calcSha() {
       var message = $('#text').val();
       if (message!=null) {
         var re1 = new RegExp('(\r\n|\n)', 'g');
         message = message.replace(re1,'\n');
         var hash = getHash(message);
         publishResults(hash);
       }
     }

     function calcResult(event) {
       if (event) { event.preventDefault(); }
       var message = $('#text').val();
       //var re1 = new RegExp('(\r\n|\n)', 'g');
       //alert('message:\n' + message.replace(re1,'\\n\n'));
       if (message) {
         if ($('#hmac').is(':checked')) {
           calcHmac();
         }
         else {
           calcSha();
         }
       }
     }

     function changeText(event) {
       if (getHashName()) {
         calcResult(event);
       }
     }
     function changeKey(event) {
       if (getHashName()) {
         calcResult(event);
       }
     }

     function changeFunction(event) {
       if (event) { event.preventDefault(); }
       // enable the compute button
       // $( "#submit" ).removeClass('disabled').prop("disabled", false);
       //eraseResults();
       calcResult(event);
     }

     function changeHmac(event) {
       if (event) { event.preventDefault(); }
       // display or hide the key as appropriate
       if ($('#hmac').is(':checked')) {
         $('#key').addClass('shown') .removeClass('notshown');
         $('#keylabel').addClass('shown') .removeClass('notshown');
         $( "#key" ).removeClass('disabled') .prop("disabled", false);
       }
       else {
         $('#key').addClass('notshown') .removeClass('shown');
         $('#keylabel').addClass('notshown') .removeClass('shown');
         $( "#key" ).addClass('disabled') .prop("disabled", true);
       }
       //eraseResults();
       calcResult(event);
     }

     function selectText(element) {
       var doc = document, range, selection;
       if (doc.body.createTextRange) {
         range = document.body.createTextRange();
         range.moveToElementText(element);
         range.select();
       }
       else if (window.getSelection) {
         selection = window.getSelection();
         range = document.createRange();
         range.selectNodeContents(element);
         selection.removeAllRanges();
         selection.addRange(range);
       }
     }

     function copyToClipboard() {
       var $iconDiv = $(this);
       var $textHolder = $iconDiv.next();
       selectText($textHolder[0]);
       try {
         document.execCommand('copy');
       }
       catch(exc1) {
       }
     }

     function applyRecaptchaPreSubmit(event) {
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
                 alert( "success: " + JSON.stringify(responseData));
               })
               .fail(function(response, error, exc) {
                 alert( "error: " + exc);
               })
               .always(function() {
                 //alert( "complete" );
               });

             //$('#form1').submit();
           });

         // .catch( e => {
         //   alert( "exception: " + e);
         // });
       }
       catch (e) {
         alert( "exception: " + e);
       }
       return false;
     }

     grecaptcha.ready(function() {
       $(document).ready(function() {
         $('#function').val('');
         $('#function').change(changeFunction);
         $('#function').val('sha-1');
         $('#hmac').change(changeHmac);
         $('#go').on('click', applyRecaptchaPreSubmit);
         $('#text').bind('input propertychange', changeText);
         $('#key').bind('input propertychange', changeKey);
         $('.copyIconHolder').on('click', copyToClipboard);
         changeHmac();
       });

     });
