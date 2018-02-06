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
  var counts = [0, 0];
  var batchdata = {};
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

  var updateSuccessCountDisplay = $.throttle(500, false, function() {
        var state = $('#startstop').attr('data_state');
        if (state !== 'stopped') {
          $('#successcount').html(counts[0]);
        }
      });

  var updateErrorCountDisplay = $.throttle(500, false, function() {
        var state = $('#startstop').attr('data_state');
        if (state !== 'stopped') {
          $('#errorcount').html(counts[1]);
        }
      });

  // function updateCountDisplay(typ) {
  //   var state = $('#startstop').attr('data_state');
  //   if (state !== 'stopped') {
  //     $((typ === 'error')?'#errorcount':'#requestcount').html((typ === 'error')?counts[1]:counts[0]);
  //   }
  // }

  function updateResponseOutput(divid) {
    if (batchdata[divid].mostRecentJQXHR) {
      var jqXHR = batchdata[divid].mostRecentJQXHR;
      $('#' + divid).find( ".response" ).html("<pre>" +
                                        jqXHR.status + " " + jqXHR.statusText + "\n" +
                                        jqXHR.getAllResponseHeaders() + "\n" +
                                        jqXHR.responseText +
                                        "</pre>");
      batchdata[divid].mostRecentJQXHR = null;
    }
  }

  function updateOutput(divid, jqXHR, typ) {
    if (typ === 'error') updateErrorCountDisplay();
    else updateSuccessCountDisplay();
    batchdata[divid].mostRecentJQXHR = jqXHR;
    batchdata[divid].updateResponse();
  }

  function errorHandler(divid, resolve, fail) {
    return function(jqXHR, textStatus, errorThrown) {
      counts[1]++;
      updateOutput(divid, jqXHR, 'error');
      resolve({});
    };
  }

  function successHandler (divid, resolve, fail) {
    return function (data, textStatus, jqXHR) {
      counts[0]++;
      updateOutput(divid, jqXHR, 'success');
      resolve(JSON.parse(jqXHR.responseText));
    };
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
    sleepTimeInMs = Math.floor(sleepTimeInMs);
    $('#status').html(
      'sleep ' + sleepTimeInMs + 'ms, wake at: ' +
        new Date(now.valueOf() + sleepTimeInMs).toString().substr(16, 8) );
    return sleepTimeInMs;
  }

  function invokeOneRequest(linkUrl, method, payload, headers, divid, lastOne) {
    return new Promise(function(resolve, fail) {
      var options = {
            url : linkUrl,
            type: method,
            headers: headers,
            success: successHandler(divid, resolve, fail),
            error: errorHandler(divid, resolve, fail)
          };

      if ((method === 'post') || (method === 'put')) {
        options.data = payload;
      }

      if (lastOne) {
        $('#status').html('awaiting replies...');
      }
      // NB: This call may fail if the server does not include CORS headers in the response
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

  function invokeBatch($div, nBatchesRemaining) {
    if (runState !== 1) { return 0; }
    var linkUrl = $div.find('.http-end-point').val().trim();
    var template = Handlebars.compile(linkUrl);
    // faulty input from user can cause exception in handlebars
    try {
      linkUrl = template(context);
    }
    catch (e) { }
    var method = $div.find('.method option:selected').val().toLowerCase();
    var payload = $div.find('.txt-payload').val();
    var pTemplate = Handlebars.compile(payload);
    try {
      payload = pTemplate(context);
    }
    catch (e) { }
    var headers = [];
    var $headerContainer = $div.find('.headers');
    $headerContainer.find('.one-header').each(function(ix, element){
      var name = $(this).find('.http-header-name').val();
      var value = $(this).find('.http-header-value').val();
      try {
        var nTemplate = Handlebars.compile(name, {noEscape:true});
        var vTemplate = Handlebars.compile(value, {noEscape:true});
        name = nTemplate(context);
        value = vTemplate(context);
        headers[name] = value;
      }
      catch (e) { }
    });
    var batchsize = Math.min(maxBatchSize, parseInt($div.find('.batchsize-select option:selected').val(), 10));

    // initialize array of N + 1 promises
    const promises = Array.apply(null, Array(batchsize))
      .map((x, i) => invokeOneRequest(linkUrl, method, payload, headers, $div.attr('id'), (nBatchesRemaining === 0) && ((batchsize - i) === 1)));

    var p = Promise.all(promises)
      .then( (results) => {
        return new Promise(function(resolve, reject) {
          // perform extracts
          var payload = results[results.length - 1];
          // var payload = results[results.length - 2]; // last promise is the status update
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

  function getContext() {
    var s = $('textarea.txt-initial-context').val();
    var result = {};
    try {
      result = JSON.parse(s);
    }
    catch (e) { }
    window.localStorage.setItem( html5AppId + '.initialcontext', JSON.stringify(result) );
    return result;
  }

  function invokeSequence() {
    var startTime = new Date();
    var $batchHolder = $('#batchHolder');
    var $requests = $batchHolder.find('div.one-request');
    var nRequests = $requests.length;
    context = getContext();
    var p = new Promise(function(resolve, reject) {
          if (nRequests) {
            window.localStorage.setItem( html5AppId + '.nrequests', nRequests );
          }
          var speedfactor = Math.min(maxSpeedFactor, parseInt($('#speedfactor option:selected').val(), 10));
          window.localStorage.setItem( html5AppId + '.speedfactor', speedfactor );

          $requests.each(function(ix, element) {
            var $this = $(this);
            storeRequestFieldsIntoLocalStorage($this, ix + 1);
          });
          resolve({});
        });

    p = p.then( () => { $('#status').html('sending batches...'); return ({});});

    // batches must be serialized
    $requests.each(function(ix){
      var $this = $(this);
      p = p.then(() => invokeBatch($this, nRequests - ix - 1));
    });

    p = p
      .then(function(resultValues) {
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
      ['#successcount','#errorcount'].forEach( q => { $(q).html('0'); });
      counts = [0, 0];
    }
    var $batchHolder = $('#batchHolder');
    var $requests = $batchHolder.find('div.one-request');
    $requests.each(function(){
      $(this).find( ".response" ).html(templates[3]({}));
    });
    if (event)
      event.preventDefault();
  }

  function storageKeyForRequest(n, key) {
    return html5AppId + '.request.' + n + '.' + key;
  }

  function populateRequestFields($div, n, tabConfig) {
    requestFieldsToStore.forEach( key => {
      var value = (tabConfig) ? tabConfig[key] : window.localStorage.getItem( storageKeyForRequest(n, key) );

      if (value && value !== '') {
        var $item = $div.find('.' + key );
        if (key === 'method' || key === 'batchsize-select' ) {
          $item.find("option[value='" + ('' + value).toUpperCase() + "']").prop("selected", "selected");
          if (key === 'method') { showOrHidePayloadAsNecessary($item); }
        }
        else if (key === 'headers' || key === 'extracts') {
          if (typeof value === 'string'){
            value = JSON.parse(value);
          }
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

  function removeOneBatchTab() {
    var $$ = $(this);
    var $batchHolder = $('#batchHolder');
    var tabCount = $batchHolder.find(".ui-closable-tab").length;
    if (tabCount > 0) {
      var panelId = $$.closest( "li" ).remove().attr( "aria-controls" );
      $( "#" + panelId ).remove();
      requestIndex--;
      $batchHolder.tabs("refresh");
    }
  }

  function addBatchTab(tabConfig) {
    requestIndex++;
    var $batchHolder = $('#batchHolder');
    var liTemplate = '<li id="li-{{ix}}"><a href="#request-form-{{ix}}">Batch #'+requestIndex + '</a>';
    if (requestIndex > 1) {
      liTemplate += '<span class="ui-icon ui-icon-circle-close ui-closable-tab"></span>';
    }
    liTemplate += '</li>';
    liTemplate = Handlebars.compile(liTemplate);
    $batchHolder.find(">ul li:last").before(liTemplate({ix: requestIndex}));
    $batchHolder.append(templates[0]({ix: requestIndex}));
    $batchHolder.tabs("refresh");

    // now set up the tabs inside this panel
    var id = getFormId();
    initDropdown(id + " .batchsize-select", maxBatchSize, defaultBatchSize);
    var $requestPanel = $(id);
    $requestPanel.find( ".response" ).html(templates[3]({}));

    // create a debounced function for update of the response payload
    var trimmedId = id.slice(1);
    batchdata[trimmedId] = { updateResponse : $.throttle(650, false, function(){ updateResponseOutput(trimmedId); }) };

    $requestPanel.find( "select.method" ).change(onSelectChanged);
    $requestPanel.find( " .option-tabs" ).tabs({ active: 0, activate: onActivateInnerTab } );
    $requestPanel.find( " .option-tabs" ).tabs( "option", "disabled", [ 1 ] ); // initially, because no payload for GET

    var $headers = $requestPanel.find( " .headers ");
    $headers.find( "button.add" ).click(addOneHeader);
    $requestPanel.find( " .extracts button.add" ).click(addOneExtract);

    populateRequestFields($requestPanel, requestIndex, tabConfig);

    var $closableTabs = $batchHolder.find(".ui-closable-tab");
    $closableTabs.unbind( "click" );
    $closableTabs.on( "click", removeOneBatchTab);

    return $batchHolder;
  }

  function onActivateRequestTab( event, ui ) {
    // focus the URL input element
    var $panel = ui.newPanel.find('.http-end-point');
    if ($panel.length>0) {
      $panel.focus();
      return;
    }
    $panel = ui.newPanel.find('.txt-initial-context');
    $panel.focus();
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
      var $batchHolder = addBatchTab();
      var count = $batchHolder.find('div.one-request').length;
      $( "#batchHolder" ).tabs("option", "active", count - 1);
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

  var reWhitespace = new RegExp('\\s', 'g');
  var reInnerArray = new RegExp('\\[([^\\[\\]]*)\\]', 'g');
  function jsonStringifyCompactly(obj) {
    function replacer(match, p1, offset, string) {
      if (p1.length < 80) {
        return '[' + p1.replace(reWhitespace, '') + ']';
      }
      return '[' + p1 + ']';
    }
    return JSON.stringify(obj, null, 2).replace(reInnerArray, replacer);
  }

  function restorePageStateFromStorage() {
    var value = window.localStorage.getItem( html5AppId + '.nrequests' );
    if (value && value !== '') {
      for (var i = 1; i<value; i++) {
        addBatchTab();
      }
    }
    value = window.localStorage.getItem( html5AppId + '.speedfactor' );
    initDropdown("#speedfactor", maxSpeedFactor, value || defaultSpeedFactor);
    value = window.localStorage.getItem( html5AppId + '.initialcontext' );
    var obj = { name1: "value1" };
    if (value && value !== '') {
    try {
      obj = JSON.parse(value);
    }
    catch (e) { }
    }
    $('textarea.txt-initial-context').val(jsonStringifyCompactly(obj));
  }

  function restorePageStateFromConfig(config) {
    if (Array.isArray(config.requests) && config.requests.length > 0) {
      var $batchHolder = $( "#batchHolder" );
      $batchHolder.tabs('destroy')
        .html(templates[4]({}))
        .tabs({ beforeActivate: beforeActivateRequestTab, activate: onActivateRequestTab });
      requestIndex = 0;
      config.requests.forEach(function(request) {
        addBatchTab(request);
      });
      $batchHolder.tabs("option", "active", 1);
      initDropdown("#speedfactor", maxSpeedFactor, config.speedfactor || defaultSpeedFactor);
      $('textarea.txt-initial-context').val(jsonStringifyCompactly(config.initialContext));
    }
  }

  function getConfigString() {
    var config = {};
    var $batchHolder = $('#batchHolder');
    var $requests = $batchHolder.find('div.one-request');
    config.requests = [];
    $requests.each(function(){
      var thisRequest = {};
      var $div = $(this);
      thisRequest['http-end-point'] = $div.find('.http-end-point').val().trim();
      thisRequest.method = $div.find('.method option:selected').val().toUpperCase();
      thisRequest['txt-payload'] = $div.find('.txt-payload').val();
      thisRequest.headers = {};
      var $headerContainer = $div.find('.headers');
      $headerContainer.find('.one-header').each(function(ix, element){
        var name = $(this).find('.http-header-name').val();
        var value = $(this).find('.http-header-value').val();
        thisRequest.headers[name] = value;
      });

      thisRequest.extracts = {};
      var $extractContainer = $div.find('.extracts');
      var $divSet = $extractContainer.find('.one-extract');
      $divSet.each( function(ix, element) {
        var $one = $(this);
        var name = $one.find('.extract-name').val();
        var jsonpath = $one.find('.extract-jsonpath').val();
        if (name && jsonpath && name.trim() && jsonpath.trim()) {
          thisRequest.extracts[name.trim()] = jsonpath.trim();
        }
      });

      thisRequest['batchsize-select'] = Math.min(maxBatchSize, parseInt($div.find('.batchsize-select option:selected').val(), 10));
      config.requests.push(thisRequest);
    });

    try {
      config.initialContext = JSON.parse($('textarea.txt-initial-context').val());
    }
    catch(e) {
      config.initialContext = {};
    }
    config.speedfactor = Math.min(maxSpeedFactor, parseInt($('#speedfactor option:selected').val(), 10));

    return jsonStringifyCompactly(config);
  }

  $(document).ready(function() {
    retrieveTemplates( 'oneRequest.hbr', 'oneHeader.hbr', 'oneExtract.hbr', 'blankResponse.hbr', 'batchHolder.hbr' )
      .done(function( /* va_args */) {
        templates = Array.from(arguments).map(tmpl => Handlebars.compile(tmpl));
        var $batchHolder = $( "#batchHolder" );
        $batchHolder.html(templates[4]({}))
          .tabs({ beforeActivate: beforeActivateRequestTab, activate: onActivateRequestTab });
        addBatchTab();
        restorePageStateFromStorage();
        $batchHolder.tabs("option", "active", 1);
        $( "form #startstop" ).click(updateRunState);
        $( "form #reset" ).click(resetPage);
        $( "#open-help" ).click( () => {
          var w = $('#main-div').width();
          $( "#help-message" ).dialog({
            minWidth: w * 0.72,
            maxWidth: w * 0.88,
            modal: true,
            buttons: {
              Ok: function() {
                $( this ).dialog( "close" );
              }
            }
          });
        });

        $( "#open-config" ).click( () => {
          var w = $('#main-div').width();
          var s = getConfigString();
          $( "#config" ).find( '.txt-config' ).val(s);
          $( "#config" ).dialog({
            minWidth: w * 0.84,
            modal: true,
            buttons: {
              Cancel: function() {
                $( this ).dialog( "close" );
              },
              'Apply Changes': function() {
                // apply the maybe modified config to the SPA
                try {
                  var c = $( this ).find( '.txt-config' ).val();
                  c = JSON.parse(c);
                  restorePageStateFromConfig(c);
                }
                catch (e) {
                  console.log('exception while restoring: ' + e);
                }
                $( this ).dialog( "close" );
              }
            }
          });

        });
      });
  });


}());
