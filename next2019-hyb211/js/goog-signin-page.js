// goog-signin-page.js
// ------------------------------------------------------------------
/* jshint esversion: 8, node: false */
/* global console, Buffer, window, gapi */

(function (){
  'use strict';

  function gauth() {
    return gapi.auth2.getAuthInstance();
  }

  function oneDiv(label, value) {
    return '<div class="item">'+
      '  <div class="label">'+ label +'</div>' +
      '  <div class="value">' + value + '</div>'+
      '</div>';
  }

  function signOut() {
    var auth2 = gapi.auth2.getAuthInstance();
    auth2.signOut().then(function () {
      var elt = document.getElementById('output');
      elt.innerHTML = '';
      console.log('User signed out.');
      showSignout(false);
    });
  }

  function onSignIn(googleUser) {
    var elt = document.getElementById("output");
    var profile = googleUser.getBasicProfile();
    var html = oneDiv('ID',  profile.getId()) +
      oneDiv('Full Name', profile.getName()) +
      //oneDiv('Given Name',  profile.getGivenName()) +
      //oneDiv('Family Name', profile.getFamilyName()) +
      oneDiv("Email", profile.getEmail()) +
      oneDiv('Image', '<img src="' + profile.getImageUrl() + '">');

    // The ID token you need to pass to your backend:
    var id_token = googleUser.getAuthResponse().id_token;
    html += oneDiv("ID Token", id_token);
    elt.innerHTML = html;
    showSignout(true);
  }

  function showSignout(visible) {
    var signout = document.getElementById('signout');
    if (signout) {
      signout.classList.add(visible?'visible':'hidden');
      signout.classList.remove(visible?'hidden':'visible');
    }
  }

  function gapiPostInit() {
    gapi.load('auth2', function() {
      // Ready.
      if (gauth().isSignedIn.get()) {
        showSignout(true);
      }
      else {
        showSignout(false);
      }
    });
  }

  window.onSignIn = onSignIn;
  window.signOut = signOut;
  window.gapiPostInit = gapiPostInit;

}());
