// request-builder-page.js
// ------------------------------------------------------------------
//
// page logic for request-builder.html
//
// created: Thu Oct  1 13:37:31 2015
// last saved: <2015-December-10 17:11:44>

// for localstorage
var html5AppId = "C1C25FDA-7820-43D0-A5CB-BFE5659698E9";

var model = {
      edgeorg : '',
      edgeenv : '',
      keyId : '',
      secretkey : '',
      basepath : '',
      algorithm : '',
      headers : [],
      rpath : [],
      path : '',
      qstring : ''
    };

function updateLink() {
  var linkTemplate = "https://${edgeorg}-${edgeenv}.apigee.net/${basepath}${rpath}",
      link = linkTemplate;

  Object.keys(model).forEach(function(key) {
    var pattern = "${" + key + "}", value = '';
    if (model[key]) {
     value = (typeof model[key] != 'string') ? model[key].join('+') : model[key];
      // set into local storage
      if (value) {
        //console.log('setting into LS: ' + key + '= ' + value);
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

var UtcDateFormat = {
      mthNames : ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], 
      dayNames : ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"], 
      zeroPad : function(number) {
        return ("0"+number).substr(-2,2);
      }, 

      dateMarkers : {
        d:['getUTCDate',function(v) { return UtcDateFormat.zeroPad(v);}],
        m:['getUTCMonth',function(v) { return UtcDateFormat.zeroPad(v+1);}],
        n:['getUTCMonth',function(v) { return UtcDateFormat.mthNames[v]; }],
        w:['getUTCDay',function(v) { return UtcDateFormat.dayNames[v]; }],
        y:['getUTCFullYear'],
        H:['getUTCHours',function(v) { return UtcDateFormat.zeroPad(v);}],
        M:['getUTCMinutes',function(v) { return UtcDateFormat.zeroPad(v);}],
        S:['getUTCSeconds',function(v) { return UtcDateFormat.zeroPad(v);}],
        i:['toISOString']
      }, 

      format : function(date, formatString) {
        var dateTxt = formatString.replace(/%(.)/g, function(m, p) {
              var rv = date[(UtcDateFormat.dateMarkers[p])[0]]();
              if ( UtcDateFormat.dateMarkers[p][1] ) {rv = UtcDateFormat.dateMarkers[p][1](rv);}
              return rv;
            });

        return dateTxt;
      }
    };


function computeHttpSignature(headers) {
  var template = 'keyId="${keyId}",algorithm="${algorithm}",headers="${headers}",signature="${signature}"', 
      sig = template;

  // compute sig here
  var signingBase = '';
  Object.keys(headers).forEach(function(h){
    if (signingBase !== '') { signingBase += '\n'; }
    signingBase += h + ": " + headers[h];
  });

  var hashf = (function() {
      switch (model.algorithm) {
        case 'hmac-sha1': return CryptoJS.HmacSHA1;
        case 'hmac-sha256': return CryptoJS.HmacSHA256;
        case 'hmac-sha512': return CryptoJS.HmacSHA512;
        default : return null;
      }
    }());

  var hash = hashf(signingBase, model.secretkey);
  var signatureOptions = {
        keyId : model.keyId, 
        algorithm: model.algorithm,
        headers: Object.keys(headers), 
        signature : CryptoJS.enc.Base64.stringify(hash) 
      };

  // build sig string here
  Object.keys(signatureOptions).forEach(function(key) {
    var pattern = "${" + key + "}", 
        value = (typeof signatureOptions[key] != 'string') ? signatureOptions[key].join(' ') : signatureOptions[key];
    sig = sig.replace(pattern, value);
  });

  return sig;
}

function getTargetRequest(){
  var uri = new URI($('#requestlink').text()), 
      path = uri.path(), 
      query = uri.query();
  if (query && query !== '') {
    return path + '?' + query;
  }
  return path;
}

function sendSignedRequest() {
  var headers = {};
  var url = $('#requestlink').text();
  var $request = $( "<div id='tab-request'/>" );

  model.headers.forEach(function(n) {
    switch(n) { 
      case 'date':
        // ex:  Fri, 17 Jul 2015 17:55:56 GMT 
        headers.date = UtcDateFormat.format(new Date(), '%w, %d %n %y %H:%M:%S GMT');
        break;
      case 'user-agent': 
        headers['user-agent'] = navigator.userAgent;
        break;
      case '(request-target)': 
        headers['(request-target)'] = 'get ' + getTargetRequest();
        break;
    }
  });

  $.ajax({
    type: 'GET', 
    url: url, 
    beforeSend: function (request) {
      Object.keys(headers).forEach(function(headername) {
        // skip headers we do not need to set.
        if (headername != 'user-agent' && headername != '(request-target)') { 
          request.setRequestHeader(headername, headers[headername]);
        }
        var $newdiv = $( "<div id='req-"+ headername +"-value' class='msg-element'/>" );
        $newdiv.html('<div class="msg-label">' + headername + ':</div><div class="msg-value">' + headers[headername] + '</div>');
        $request.append($newdiv);
      });
      var sig = computeHttpSignature(headers);
      request.setRequestHeader('Authorization', 'Signature ' + sig);
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
