// load-generator-page.js
// ------------------------------------------------------------------

(function (){
  'use strict';
  const maxBatchSize = 20,
        defaultBatchSize = 1,
        maxSpeedFactor = 11,
        defaultSpeedFactor = 5,
        oneHourInMs = 60 * 60 * 1000,
        minSleepTimeInMs = 20,
        requestFieldsToStore = ['http-end-point', 'method', 'batchsize-select', 'txt-payload', 'headers', 'extracts'];

  var context = { };
  var sleepTimer;
  var requestIndex = 0;
  var html5AppId = "67B53CD3-AD0A-4D58-8DE7-997EBC7B3ED1";   // for localstorage
  var templates = Array.apply(null, Array(4)).map((x, i) => '');
  var runState = 0;
  var Gaussian = function(mean, stddev) {
        /*
          Function normal.

          Generator of pseudo-random number according to a normal distribution
          with mean=0 and variance=1.
          Use the Box-Mulder (trigonometric) method, and discards one of the
          two generated random numbers.
        */
        var normal = function() {
              var u1 = 0, u2 = 0;
              while (u1 * u2 === 0) {
                u1 = Math.random();
                u2 = Math.random();
              }
              return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
            };

        this.mean = mean;
        this.stddev = stddev || mean * 0.1;
        this.next = function() {
          return this.stddev * normal() + 1 * mean;
        };
      };

  function onSelectChanged(event) {
    var $$ = $(this);
    showOrHidePayloadAsNecessary($$);
  }

  function showOrHidePayloadAsNecessary($$) {
    $$.find("option:selected").each(function() {
      var text = $( this ).text().toLowerCase();
    if (text === 'post' || text === 'put') {
      $$.parent().find( ".option-tabs" ).tabs( "option", "disabled", false );
    }
    else if (text === 'get') {
      $$.parent().find( ".option-tabs" ).tabs( "option", "disabled", [1] );
    }
    });
  }

  function incrementCount(query) {
    var state = $('#startstop').attr('data_state');
    if (state !== 'stopped') {
      var $rc = $(query);
      var currentValue = 0;
      try {
        currentValue = parseInt($rc.html(), 10);
        if (isNaN(currentValue)) {
          currentValue = 0;
        }
      }
      catch(e) {}
      currentValue += 1;
      $rc.html(currentValue);
    }
  }

  function getRunsPerHour(currentHour) {
    var invocationsPerHour = [
          94, 87, 89, 83, 90, 89, 89, 103,
          105, 112, 103, 109, 121, 122, 100, 98,
          97, 102, 120, 136, 133, 122, 123, 103];
    var speedfactor = Math.min(maxSpeedFactor, parseInt($('#speedfactor option:selected').val(), 10));
    var baseValue = invocationsPerHour[Math.abs(currentHour) % 24] * speedfactor / 2;
    var gaussian = new Gaussian(baseValue, 0.1 * baseValue); // fuzz
    return Math.floor(gaussian.next());
  }

  function getSleepTimeInMs(startOfMostRecentRequest) {
    var now = new Date(),
        currentHour = now.getHours(),
        runsPerHour = getRunsPerHour(currentHour),
        durationOfLastRun = now - startOfMostRecentRequest,
        sleepTimeInMs = (oneHourInMs / runsPerHour) - durationOfLastRun;
    if (sleepTimeInMs < minSleepTimeInMs) { sleepTimeInMs = minSleepTimeInMs; }
    // sleepTimeInMs += gaussian.next();
    sleepTimeInMs = Math.floor(sleepTimeInMs);
    $('#status').html(//'runs per hour('+ runsPerHour +') ' +
      'sleep ' + sleepTimeInMs + 'ms, wake at: ' +
        new Date(now.valueOf() + sleepTimeInMs).toString().substr(16, 8) );
    return sleepTimeInMs;
  }

  function errorHandler($div, resolve, fail) {
    return function(jqXHR, textStatus, errorThrown) {
      incrementCount('#errorcount');
      $div.find( ".response" ).html("<pre>" +
                            jqXHR.status + " " + jqXHR.statusText + "\n" +
                            jqXHR.getAllResponseHeaders() + "\n" +
                            jqXHR.responseText +
                                    "</pre>");
      resolve({});
    };
  }

  function successHandler ($div, resolve, fail) {
    return function (data, textStatus, jqXHR) {
      incrementCount('#requestcount');
      $div.find( ".response" ).html("<pre>" +
                            jqXHR.status + " " + jqXHR.statusText + "\n" +
                            jqXHR.getAllResponseHeaders() + "\n" +
                            jqXHR.responseText +
                                    "</pre>");
      resolve(JSON.parse(jqXHR.responseText));
    };
  }

  function invokeOneRequest(linkUrl, method, payload, headers, $div) {
    return new Promise(function(resolve, fail) {
      var options = {
            url : linkUrl,
            type: method,
            headers: headers,
            success: successHandler($div, resolve, fail),
            error: errorHandler($div, resolve, fail)
          };

      if ((method === 'post') || (method === 'put')) {
        options.data = payload;
      }

      // NB: This call may fail if the server does not include CORS headers in the response
      //console.log(method + ' ' + linkUrl);
      $.ajax(options);
    });
  }

  function sleepTick(millisecondsRemaining) {
    if (runState !== 1) { return 0; }
    var val = Math.floor(millisecondsRemaining / 1000) ;
    if (val > 0) {
      $('#status').html('wake in ' + val + 's');
    }
  }

  function invokeBatch($div) {
    if (runState !== 1) { return 0; }
    $('#status').html('sending batch...');
    var linkUrl = $div.find('.http-end-point').val().trim();
    var template = Handlebars.compile(linkUrl);
    linkUrl = template(context);
    var method = $div.find('.method option:selected').val().toLowerCase();
    var payload = $div.find('.txt-payload').val();
    var pTemplate = Handlebars.compile(payload);
    payload = pTemplate(context);
    var headers = [];
    var $headerContainer = $div.find('.headers');
    $headerContainer.find('.one-header').each(function(ix, element){
      var name = $(this).find('.http-header-name').val();
      var value = $(this).find('.http-header-value').val();
      var nTemplate = Handlebars.compile(name);
      var vTemplate = Handlebars.compile(value);
      headers[nTemplate(context)] = vTemplate(context);
    });
    var batchsize = Math.min(maxBatchSize, parseInt($div.find('.batchsize-select option:selected').val(), 10));

    // initialize array of N promises
    const promises = Array.apply(null, Array(batchsize))
      .map((x, i) => invokeOneRequest(linkUrl, method, payload, headers, $div));

    var p = Promise.all(promises)
      .then( (results) => {
        return new Promise(function(resolve, reject) {
          // perform extracts
          var payload = results[results.length - 1];
          var $extractContainer = $div.find('.extracts');
          var $divSet = $extractContainer.find('.one-extract');
          $divSet.each( function(ix, element) {
            var $one = $(this);
            var name = $one.find('.extract-name').val();
            var jsonpath = $one.find('.extract-jsonpath').val();
            if (name && jsonpath) {
              // https://github.com/s3u/JSONPath
              var result = JSONPath({json: payload, path: jsonpath});
              context[name] =  (Array.isArray(result) && result.length == 1) ? result[0]: result;
              //console.log('context[%s] = %s', name, context[name]);
            }
          });
          resolve({});
        });
      });
    return p;
  }

  function invokeSequence() {
    var startTime = new Date();
    var $requestHolder = $('#requestHolder');
    var $requests = $requestHolder.find('div.one-request');
    context = {};
    var p = new Promise(function(resolve, reject) {
          var value = $requests.length;
          if (value && value !== '') {
            window.localStorage.setItem( html5AppId + '.nrequests', value );
          }
          var speedfactor = Math.min(maxSpeedFactor, parseInt($('#speedfactor option:selected').val(), 10));
          window.localStorage.setItem( html5AppId + '.speedfactor', speedfactor );

          $requests.each(function(ix, element) {
            var $this = $(this);
            storeRequestFieldsIntoLocalStorage($this, ix + 1);
          });
          resolve({});
        });

    var promises = [];
    $requests.each(function(){
      var $this = $(this);
      p = p.then(() => invokeBatch($this));
    });

    p = p .then(function(resultValues) {
        if (runState == 1) {
          sleepTimer = new CountdownTimer(getSleepTimeInMs(startTime))
            .onTick(sleepTick)
            .onExpired(invokeSequence)
            .start();
        }
      });
  }

  function updateRunState(event) {
    var $ss = $('#startstop');
    var $r = $('#reset');
    var state = $ss.attr('data_state');
    if (state == 'running') {
      runState = 0;
      if (sleepTimer) {
        sleepTimer.stop();
        sleepTimer = null;
      }
      $('#status').html('stopped.');
      $ss.attr('data_state', 'stopped');
      $ss.addClass('btn-success');
      $ss.removeClass('btn-danger');
      $ss.html('Start');
      $r.removeAttr("disabled");
    }
    else {
      runState = 1;
      $('#status').html('running...');
      $ss.attr('data_state', 'running');
      setTimeout(invokeSequence, 2);
      $r.attr("disabled", "disabled");
      $ss.html('Stop');
      $ss.addClass('btn-danger');
      $ss.removeClass('btn-success');
    }
    if (event)
      event.preventDefault();
  }

  function resetPage(event) {
    var $ss = $('#startstop');
    var state = $ss.attr('data_state');
    if (state === 'stopped') {
      ['#requestcount','#errorcount'].forEach( q => { $(q).html('0'); });
    }
    var $requestHolder = $('#requestHolder');
    var $requests = $requestHolder.find('div.one-request');
    $requests.each(function(){
      $(this).find( ".response" ).html(templates[3]({}));
    });
    if (event)
      event.preventDefault();
  }

  function storageKeyForRequest(n, key) {
    return html5AppId + '.request.' + n + '.' + key;
  }

  function populateRequestFieldsFromLocalStorage($div, n) {
    requestFieldsToStore.forEach( key => {
      var storageKey = storageKeyForRequest(n, key);
      var value = window.localStorage.getItem( storageKey );
      if (value && value !== '') {
        var $item = $div.find('.' + key );
        if (key === 'method' || key === 'batchsize-select' ) {
          $item.find("option[value='" + value + "']").prop("selected", "selected");
          if (key === 'method') { showOrHidePayloadAsNecessary($item); }
        }
        else if (key === 'headers' || key === 'extracts') {
          value = JSON.parse(value);
          Object.keys(value).forEach(function(itemName) {
            addOneHeaderOrExtract0($item, templates[(key === 'headers')?1:2]);
            // now that the elements exist, apply the values into them
            var $one = $item.find(((key === 'headers')?".one-header":'.one-extract') + ":last");
            $one.find((key === 'headers')?'.http-header-name':'.extract-name').val(itemName);
            $one.find((key === 'headers')?'.http-header-value':'.extract-jsonpath').val(value[itemName]);
          });
        }
        else {
          $item.val(value);
        }
      }
    });
  }

  function storeRequestFieldsIntoLocalStorage($div, n) {
    requestFieldsToStore.forEach( key => {
      var $field = $div.find('.' + key );
      var storageKey = storageKeyForRequest(n, key);
      var value = '';
        if (key === 'method' || key === 'batchsize-select' ) {
        value = $field.find(":selected").text();
      }
      else if (key === 'headers' || key === 'extracts' ) {
        value = {};
        var $divSet = $field.find((key === 'headers')?'.one-header':'.one-extract');
        $divSet.each( function(ix, element) {
          var $one = $(this);
          var name = $one.find((key === 'headers')?'.http-header-name':'.extract-name').val();
          var value2 = $one.find((key === 'headers')?'.http-header-value':'.extract-jsonpath').val();
          if (name && value2) {
            value[name] = value2;
          }
        });
        value = JSON.stringify(value);
      }
      else {
        value = $field.val();
      }
      if (value && value !== '') {
        window.localStorage.setItem( storageKey, value );
      }
    });
  }

  function addOneHeaderOrExtract0 ($containerDiv, hbrTemplate, event) {
    $containerDiv.find( 'button.remove' ).unbind('click'); // unbind click handlers
    $containerDiv.find( 'button.add'  ).before(hbrTemplate({})); // just before the + button
    $containerDiv.find( 'button.remove' ).click(removeHeaderOrExtract); // query again, and rebind
    if (event)
      event.preventDefault();
  }

  function addOneHeaderOrExtract ($this, label, hbrTemplate, event) {
    var $containerDiv = $this.closest("." + label);
    addOneHeaderOrExtract0($containerDiv, hbrTemplate, event);
  }

  function addOneHeader (event) {
    return addOneHeaderOrExtract($(this), 'headers', templates[1], event);
  }

  function addOneExtract (event) {
    return addOneHeaderOrExtract($(this), 'extracts', templates[2], event);
  }

  function removeHeaderOrExtract(event) {
    var $source = $(this);
    $source.parent().remove();
    if (event)
      event.preventDefault();
  }

  function initDropdown(query, N, selected) {
    var $dropdown = $(query);
    selected = selected || N;
    const values = Array.apply(null, Array(N)).map((x, i) => (N - i));
    $.each(values, function(ix, value) {
      // <option value="1" >1</option>
      $dropdown.append($("<option />").val(value).text(value));
    });
    $dropdown.find('option[value='+ selected +']').prop('selected', true);
  }

  function getFormId(omitOctothorpe) {
    var id = 'request-form-' + requestIndex;
    if (omitOctothorpe)
      return id;
    return '#' + id;
  }

  function removeOneRequestTab() {
    var $$ = $(this);
    //var tabContainerId = $$.closest(".ui-tabs").attr("id");
    var $requestHolder = $('#requestHolder');
    var tabCount = $requestHolder.find(".ui-closable-tab").length;
    if (tabCount > 0) {
      var panelId = $$.closest( "li" ).remove().attr( "aria-controls" );
      $( "#" + panelId ).remove();
      requestIndex--;
      $requestHolder.tabs("refresh");
    }
  }

  function addRequestTab() {
    requestIndex++;
    var $requestHolder = $('#requestHolder');
    var liTemplate = '<li id="li-{{ix}}"><a href="#request-form-{{ix}}">#'+requestIndex + '</a>';
    if (requestIndex > 1) {
      liTemplate += '<span class="ui-icon ui-icon-circle-close ui-closable-tab"></span>';
    }
    liTemplate += '</li>';
    liTemplate = Handlebars.compile(liTemplate);
    $requestHolder.find(">ul li:last").before(liTemplate({ix: requestIndex}));
    $requestHolder.append(templates[0]({ix: requestIndex}));
    $requestHolder.tabs("refresh");

    // now set up the tabs inside this panel
    var id = getFormId();
    initDropdown(id + " .batchsize-select", maxBatchSize, defaultBatchSize);
    var $requestPanel = $(id);
    $requestPanel.find( ".response" ).html(templates[3]({}));

    $requestPanel.find( "select.method" ).change(onSelectChanged);
    $requestPanel.find( " .option-tabs" ).tabs({ active: 0, activate: onActivateInnerTab } );
    $requestPanel.find( " .option-tabs" ).tabs( "option", "disabled", [ 1 ] ); // initially, because no payload for GET

    var $headers = $requestPanel.find( " .headers ");
    $headers.find( "button.add" ).click(addOneHeader);
    $requestPanel.find( " .extracts button.add" ).click(addOneExtract);

    populateRequestFieldsFromLocalStorage($requestPanel, requestIndex);

    var $closableTabs = $requestHolder.find(".ui-closable-tab");
    $closableTabs.unbind( "click" );
    $closableTabs.on( "click", removeOneRequestTab);

    return $requestHolder;
  }

  function onActivateRequestTab( event, ui ) {
    // focus the URL input element
    ui.newPanel.find('.http-end-point').focus();
  }

  function onActivateInnerTab( event, ui ) {
    var $elt = ui.newPanel;
    // focus the desired element
    ['.txt-payload', '.add'].forEach( (cls) => {
      var $childElement = $elt.find(cls);
      if ($childElement) {
        $childElement.focus();
      }
    });
  }

  function beforeActivateRequestTab( event, ui ) {
    var id = ui.newPanel.attr('id');
    // conditionally add a tab instead of allowing selection
    if (id === 'request-adder-tab') {
      var $requestHolder = addRequestTab();
      var count = $requestHolder.find('div.one-request').length;
      $( "#requestHolder" ).tabs("option", "active", count - 1);
      return false; // suppress selection of this tab
    }
  }

  /**
   * Load multiple template files via ajax.
   *
   * Example usage:
   *
   * retrieveTemplates('file1.hbr', 'file2.hbr')
   *   .fail(function(jqxhr, textStatus, error){})
   *   .done(function(file1, file2){})
   * ;
   */
  function retrieveTemplates() {
    return jQuery.when.apply(jQuery,
                             jQuery.map(arguments, function(url) {
                               return $.ajax({ url : "tmpl/" + url, dataType: "text" }); // a promise
                             }))
      .then(function(){
        var def = jQuery.Deferred();
        return def.resolve.apply(def, jQuery.map(arguments, function(response){
          //console.log(response[1]);
          return response[0];
        }));
      });
  }

  function restorePageState() {
    var value = window.localStorage.getItem( html5AppId + '.nrequests' );
    if (value && value !== '') {
      for (var i = 1; i<value; i++) {
        addRequestTab();
      }
    }
    value = window.localStorage.getItem( html5AppId + '.speedfactor' );
    initDropdown("#speedfactor", maxSpeedFactor, value || defaultSpeedFactor);
  }

  $(document).ready(function() {

    retrieveTemplates( 'oneRequest.hbr', 'oneHeader.hbr', 'oneExtract.hbr', 'blankResponse.hbr' )
      .done(function( /* va_args */) {
        templates = Array.from(arguments).map(tmpl => Handlebars.compile(tmpl));
        $( "#requestHolder" ).tabs({ beforeActivate: beforeActivateRequestTab, activate: onActivateRequestTab });
        addRequestTab();
        restorePageState();
        $( "#requestHolder" ).tabs("option", "active", 0);
        $( "form #startstop" ).click(updateRunState);
        $( "form #reset" ).click(resetPage);
      });
  });


}());
