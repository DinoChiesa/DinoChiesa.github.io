// callback-handler-page.js
// ------------------------------------------------------------------
//
// for callback-handler.html
//
// created: Thu Oct  1 13:37:31 2015
// last saved: <2015-October-01 14:56:30>


$(document).ready(function() {
  var search = window.location.hash,
      params = search.split('&'),
      hash = {};
  params.forEach(function(item){
    var e = item.split('=');
    if (e[0] && e[0] !== '') {
      hash[e[0]] = e[1];
    }
  });

  // emit that information into fields in the output:
  var $$ = $('#output');
  $$.empty();

  Object.keys(hash).forEach(function(key){
    if (key) {
    var $newdiv = $( "<div id='"+ key +"-value' class='cb-element'/>" );
    $newdiv.html(key + ':&nbsp;' + hash[key]);
    $$.append($newdiv);
    }
  });

});
