// goog-login-page.js
// ------------------------------------------------------------------
//
// page logic for goog-login.html and oidc-login.html
//
// created: Thu Oct  1 13:37:31 2015
// last saved: <2017-April-19 08:11:57>

var model = {
      baseloginurl : '',
      clientid : '',
      cburi : '',
      state : '',
      nonce : '',
      rtype : [],
      scope : [],
      aud : ''
    };

var html5AppId = html5AppId || "B673CC48-1927-46CB-827A-E6E9D7D5103D";

function copyHash(obj) {
  var copy = {};
  if (null !== obj && typeof obj == "object") {
    Object.keys(obj).forEach(function(attr){
      copy[attr] = (Array.isArray(obj[attr])) ? obj[attr].slice() : obj[attr];
    });
  }
  return copy;
}

function updateLink() {
  var linkTemplate = "${baseloginurl}?client_id=${clientid}&redirect_uri=${cburi}&response_type=${rtype}&state=${state}&scope=${scope}&nonce=${nonce}";
  var copyModel = copyHash(model);
  if (copyModel.aud && copyModel.scope) {
    copyModel.scope.push('audience:server:client_id:' + copyModel.aud);
    delete copyModel.aud;
  }
  Object.keys(copyModel).forEach(function(key) {
    var pattern = "${" + key + "}", value = '';
    if (copyModel[key]) {
     value = (typeof copyModel[key] != 'string') ? copyModel[key].join('+') : copyModel[key];
      if (value) {
        console.log('setting into LS: ' + key + '= ' + value);
        window.localStorage.setItem(html5AppId + '.model.' + key, value);
      }
    }
    linkTemplate = linkTemplate.replace(pattern,value);
  });
  $('#authzlink').text(linkTemplate);
  $('#authzlink').attr('href', linkTemplate);
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


function excludeTransientFields(key) {
  return key != 'code'; // the only transient field, currently
}

function populateFormFields() {
  // get values from local storage, and place into the form
  Object.keys(model)
    //.filter(excludeTransientFields)
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

$(document).ready(function() {
  $('.rtype-chosen').chosen({
    no_results_text: "No matching response types...",
    allow_single_deselect: true
  });
  $('.scope-chosen').chosen({
    no_results_text: "No matching scopes...",
    allow_single_deselect: true
  });

  populateFormFields();

  $( "form input[type='text']" ).change(onInputChanged);
  $( "form select" ).change(onSelectChanged);
  $( "form button" ).submit(updateModel);

  updateModel();

});
