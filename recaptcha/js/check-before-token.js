// check-before-token.js
// ------------------------------------------------------------------

/* jshint esversion:9, node:false, browser:true, strict:implied */
/* global grecaptcha, btoa */

(function () {
  const reCAPTCHA_site_key = '6LeEA3gUAAAAAPRenCnqy8K4IuLepRPAPLNIKOY_',
    postbackEndpoint = 'https://therealdinochiesa2-eval-test.apigee.net/oauth2-cc-recaptcha/token',
    client_id = 'V0YrtyrC0gXEtmFc98BigDy5EGaRoMb42EKqyeraOu',
    client_secret = 'VNtGqla90DaiZFKhojSTpsGXLWnO9SNkuhVBK2ZGudsL5UTG';

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
      grecaptcha
        .execute(reCAPTCHA_site_key, { action: 'token' })
        .then(function (recaptchaToken) {
          fetch(postbackEndpoint, {
            method: 'POST',
            headers: {
              Authorization: 'Basic ' + btoa(client_id + ':' + client_secret),
              'recaptcha-token': recaptchaToken,
              'Content-Type': 'application/x-www-form-urlencoded',
              Accept: 'application/json'
            },
            body: 'grant_type=client_credentials'
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
