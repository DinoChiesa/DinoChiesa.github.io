// load-generator-page.js
// ------------------------------------------------------------------

(function (){
  'use strict';
  var model = model || {
        method : '',
        endpoint : '',
      };
  var oneHourInMs = 60 * 60 * 1000;
  var minSleepTimeInMs = 20;
  var html5AppId = html5AppId || "67B53CD3-AD0A-4D58-8DE7-997EBC7B3ED1";   // for localstorage
  var runState = 0;
  var timeoutId = null;
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
          188, 174, 179, 166, 181, 178, 179, 207,
          210, 224, 207, 219, 242, 244, 200, 196,
          194, 204, 241, 273, 266, 245, 246, 207];
    var speedFactor = Math.min(6, parseInt($('#speed option:selected').val(), 10));
    var baseValue = invocationsPerHour[Math.abs(currentHour) % 24] * Math.pow(2, speedFactor);
    var gaussian = new Gaussian(baseValue, 0.1 * baseValue);
    return Math.floor(gaussian.next());
  }

  function getSleepTime(startOfMostRecentRequest) {
    var now = new Date(),
        currentHour = now.getHours(),
        runsPerHour = getRunsPerHour(currentHour),
        durationOfLastRun = now - startOfMostRecentRequest,
        sleepTimeInMs = (oneHourInMs / runsPerHour) - durationOfLastRun;
    if (sleepTimeInMs < minSleepTimeInMs) { sleepTimeInMs = minSleepTimeInMs; }
    //sleepTimeInMs += gaussian.next();
    sleepTimeInMs = Math.floor(sleepTimeInMs);
    $('#status').html(//'runs per hour('+ runsPerHour +') ' +
      'sleep ' + sleepTimeInMs + 'ms, wake at: ' +
        new Date(now.valueOf() + sleepTimeInMs).toString().substr(16, 8) );
    return sleepTimeInMs;
  }

  function invokeOneCall() {
    if (runState !== 1) { return 0; }
    $('#status').html('sending...');
    var linkUrl = $('#endpoint').val().trim();
    var method = $('#method option:selected').val().toLowerCase();
    var startTime = new Date();
    var options = {
          url : linkUrl,
          type: method,
          headers: { },
          success: function(data, textStatus, jqXHR) {
            incrementCount('#requestcount');
            $( "#response" ).html("<pre>" +
                                  jqXHR.status + " " + jqXHR.statusText + "\n" +
                                  jqXHR.getAllResponseHeaders() + "\n" +
                                  jqXHR.responseText +
                                  "</pre>");
            if (runState == 1) {
              timeoutId = window.setTimeout(invokeOneCall, getSleepTime(startTime));
            }
          },
          error: function (jqXHR, textStatus, errorThrown) {
            incrementCount('#errorcount');
            if (runState == 1) {
              timeoutId = window.setTimeout(invokeOneCall, getSleepTime(startTime));
            }
          }
        };

    if (method !== 'get') {
      options.data = $('#txt-payload').val();
    }

    var $container = $('#headers');
    $container.find('.one-header').each(function(ix, element){
      var name = $(this).find('.http-header-name').val();
      var value = $(this).find('.http-header-value').val();
      options.headers[name] = value;
    });

    // NB: This call may fail if the server does not include CORS headers in the response
    //console.log(method + ' ' + linkUrl);
    $.ajax(options);
  }

  function updateRunState(event) {
    var $ss = $('#startstop');
    var $r = $('#reset');
    var state = $ss.attr('data_state');
    if (state == 'running') {
      runState = 0;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
        $('#status').html('stopped.');
      }
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
      timeoutId = setTimeout(invokeOneCall, 2);
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

  $(document).ready(function() {
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
