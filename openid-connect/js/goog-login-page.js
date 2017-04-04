// aad-login-page.js
// ------------------------------------------------------------------
//
// page logic for aad-login.html
//
// created: Thu Oct  1 13:37:31 2015
// last saved: <2017-March-06 17:29:59>


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

$(document).ready(function() {
  $('.rtype-chosen').chosen({
    no_results_text: "No matching response types...",
    allow_single_deselect: true
  });
  $('.scope-chosen').chosen({
    no_results_text: "No matching scopes...",
    allow_single_deselect: true
  });


  $( "form input[type='text']" ).change(onInputChanged);
  $( "form select" ).change(onSelectChanged);
  $( "form button" ).submit(updateModel);

  updateModel();

});
