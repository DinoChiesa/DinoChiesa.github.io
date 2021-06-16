// page.js
// ------------------------------------------------------------------
//
/* jshint esversion:9, node:false, browser:true, strict:implied */
/* global jQuery  */

(function (){
  const $ = jQuery,
        extraneousDoubleSlashFinder = new RegExp('^(https?://[^/]+)//(.+)$'),
        html5AppId = 'F82F76F0-0029-499B-AA68-A0EBB1CD01B2';

  let model = {
        'txt-baseurl' : '',
        'txt-urlpath' : '',
        'ta-addlheaderlist' : '',
        'ta-body' : '',
        'sel-verb' : '',
        'sel-contenttype' : ''
      };

  function debounce(interval, callback) {
    let debounceTimeoutId;
    return function(...args) {
      if (debounceTimeoutId) { clearTimeout(debounceTimeoutId); }
      debounceTimeoutId = setTimeout(() => callback.apply(this, args), interval);
    };
  }

  function populateFormFields() {
    // get values from local storage, and place into the form
    Object.keys(model)
      .forEach(key => {
        let value = window.localStorage.getItem(html5AppId + '.model.' + key),
            $item = $('#' + key);
        if (value && value !== '') {
          model[key] = value;
          if (key.startsWith('sel-')) {
            // the type of form field is select.
            $item.find("option[value='"+value+"']").prop('selected', 'selected');
            onSelectChanged.call($item, null);
            //$item.trigger('chosen:updated');
          }
          else {
            // value is a simple string, form field type is input.
            $item.val(value);
          }
        }
      });
  }

  function getSingleSelectItemValue($item) {
    let value = null;
    $item.find('option:selected' ).each(function() {
      value = $( this ).text();
    });
    return value;
  }

  function clearOutput(event) {
    if (event) { event.preventDefault(); }
    $('#output').addClass('notshown').empty();
    $('#btn-clear').parent().addClass('notshown');
  }

  function reformIndents(s) {
    let s2 = s.split(new RegExp('\n', 'g'))
      .map(s => s.trim())
      .join("\n");
    return s2.trim();
  }

  function handlePaste(e) {
    let $$ = $(this),
        id = $$.attr('id');
    setTimeout(() => $$.val(reformIndents($$.val())), 100);
  }

  function onInputChanged(event) {
    let $$ = $(this),
        id = $$.attr('id'),
        value = $$.val();

    if (model[id] != value) {
      model[id] = value;
      storeItem(id, value);
    }
  }

  function httpMethodHasPayload(method) {
    return (method == 'POST' || method == 'PUT');
  }

  function onSelectChanged() {
    let $$ = $(this),
        id = $$.attr('id'),
        value = getSingleSelectItemValue($$);
    model[id] = value;
    storeItem(id, value);
    if (id == 'sel-verb') {
      if(httpMethodHasPayload(value)) {
        $('.for-payload').removeClass('notshown');
      }
      else {
        $('.for-payload').addClass('notshown');
      }
    }
  }

  function storeItem(key, value) {
    window.localStorage.setItem(html5AppId + '.model.' + key, value);
  }

  function shredHeaders(text) {
    let keyValuePairRe = new RegExp('^(.+?):(.+)$'),
        onNewlines = new RegExp('(\r\n|\n)', 'g'),
        headers = {};
    text
      .split(onNewlines)
      .forEach(line => {
        if (line.trim().length > 3) {
          let match = keyValuePairRe.exec(line);
          if (match && match.length == 3) {
            headers[match[1].trim().toLowerCase()] = match[2].trim();
          }
        }
      });
    return headers;
  }

  function showOutput(jqXHR) {
    let label = 'status: ' + jqXHR.status;
    let $ta = $('<textarea>');
    $ta.attr('class', 'results code');
    $ta.attr('spellcheck','false');
    $ta.attr('disabled','true');
    let body = label + '\n\n' +
      jqXHR.getAllResponseHeaders() + '\n' +
      jqXHR.responseText;
    $ta.text(body);
    $('#output').empty().removeClass('notshown').append($ta);
    $('#btn-clear').parent().removeClass('notshown');
  }


  function submit(event) {
    if (event) { event.preventDefault(); }

    try {
      let url = $('#txt-baseurl').val() + $('#txt-urlpath').val();
      if (url) {
        for (let m = extraneousDoubleSlashFinder.exec(url); m; ) {
          url = m[1] + '/' + m[2];
        }

        // POST to the API endpoint.
        // If it honors CORS, then this call will go through.
        clearOutput();
        let method = getSingleSelectItemValue($('#sel-verb')),
            headers = shredHeaders($('#ta-addlheaderlist').val()),
            data = null,
            dataType = 'text';  // response

        if (httpMethodHasPayload(method)) {
          headers['content-type'] = getSingleSelectItemValue($('#sel-contenttype'));
          data = $('#ta-body').val();
        }

        $.ajax({ url, method, headers, data, dataType })
          .done(function(data, textStatus, jqXHR) {
            showOutput(jqXHR);
          })
          .fail(function(jqXHR, error, exc) {
            showOutput(jqXHR);
          });
      }
    }
    catch (e) {
      window.alert( "exception: " + e);
    }
    return false;
  }


  $(document).ready(function() {
    populateFormFields();
    $( '#btn-send').on('click', submit);
    $( '#btn-clear').on('click', clearOutput);
    $( 'form .txt' ).on('change keyup input', debounce(450, onInputChanged));
    $( 'form select' ).change(onSelectChanged);
    $( 'form textarea').on('paste', handlePaste);
  });

}());
