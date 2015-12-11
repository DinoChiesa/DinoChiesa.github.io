// request-builder-page.js
// ------------------------------------------------------------------
//
// page logic for request-builder.html
//
// created: Thu Oct  1 13:37:31 2015
// last saved: <2015-December-10 19:24:38>

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
      headers : 'X-Date+(request-target)'
    };

function updateLink() {
  var linkTemplate = "https://${edgeorg}-${edgeenv}.apigee.net/${basepath}${rpath}",
      link = linkTemplate;

  Object.keys(model).forEach(function(key) {
    var pattern = "${" + key + "}", value = '';
    if (model[key]) {
     value = (typeof model[key] != 'string') ? 
        model[key].filter(function(item){return item && item !== '';}).join('+') : 
        model[key];
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
    var val = $( this ).text();
    if (val && val !== '') {
      values.push(val);
    }
  });
  model[name] = values;
  updateLink();
}

function updateModel(event) {
  Object.keys(model).forEach(function(key) {
    var $item = $('#' + key), 
        value = $item.val();
    if (key == 'headers') {
      var values = [];
      $item.find("option:selected").each(function() {
        var val = $( this ).text();
        if (val && val !== '') { values.push(val); }
      });
      model[name] = values;
    }
    else {
      model[key] = value;
    }
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
      $item.find("option").prop('selected', false); // deselect all
      value.split('+').forEach(function(part){
        if (part && part !== '') {
          var option = $item.find("option[value='"+part.toLowerCase()+"']");
            option.prop("selected", true);
            option.change();
        }
      });
    }
    else {
      // value is a simple string, form field type is input.
      $item.val(value);
    }
  });
}


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
        // we use x-date because XHR cannot send a date header outbound
        'x-date': function(){ return (new Date()).valueOf();}, 
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
    complete: function(jqxhr, status) {
      var $$ = $('<div title="Request complete"/>'), 
          $response = $( "<div id='tab-response'/>" ), 
          stat = jqxhr.statusCode(), 
          $newdiv;
      $$.empty();
      $$.append($request);

      $newdiv = $( "<div id='resp-status-value' class='msg-element'/>" );
      $newdiv.html('<div class="msg-label">status:</div><div class="msg-value">' + 
                   stat.status + ' ' + stat.statusText + '</div>');
      $response.append($newdiv);

      jqxhr.getAllResponseHeaders().split('\n').forEach(function(hdr){
        if (hdr){hdr = hdr.trim();}
        if (hdr) {
          var pair = hdr.split(':').map(function(item){return item.trim();});
          $newdiv = $( "<div id='resp-"+ pair[0] +"-value' class='msg-element'/>" );
          $newdiv.html('<div class="msg-label">' + pair[0] + ':</div><div class="msg-value">' + pair[1] + '</div>');
          $response.append($newdiv);
        }
      });

      $newdiv = $( "<div id='resp-text-value' class='msg-element'/>" );
      $newdiv.html('<div class="msg-label">body:</div><div class="msg-value"><pre>' + 
                   jqxhr.responseText + '</pre></div>');
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
