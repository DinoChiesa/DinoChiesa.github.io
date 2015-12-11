// request-builder-page.js
// ------------------------------------------------------------------
//
// page logic for request-builder.html
//
// created: Thu Oct  1 13:37:31 2015
// last saved: <2015-December-10 18:20:47>

// for localstorage
var html5AppId = "C1C25FDA-7820-43D0-A5CB-BFE5659698E9";

var model = {
      edgeorg : '',
      edgeenv : '',
      keyId : '',
      secretkey : '',
      basepath : '',
      algorithm : '',
      rpath : '',
      qstring : '', 
      headers : []
    }, 
    defaultValues = {
      edgeorg : 'ap-parityapi',
      edgeenv : 'stage',
      keyId : 'fbGaI0AinHi4GOUeOWGP0a7yUDGr3nn8',
      secretkey : '3puLIK8V8kmKK9fu',
      basepath : 'httpsig-java-dev',
      algorithm : 'hmac-sha256',
      rpath : '/hmac-t1',
      qstring : 'greeting=whatsup', 
      headers : []
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
    var value = window.localStorage.getItem(html5AppId + '.model.' + key), 
        $item = $('#' + key);
    if ( !value || value === '') {
      // apply a default
      value = defaultValues[key];
    }
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

function getRequestTarget(){
  var uri = new URI($('#requestlink').text()), 
      path = uri.path(), 
      query = uri.query();
  if (query && query !== '') {
    return path + '?' + query;
  }
  return path;
}

function generateRandomString(L) {
  var c = function() {
        var m = Math.floor(Math.random() * 26),
            a = (Math.floor(Math.random() * 2) * 32);
        return String.fromCharCode(65 + m + a);
      }, i, pw = '';
  L = Math.floor(Math.random() * (L || 7)) + 8;
  for (i=0; i<L; i++) { pw += c(); }
  return pw;
}

function sendSignedRequest() {
  var headers = {};
  var url = $('#requestlink').text();
  var $request = $( "<div id='tab-request'/>" );
  var funcTable = {        
        'x-date': function(){ return (new Date()).valueOf();}, 
        // 'x-date': function(){ 
        //   // ex:  Fri, 17 Jul 2015 17:55:56 GMT 
        //   return UtcDateFormat.format(new Date(), '%w, %d %n %y %H:%M:%S GMT');
        // }, 
        'user-agent': function() {return navigator.userAgent;}, 
        'app-specific-header': function() { return generateRandomString(12) +'-' + generateRandomString(28); }, 
        '(request-target)': function() {return 'get ' + getRequestTarget();}
      };

  model.headers.forEach(function(n) {
    n = n.toLowerCase();
    if (funcTable[n]) {
      headers[n] = funcTable[n]();
    }
  });

  $.ajax({
    type: 'GET', 
    url: url, 
    beforeSend: function (request) {
      headers.authorization = 'Signature ' + computeHttpSignature(headers);
      Object.keys(headers).forEach(function(headername) {
        // skip headers we do not need to set.
        if (headername != 'user-agent' && headername != '(request-target)') { 
          request.setRequestHeader(headername, headers[headername]);
        }
        var $newdiv = $( "<div id='req-"+ headername +"-value' class='msg-element'/>" );
        $newdiv.html('<div class="msg-label">' + headername + ':</div><div class="msg-value">' + headers[headername] + '</div>');
        $request.append($newdiv);
      });
    },
    processData: false,
    complete: function(msg) {
      var $$ = $('<div title="Request complete"/>'), 
          $response = $( "<div id='tab-response'/>" );
      $$.empty();
      $$.append($request);
      msg.getAllResponseHeaders().split('\n').forEach(function(hdr){
        if (hdr){hdr = hdr.trim();}
        if (hdr) {
          var pair = hdr.split(':').map(function(item){return item.trim();});
          var $newdiv = $( "<div id='resp-"+ pair[0] +"-value' class='msg-element'/>" );
          $newdiv.html('<div class="msg-label">' + pair[0] + ':</div><div class="msg-value">' + pair[1] + '</div>');
          $response.append($newdiv);
        }
      });

      var $newdiv = $( "<div id='resp-text-value' class='msg-element'/>" );
      $newdiv.html('<div class="msg-label">body:</div><div class="msg-value"><pre>' + msg.responseText + '</pre></div>');
      $response.append($newdiv);

      $$.append($response);

      $$.find('>div').tabs();
      $$.dialog({
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
