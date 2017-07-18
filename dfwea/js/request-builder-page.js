// request-builder-page.js
// ------------------------------------------------------------------
//
// created: Thu Oct  1 13:37:31 2015
// last saved: <2017-July-17 20:21:54>


var model = model || {
       edgeorg : '',
       edgeenv : '',
       basepath : '',
       clientid : '',
       clientsecret : '',
       user : '',
       password : '',
       nonce : '',
       rtype : []
     };

// for localstorage
var html5AppId = html5AppId || "787EBEFA-D14D-4D16-9BAE-8B1560C4A885";
var urlTemplate = urlTemplate || "http://${edgeorg}-${edgeenv}.apigee.net${basepath}/token";
var curlCommandTemplate = 'curl -i -u ${clientid}:${clientsecret} -X POST -H content-type:application/x-www-form-urlencoded ' +
    urlTemplate + " " + ' -d \'grant_type=password&username=${user}&password=${password}&nonce=${nonce}&response_type=${rtype}\'';

function wrapInSingleQuote(s) {return "'" + s + "'";}

function fillTemplate(template) {
  var s = template;
  Object.keys(model)
    .forEach(function(key) {
      var pattern = "${" + key + "}", value = '';
      if (model[key]) {
        value = (typeof model[key] != 'string') ? model[key].join(' ') : model[key];
        if (value) {
          //console.log('setting into LS: ' + key + '= ' + value);
          window.localStorage.setItem(html5AppId + '.model.' + key, value);
        }
      }
      s = s.replace(pattern,value);
    });
  return s;
}

function updateCurlCommand() {
  var v = fillTemplate(curlCommandTemplate);
  $('#requestCurl').text(v);
}

function onInputChanged() {
  var $$ = $(this), name = $$.attr('id'), value = $$.val();
  model[name] = value;
  updateCurlCommand();
}

function onSelectChanged() {
  var $$ = $(this), name = $$.attr('name'), values = [];
  $$.find("option:selected" ).each(function() {
    values.push($( this ).text());
  });
  model[name] = values;
  updateCurlCommand();
}

function updateModel(event) {
  Object.keys(model).forEach(function(key) {
    var $item = $('#' + key), value = $item.val();
    model[key] = value;
  });
  updateCurlCommand();
  if (event)
    event.preventDefault();
}

function resetRequest(event) {
  $('#tokenResult').html('');
  $('#decodedToken').html('');
  updateModel();
  if (event)
    event.preventDefault();
}

function invokeTokenRequest(event) {
  var url = fillTemplate(urlTemplate);
  var payload = {
        grant_type: 'password',
        username: model.user,
        password: model.password,
        response_type: model.rtype.join(" "),
        nonce : model.nonce
      };
  $('#tokenResult').html('');
  $('#decodedToken').html('');
  // NB: This call will fail if the server does not include CORS headers in the response
  $.ajax({
    url : url,
    type: "POST",
    headers: { 'Authorization': 'Basic ' + btoa( model.clientid + ':' + model.clientsecret ) },
    data : payload,
    dataType: "json",
    success: function(data, textStatus, jqXHR) {
      //data - response from server
      $('#tokenResult')
        .removeClass('error')
        .html('<pre class="access-token-response">' +
              JSON.stringify(data, null, 2) +
              '</pre>');
      if (data.id_token) {
        setTimeout(function(){formatIdToken(data.id_token);}, 2600);
      }
    },
    error: function (jqXHR, textStatus, errorThrown) {
      $('#tokenResult')
        .addClass('error')
        .html('<pre class="access-token-response">' +
              JSON.stringify(jqXHR.responseJSON || "error", null, 2) +
              '</pre>');
    }
  });

  if (event)
    event.preventDefault();
}


function populateFormFields() {
  // get values from local storage, and place into the form
  Object.keys(model)
    .forEach(function(key) {
    var value = window.localStorage.getItem(html5AppId + '.model.' + key);
    if (value && value !== '') {
      var $item = $('#' + key);
      if (typeof model[key] != 'string') {
        // the value is a set of values concatenated by space
        // and the type of form field is select.
        $item.val(null);
        value.split(' ').forEach(function(part){
          //$item.find("option[value='"+part+"']").prop("selected", "selected");
          $item.val(part);
          //$item.trigger("chosen:updated");
        });
        $item.trigger("chosen:updated");
      }
      else {
        // value is a simple string, form field type is input.
        $item.val(value);
      }
    }
  });
}


function decodeToken(matches) {
  if (matches.length == 4) {
    var styles = ['header','payload','signature'];
    var $decodeddiv = $('#decodedToken');
    matches.slice(1,-1).forEach(function(item,index){
      var json = atob(item);
      var obj = JSON.parse(json);
      $decodeddiv.append('<pre class="jwt-'+ styles[index] +'">' +
                         JSON.stringify(obj,null,2) +
                         '</pre>');
    });
  }
}

function formatIdToken(idToken) {
  var $$ = $( '#decodedToken' ),
      re1 = new RegExp('^([^\\.]+)\\.([^\\.]+)\\.([^\\.]+)$');
  if (idToken) {
    decodeToken(re1.exec(idToken));
  }
}


$(document).ready(function() {
  $('.rtype-chosen').chosen({
    no_results_text: "No matching response types...",
    allow_single_deselect: true
  });

  $( "form input[type='text']" ).change(onInputChanged);
  $( "form select" ).change(onSelectChanged);
  $( "form button" ).submit(updateModel);

  $( "#invokeTokenRequest" ).click(invokeTokenRequest);
  $( "#resetRequest" ).click(resetRequest);

  populateFormFields();

  if (typeof Clipboard != 'undefined') {
    // attach clipboard things
    new Clipboard('.clipboard-btn');
  }

  updateModel();

});
