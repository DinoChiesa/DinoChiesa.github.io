// simplecheck-enterprise.js
// ------------------------------------------------------------------
//
// created: Mon Jun  1 13:00:26 2020
// last saved: <2026-October-18 20:30:00>

/* jshint esversion:9, node:false, strict:implied, browser:true */
/* global grecaptcha */

(function () {
  const appId = '64B04680-2834-4651-BFCB-B6E105CB0774';
  var reCAPTCHA_site_key = null;

  const LocalStorage = (function () {
    function AppScopedStoreManager(appid) {
      this.appid = appid;
    }

    AppScopedStoreManager.prototype.get = function (key) {
      return window.localStorage.getItem(this.appid + '.datamodel.' + key);
    };

    AppScopedStoreManager.prototype.remove = function (key) {
      return window.localStorage.removeItem(this.appid + '.datamodel.' + key);
    };

    AppScopedStoreManager.prototype.store = function (key, value) {
      return window.localStorage.setItem(this.appid + '.datamodel.' + key, value);
    };

    const init = function (id) {
      return new AppScopedStoreManager(id);
    };
    return { init };
  })();

  const storage = LocalStorage.init(appId);
  let datamodel = {
    'txt-sitekey': '',
    'txt-baseurl': ''
  };

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

  function retrieveLocalState() {
    Object.keys(datamodel).forEach(key => {
      var value = storage.get(key);
      if (key.startsWith('chk-')) {
        datamodel[key] = Boolean(value);
      } else {
        datamodel[key] = value;
      }
    });
  }

  function applyState() {
    Object.keys(datamodel).forEach(key => {
      var value = datamodel[key];
      if (value) {
        var item = document.getElementById(key);
        if (item && key.startsWith('txt-')) {
          item.value = value;
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
    var value = this.value,
      key = this.id;
    saveSetting(key, value);
  }

  function injectRecaptchaScript() {
    let head = document.getElementsByTagName('head')[0],
      script = document.createElement('script');
    script.type = 'text/javascript';
    script.onload = () =>
      eval('grecaptcha.enterprise.ready(() => setTimeout(submitRequest, 50));');
    script.src = `https://www.google.com/recaptcha/enterprise.js?render=${reCAPTCHA_site_key}`;
    head.appendChild(script);
  }

  function applyRecaptchaAndSubmit(event) {
    if (event) event.preventDefault();
    try {
      if (reCAPTCHA_site_key) {
        return submitRequest();
      }
      var siteKeyInput = document.getElementById('txt-sitekey');
      reCAPTCHA_site_key = siteKeyInput ? siteKeyInput.value.trim() : '';
      if (reCAPTCHA_site_key) {
        setTimeout(injectRecaptchaScript, 2);
      } else {
        window.alert('specify a site key');
      }
    } catch (e) {
      window.alert('exception: ' + e);
    }
    return false;
  }

  function submitRequest() {
    try {
      grecaptcha.enterprise
        .execute(reCAPTCHA_site_key, { action: 'homepage' })
        .then(recaptchaToken => {
          let baseurl = (document.getElementById('txt-baseurl').value || '').trim(),
            postbackEndpoint = `${baseurl}/recaptcha-enterprise/assess`;

          fetch(postbackEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json'
            },
            body: JSON.stringify({ recaptcha_token: recaptchaToken })
          })
            .then(res => res.json())
            .then(responseData => {
              let ta = document.createElement('textarea');
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
            .catch(exc => {
              window.alert('error: ' + exc);
            });
        });
    } catch (e) {
      window.alert('exception: ' + e);
    }
    return false;
  }

  const bindEvents = () => {
    resetState();
    ['txt-baseurl', 'txt-sitekey'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        ['change', 'keyup', 'paste', 'input'].forEach(evt => {
          el.addEventListener(evt, storeSetting);
        });
      }
    });
    const checkBtn = document.getElementById('check');
    if (checkBtn) checkBtn.addEventListener('click', applyRecaptchaAndSubmit);
    const clearBtn = document.getElementById('clear');
    if (clearBtn) clearBtn.addEventListener('click', clearOutput);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindEvents);
  } else {
    bindEvents();
  }
})();
