// load-generator-page.js
// ------------------------------------------------------------------


(function (){
  'use strict';
  var model = model || {
        method : '',
        endpoint : '',
      };
  var oneHourInMs = 60 * 60 * 1000;
  var minSleepTimeInMs = 60;
  var html5AppId = html5AppId || "67B53CD3-AD0A-4D58-8DE7-997EBC7B3ED1";   // for localstorage
  var runState = 0;
  var timeoutId = null;
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
    var $$ = $(this), name = $$.attr('name'), values = [];
    $$.find("option:selected" ).each(function() {
      model[name] = $( this ).text();
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
                       'sleep(' + sleepTimeInMs + 'ms) ' +
                       'wake(' +  new Date(now.valueOf() + sleepTimeInMs).toString().substr(16, 8) + ')');
    return sleepTimeInMs;
  }

  function invokeOneCall() {
    if (runState !== 1) { return 0; }

    var linkUrl = $('#endpoint').val().trim();
    var method = $('#method option:selected').val();
    var startTime = new Date();
    var options = {
          url : linkUrl,
          type: method,
          headers: { },
          success: function(data, textStatus, jqXHR) {
            incrementCount('#requestcount');
            timeoutId = window.setTimeout(invokeOneCall, getSleepTime(startTime));
          },
          error: function (jqXHR, textStatus, errorThrown) {
            incrementCount('#errorcount');
            timeoutId = window.setTimeout(invokeOneCall, getSleepTime(startTime));
          }
        };

    if (method !== 'GET') {
      options.data = {
        something: 'abcdefg',
        whatever: model.method
      };
      options.headers['content-type'] = 'application/json';
    }

    // NB: This call will fail if the server does not include CORS headers in the response
    //console.log(method + ' ' + linkUrl);
    $.ajax(options);
  }

  function populateFormFields() {
    // get values from local storage, and place into the form
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

  function updateRunState(event) {
    var $ss = $('#startstop');
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
    }
    else {
      runState = 1;
      $('#status').html('running...');
      $ss.attr('data_state', 'running');
      timeoutId = setTimeout(invokeOneCall, 2);
      $ss.html('Stop');
      $ss.addClass('btn-danger');
      $ss.removeClass('btn-success');
    }
    if (event)
      event.preventDefault();
  }


  $(document).ready(function() {
    $( "form input[type='text']" ).change(onInputChanged);
    $( "form select" ).change(onSelectChanged);
    $( "form button" ).click(updateRunState);
    populateFormFields();
  });


}());
