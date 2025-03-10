// link-builder-page.js
// ------------------------------------------------------------------
/* jshint esversion: 8 */
/* global $, base32 */

var model = {
      baseurl : '',
      bcsize : '',
      label : '',
      secret : '',
      base32secret : '',
      issuer : ''
    };

const html5AppId = '5FADBB91-0C35-49F6-BE3F-220B632874C3'; // for localstorage

const linkTemplate = "${baseurl}?chs=${bcsize}&chld=M%7C0&cht=qr&chl=@@CHL@@";
//var chlTemplate = "otpauth://totp/${label}?secret=${base32secret}&issuer=${issuer}";
const chlTemplate = "otpauth://totp/${label}?secret=${base32secret}&issuer=${issuer}";

function wrapInSingleQuote(s) {return "'" + s + "'";}

function evalTemplate(template, model) {
  let s = template;
  Object.keys(model)
    .forEach(function(key) {
      var pattern = "${" + key + "}", value = model[key];
      if ((model[key]) && (value !== null) && (typeof value !== 'undefined')) {
        window.localStorage.setItem(html5AppId + '.model.' + key, value);
      }
      s = s.replace(pattern,value);
    });
  return s;
}

function updateLink() {
  let baselink = evalTemplate(linkTemplate, model);
  model.base32secret = base32.rfc4648.encode(model.secret);
  let chl = evalTemplate(chlTemplate, model);
  let link = baselink.replace('@@CHL@@', encodeURIComponent(chl));
  var extraneousDoubleSlashFinder = new RegExp('^(https?://[^/]+)//(.+)$');
  var m = extraneousDoubleSlashFinder.exec(link);
  if (m) { link = m[1] + '/' + m[2]; }

  $('#totplink').text(link);
  $('#totplink').attr('href', link);
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
  return key != 'base32secret'; // keep all
}

function populateFormFields() {
  // get values from local storage, and place into the form
  Object.keys(model)
    .filter(excludeTransientFields)
    .forEach(function(key) {
      var value = window.localStorage.getItem(html5AppId + '.model.' + key);
      var $item = $('#' + key);
      if ($item.length > 0 ) {
        if (value && value !== '') {
          if ($item[0].tagName === 'SELECT') {
            $item.find("option[value='"+value+"']").prop("selected", "selected");
            $item.trigger("chosen:updated");
          }
          else {
            // value is a simple string, form field type is input.
            $item.val(value);
          }
        }
      }
    });
}

function resetEverything(event) {
  $('#barcodeResult').html('');
  updateModel();
  if (event)
    event.preventDefault();
}

function showBarcode(event) {
  $('#barcodeResult').html('<img src="'+$('#totplink').attr('href') + '">');
  if (event)
    event.preventDefault();
}


$(document).ready(function() {
  $('.bcsize-chosen').chosen({
    disable_search: true,
    no_results_text: "No matching size...",
    allow_single_deselect: true
  });

  $( "form input[type='text']" ).change(onInputChanged);
  $( "form select" ).change(onSelectChanged);
  $( "form button" ).submit(updateModel);

  $( "#show-barcode" ).click(showBarcode);
  $( "#reset-everything" ).click(resetEverything);

  populateFormFields();

  updateModel();

});
