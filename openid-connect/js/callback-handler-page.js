// callback-handler-page.js
// ------------------------------------------------------------------
//
// for callback-handler.html
//
// created: Thu Oct  1 13:37:31 2015
// last saved: <2019-September-24 18:05:32>
/* jshint esversion: 9 */
/* global $, atob */

function randomId() {
  return Math.random().toString(36).substring(2, 15);
}

function decodeToken(matches) {
  if (matches.length == 4) {
    var styles = ['header','payload','signature'];
    var $decodeddiv = $('#id_token-decoded');
    // skip header and signature
    matches.slice(1,-1).forEach(function(item,index){
      let json = atob(item),
          obj = JSON.parse(json),
          id = 'pre-' + randomId();
      $decodeddiv.append('<div><pre id="'+id+'" class="jwt-'+ styles[index] +'">' +
                         JSON.stringify(obj,null,2) +
                         '</pre>' +
                         copyButtonHtml(id) +
                         '</div>'
                        );
    });

    // re-add click handlers to all btn-copy
    $( '.btn-copy' ).off('click').on('click', copyToClipboard);

  }
}

function formatIdToken() {
  let $$ = $( '#id_token-value div.cb-value' ),
      text = $$.text(),
      re1 = new RegExp('^([^\\.]+)\\.([^\\.]+)\\.([^\\.]+)$');
  if (text) {
    decodeToken(re1.exec(text));
    text = text.replace(re1, '<span class="jwt-header">$1</span>.<span class="jwt-payload">$2</span>.<span class="jwt-signature">$3</span');
    $$.html(text);
  }
}

function copyButtonHtml(targetElementId) {
  let html = '<button type="button" title="copy to clipboard" class="btn btn-outline-secondary btn-sm btn-copy" ' +
    'data-target="'+targetElementId+'" title="copy to clipboard">\n' +
    '  <span class="oi oi-clipboard"></span>' +
    '</button>\n';
  return html;
}

function copyToClipboard(event) {
  let $elt = $(this),
      sourceElement = $elt.data('target'),
      // grab the element to copy
      $source = $('#' + sourceElement),
      // Create a temporary hidden textarea.
      $temp = $("<textarea>"),
      textToCopy = ($source[0].tagName == 'TEXTAREA') ? $source.val() : $source.text();

  $("body").append($temp);
  $temp.val(textToCopy).select();
  document.execCommand("copy");
  $temp.remove();
}

$(document).ready(function() {
  let search = window.location.hash,
      hash = {},
      fnStartsWith = function(s, searchString, position) {
        position = position || 0;
        return s.lastIndexOf(searchString, position) === position;
      };

  if ( ! search || search === '') {
    search = window.location.search.replace('?', '');
  }

  search.split('&').forEach(function(item){
    let e = item.split('=');
    if (e[0] && e[0] !== '') {
      if (fnStartsWith(e[0], '#')) { e[0] = e[0].substring(1); }
      hash[e[0]] = decodeURIComponent(e[1]);
    }
  });

  // emit that information into fields in the output:
  var $$ = $('#output');
  $$.empty();

  Object.keys(hash).forEach(function(key){
    if (key) {
      let $newdiv = $("<div id='"+ key +"-value' class='cb-element cb-clearfix'/>"),
          valueId = 'val-' + randomId(),
          html = {
            label : '<div class="cb-label">' + key + copyButtonHtml(valueId) +'</div>',
            value : '<div id="' + valueId + '"class="cb-value">' + hash[key] + '</div>'
          };
      $newdiv.html(html.label + html.value);
      $$.append($newdiv);
      if (key == 'id_token') {
        $newdiv.append("<div id='id_token-decoded' class='jwt-decoded'/>");
      }
    }
  });

  $( '.btn-copy' ).on('click', copyToClipboard);

  setTimeout(formatIdToken, 2100);

});
