// request-builder-page.js
// ------------------------------------------------------------------
//
// page logic for request-builder.html
//
// created: Thu Oct  1 13:37:31 2015
// last saved: <2015-December-10 15:44:49>

var model = {
      edgeorg : '',
      edgeenv : '',
      clientid : '',
      secretkey : '',
      basepath : '',
      algorithm : '',
      headers : [],
      rpath : [],
      path : '',
      qstring : ''
    };

// for localstorage
var html5AppId = "C1C25FDA-7820-43D0-A5CB-BFE5659698E9";

function updateLink() {
  var linkTemplate = "https://${edgeorg}-${edgeenv}.apigee.net/${basepath}${rpath}",
      link = linkTemplate;

  Object.keys(model).forEach(function(key) {
    var pattern = "${" + key + "}", value = '';
    if (model[key]) {
     value = (typeof model[key] != 'string') ? model[key].join('+') : model[key];
      // set into local storage
      if (value) {
        console.log('setting into LS: ' + key + '= ' + value);
        window.localStorage.setItem(html5AppId + '.model.' + key, value);
      }
    }
    link = link.replace(pattern,value);
  });
  if (model.qstring) {
    link += '?' + model.qstring;
  }
  link = link.replace('??', '?');
  link = link.replace('apigee.net//', 'apigee.net/');
  $('#requestlink').text(link);
  $('#requestlink').attr('href', link);
}


function onInputChanged() {
  var $$ = $(this), name = $$.attr('id'), value = $$.val();
  model[name] = value;
  updateLink();
}

function onSelectChanged() {
  var $$ = $(this), name = $$.attr('name'), values = [];
  $$.find("option:selected" ).each(function() {
    values.push($( this ).text());
  });
  model[name] = values;
  updateLink();
}

function updateModel(event) {
  Object.keys(model).forEach(function(key) {
    var $item = $('#' + key), value = $item.val();
    model[key] = value;
  });
  updateLink();

  if (event)
    event.preventDefault();
}

function populateFormFields() {
  // get values from local storage, and place into the form
  Object.keys(model).forEach(function(key) {
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

var DateFormat = {
      mthNames : ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], 
      dayNames : ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"], 
      zeroPad : function(number) {
        return ("0"+number).substr(-2,2);
      }, 

      dateMarkers : {
        d:['getDate',function(v) { return DateFormat.zeroPad(v);}],
        m:['getMonth',function(v) { return DateFormat.zeroPad(v+1);}],
        n:['getMonth',function(v) { return DateFormat.mthNames[v]; }],
        w:['getDay',function(v) { return DateFormat.dayNames[v]; }],
        y:['getFullYear'],
        H:['getHours',function(v) { return DateFormat.zeroPad(v);}],
        M:['getMinutes',function(v) { return DateFormat.zeroPad(v);}],
        S:['getSeconds',function(v) { return DateFormat.zeroPad(v);}],
        i:['toISOString']
      }, 

      format : function(date, formatString) {
        var dateTxt = formatString.replace(/%(.)/g, function(m, p) {
              var rv = date[(DateFormat.dateMarkers[p])[0]]();
              if ( DateFormat.dateMarkers[p][1] ) {rv = DateFormat.dateMarkers[p][1](rv);}
              return rv;
            });

        return dateTxt;
      }
    };


function computeHttpSignature(request) {
  var template = 'keyId="${keyId}",algorithm="${algorithm}",headers="${headers}",signature="${signature}"', 
      sig = template;
  ['keyId', 'algorithm', 'headers'].forEach(function(key) {
    var pattern = "${" + key + "}", 
        value = (typeof model[key] != 'string') ? model[key].join(' ') : model[key];
    sig = sig.replace(pattern, value);
  });

  // compute sig here
  return sig;
}

function sendSignedRequest() {
  var headers = {
        // ex:  Fri, 17 Jul 2015 17:55:56 GMT 
        date : DateFormat.format(new Date.UTC(), '%w, %d %n %y %H:%M:%S GMT'), 
      };
  var $request = $( "<div id='tab-request'/>" );

  $.ajax({
    type:"GET",
    url: $('#requestlink').text(), 
    headers: headers, 
    beforeSend: function (request) {
      var sig = computeHttpSignature(request);
      request.setRequestHeader('Authorization', 'Signature ' + sig);
      var key = 'buffalo';
      var $newdiv = $( "<div id='req-"+ key +"-value' class='msg-element'/>" );
      $newdiv.html('<div class="msg-label">' + key + ':</div><div class="msg-value">' + request[key] + '</div>');
      $request.append($newdiv);
    },
    //data: "json=" + escape(JSON.stringify(createRequestObject)),
    processData: false,
    success: function(msg) {
      var //$$ = $('#output'), 
      $$ = $('<div title="Request complete"/>'), 
          $response = $( "<div id='tab-response'/>" );
      $$.empty();
      $$.append($request);
      Object.keys(msg).forEach(function(key){
        if (key) {
          var $newdiv = $( "<div id='resp-"+ key +"-value' class='msg-element'/>" );
          $newdiv.html('<div class="msg-label">' + key + ':</div><div class="msg-value">' + msg[key] + '</div>');
          $response.append($newdiv);
        }
      });
      $$.append($response);

      $newdiv.find('>div').tabs();
      $newdiv.dialog({
            modal: true,
            width: 'auto',
            buttons: {
                Ok: function() { $( this ).dialog( "close" ); }
            }
      });

    }
  });  
}

$(document).ready(function() {
   $('.headers-chosen').chosen({
     no_results_text: "invalid header list...",
        allow_single_deselect: true
     });

  $( "form input[type='text']" ).change(onInputChanged);
  $( "form select" ).change(onSelectChanged);

  populateFormFields();

  $( "#sendRequest" ).click(sendSignedRequest);

  updateModel();

});
