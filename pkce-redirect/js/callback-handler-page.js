// callback-handler-page.js
// ------------------------------------------------------------------
//
// for callback-handler.html
//
// created: Thu Oct  1 13:37:31 2015
// last saved: <2019-October-01 17:50:23>
/* jshint esversion:9, node:false, strict:implied */
/* global $, atob, window, setTimeout */

function decodeToken(matches) {
  if (matches.length == 4) {
    let styles = ['header','payload','signature'],
        $decodeddiv = $('#id_token-decoded');
    matches.slice(1,-1).forEach(function(item,index){
      let obj = JSON.parse(atob(item));
      $decodeddiv.append('<pre class="jwt-'+ styles[index] +'">' +
                         JSON.stringify(obj,null,2) +
                         '</pre>');
    });
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
  let $$ = $('#output');
  $$.empty();

  Object.keys(hash).forEach(function(key){
    if (key) {
      let $newdiv = $("<div id='"+ key +"-value' class='cb-element'/>");
      $newdiv.addClass("cb-clearfix");
      $newdiv.html('<div class="cb-label">' + key + ':</div><div class="cb-value">' + hash[key] + '</div>');
      $$.append($newdiv);
      if (key == 'id_token') {
        $newdiv.append("<div id='id_token-decoded' class='jwt-decoded'/>");
      }
    }
  });

  setTimeout(formatIdToken, 2600);

});
