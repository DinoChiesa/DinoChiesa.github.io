// load-generator-page.js
// ------------------------------------------------------------------

(function (){
  'use strict';
  var model = model || {
        method : '',
        endpoint : '',
      };
  const oneHourInMs = 60 * 60 * 1000;
  const minSleepTimeInMs = 20;
  var sleepTimer;
  const maxBatchSize = 20;
  const maxSpeedFactor = 11;
  var html5AppId = html5AppId || "67B53CD3-AD0A-4D58-8DE7-997EBC7B3ED1";   // for localstorage
  var runState = 0;
  var oneHeaderLine =
    '<div class="form-group col-sm-8 one-header">\n' +
    '  <input autocomplete="off" class="form-control http-header-name" value="" placeholder="Header Name"/>\n' +
    '  <input autocomplete="off" class="form-control http-header-value" value="" placeholder="Header Value"/>\n' +
    '  <button class="btn btn-default btn-outline remove-header" title="delete">X</button>\n' +
    '</div>\n' +
    '<div class="clearfix"></div>';
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

  function onInputChanged() {
    var $$ = $(this), name = $$.attr('id'), value = $$.val();
    model[name] = value;
  }

  function onSelectChanged() {
    var $$ = $(this), name = $$.attr('name');
    $$.find("option:selected").each(function() {
      var text = $( this ).text().toLowerCase(),
          $payload = $("#payload");
      model[name] = text;
      if (text === 'post' || text === 'put') {
        $( "#option-tabs" ).tabs( "option", "disabled", false );
      }
      else if (text === 'get') {
        $( "#option-tabs" ).tabs( "option", "disabled", [1] );
      }
    });
  }

  function updateModel(event) {
    Object.keys(model).forEach(function(key) {
      var $item = $('#' + key), value = $item.val();
      model[key] = value;
    });
    if (event)
      event.preventDefault();
  }

  function incrementCount(query) {
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

  function getRunsPerHour(currentHour) {
    var invocationsPerHour = [
          94, 87, 89, 83, 90, 89, 89, 103,
          105, 112, 103, 109, 121, 122, 100, 98,
          97, 102, 120, 136, 133, 122, 123, 103];
    var speedfactor = Math.min(maxSpeedFactor, parseInt($('#speedfactor option:selected').val(), 10));
    var baseValue = invocationsPerHour[Math.abs(currentHour) % 24] * speedfactor;
    var gaussian = new Gaussian(baseValue, 0.1 * baseValue);
    return Math.floor(gaussian.next());
    //return invocationsPerHour[Math.abs(currentHour) % 24];
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

  function errorHandler(resolve, fail) {
    return function(jqXHR, textStatus, errorThrown) {
      incrementCount('#errorcount');
      resolve({});
    };
  }

  function successHandler (resolve, fail) {
    return function (data, textStatus, jqXHR) {
      incrementCount('#requestcount');
      $( "#response" ).html("<pre>" +
                            jqXHR.status + " " + jqXHR.statusText + "\n" +
                            jqXHR.getAllResponseHeaders() + "\n" +
                            jqXHR.responseText +
                            "</pre>");
      resolve({});
    };
  }


  function invokeOne(linkUrl, method, payload, headers) {
    return new Promise(function(resolve, fail) {
      var options = {
            url : linkUrl,
            type: method,
            headers: headers,
            success: successHandler(resolve, fail),
            error: errorHandler(resolve, fail)
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
    var val = Math.floor(millisecondsRemaining / 1000) ;
    if (val > 0) {
      $('#status').html('wake in ' + val + 's');
    }
  }

  function invokeOneBatch() {
    if (runState !== 1) { return 0; }
    var startTime = new Date();
    $('#status').html('sending batch...');
    var linkUrl = $('#endpoint').val().trim();
    var method = $('#method option:selected').val().toLowerCase();
    var payload = $('#txt-payload').val();
    var headers = [];
    var $container = $('#headers');
    $container.find('.one-header').each(function(ix, element){
      var name = $(this).find('.http-header-name').val();
      var value = $(this).find('.http-header-value').val();
      headers[name] = value;
    });
    var batchsize = Math.min(maxBatchSize, parseInt($('#batchsize option:selected').val(), 10));

    // initialize array of N promises
    const promises = Array.apply(null, Array(batchsize))
      .map((x, i) => invokeOne(linkUrl, method, payload, headers));

    Promise.all(promises).then(function(resultValues) {
      if (runState == 1) {
        sleepTimer = new CountdownTimer(getSleepTimeInMs(startTime))
          .onTick(sleepTick)
          .onExpired(invokeOneBatch)
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
      setTimeout(invokeOneBatch, 2);
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
    if (state !== 'running') {
      var $c = $('#requestcount');
      $c.html('0');
      $c = $('#errorcount');
      $c.html('0');
    }
    $( "#response" ).html("");
    $( "#option-tabs" ).tabs('select', 0);
    if (event)
      event.preventDefault();
  }

  function populateFormFieldsFromLocalStorage() {
    Object.keys(model)
      .forEach(function(key) {
        var value = window.localStorage.getItem(html5AppId + '.model.' + key);
        if (value && value !== '') {
          var $item = $('#' + key);
          if (typeof model[key] != 'string') {
            // the value is a set of values concatenated by +
            // and the type of form field is select.
            value.split('+').forEach(function(part){
              $item.find("option[value='"+part+"']").prop("selected", "selected");
            });
          }
          else {
            // value is a simple string, form field type is input.
            $item.val(value);
          }
        }
      });
  }

  function addOneHeader (event) {
    var $container = $('#headers');
    $container.find('button.remove-header').unbind('click'); // unbind click handlers
    $( "#add-header" ).before(oneHeaderLine);
    $container.find('button.remove-header').click(removeHeader); // query again
    if (event)
      event.preventDefault();
  }

  function removeHeader(event) {
    var $source = $(this);
    $source.parent().remove();
    if (event)
      event.preventDefault();
  }

  function initDropdowns() {
    initDropdown("#batchsize", maxBatchSize);
    initDropdown("#speedfactor", maxSpeedFactor);
  }

  function initDropdown(query, N) {
    var $dropdown = $(query);
    const values = Array.apply(null, Array(N)).map((x, i) => (N - i));
    $.each(values, function(ix, value) {
      // <option value="1" >1</option>
      $dropdown.append($("<option />").val(value).text(value));
    });
  }

  $(document).ready(function() {
    initDropdowns();
    // $( "form input[type='text']" ).change(onInputChanged);
    $( "#option-tabs" ).tabs({ active: 0 });
    $( "#option-tabs" ).tabs( "option", "disabled", [ 1 ] ); // initially
    $( "form input[type='url']" ).change(onInputChanged);
    $( "form select" ).change(onSelectChanged);
    $( "#add-header" ).click(addOneHeader);
    $( "form #startstop" ).click(updateRunState);
    $( "form #reset" ).click(resetPage);
    populateFormFieldsFromLocalStorage();
  });

}());
