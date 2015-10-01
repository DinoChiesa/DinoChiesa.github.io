// callback-handler-page.js
// ------------------------------------------------------------------
//
// for callback-handler.html
//
// created: Thu Oct  1 13:37:31 2015
// last saved: <2015-October-01 15:11:33>


$(document).ready(function() {
  var search = window.location.hash,
      hash = {};

  if ( ! search || search === '') {
    search = window.location.search.replace('?', '');
  }

  search.split('&').forEach(function(item){
    var e = item.split('=');
    if (e[0] && e[0] !== '') {
      hash[e[0]] = decodeURIComponent(e[1]);
    }
  });

  // emit that information into fields in the output:
  var $$ = $('#output');
  $$.empty();

  Object.keys(hash).forEach(function(key){
    if (key) {
    var $newdiv = $( "<div id='"+ key +"-value' class='cb-element'/>" );
    $newdiv.html('<div class="cb-label">' + key + ':</div><div class="cb-value">' + hash[key] + '</div>');
    $$.append($newdiv);
    }
  });

});
