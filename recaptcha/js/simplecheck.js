// simplecheck.js
// ------------------------------------------------------------------
//
// created: Mon Jun  1 13:00:26 2020
// last saved: <2026-October-18 20:30:00>

/* jshint esversion:9, node:false, browser:true, strict:implied */
/* global grecaptcha */

(function () {
  const reCAPTCHA_site_key = '6LeEA3gUAAAAAPRenCnqy8K4IuLepRPAPLNIKOY_';
  const postbackEndpoint = 'https://gaccelerate3-test.apigee.net/recaptcha-v3/check';

  function clearOutput(event) {
    if (event) event.preventDefault();
    const output = document.getElementById('output');
    if (output) {
      output.classList.add('notshown');
      output.innerHTML = '';
    }
    const clear = document.getElementById('clear');
    if (clear && clear.parentElement) {
      clear.parentElement.classList.add('notshown');
    }
  }

  function applyRecaptchaAndSubmit(event) {
    if (event) event.preventDefault();

    try {
      // The browser will show an opaque promise error if hosted on an unmatched domain
      grecaptcha
        .execute(reCAPTCHA_site_key, { action: 'homepage' })
        .then(function (recaptchaToken) {
          fetch(postbackEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json'
            },
            body: JSON.stringify({ recaptcha_token: recaptchaToken })
          })
            .then(function (response) {
              return response.json();
            })
            .then(function (responseData) {
              const ta = document.createElement('textarea');
              ta.className = 'results code';
              ta.spellcheck = false;
              ta.disabled = true;
              ta.value = JSON.stringify(responseData, null, 2);

              const output = document.getElementById('output');
              output.innerHTML = '';
              output.classList.remove('notshown');
              output.appendChild(ta);

              const clear = document.getElementById('clear');
              if (clear && clear.parentElement) {
                clear.parentElement.classList.remove('notshown');
              }
            })
            .catch(function (exc) {
              window.alert('error: ' + exc);
            });
        });
    } catch (e) {
      window.alert('exception: ' + e);
    }
    return false;
  }

  grecaptcha.ready(function () {
    const bindHandlers = function () {
      const checkBtn = document.getElementById('check');
      if (checkBtn) checkBtn.addEventListener('click', applyRecaptchaAndSubmit);
      const clearBtn = document.getElementById('clear');
      if (clearBtn) clearBtn.addEventListener('click', clearOutput);
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bindHandlers);
    } else {
      bindHandlers();
    }
  });
})();
