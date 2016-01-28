// release-viewer-page.js
// ------------------------------------------------------------------
//
// page logic for release-content.html
//
// created: Thu Oct  1 13:37:31 2015
// last saved: <2016-January-27 15:58:58>

var baseUrl = 'https://deecee-test.apigee.net/release-content';
var re1 = new RegExp('^\\[[A-Z]{2,6}-[1-9][0-9]{2,5}\\] *');
var re2 = new RegExp('^[-\\|] *');

function linkify(id) {
  return 'https://apigeesc.atlassian.net/browse/' + id;
}

function smartTrim(s) {
  return s
    .trim()
    .replace(re1, '')
    .replace(re2, '');
}

function formatDescription(commits) {
  var d = '<ul>';
  commits.forEach(function(c){
    d += '<li>' + smartTrim(c.description) + '</li>\n';
  });
  d += '<ul>';
  return d;
}

function transformResponse (a) {
  return a.map(function(item){
    return {
      id: '<a href="'+ linkify(item.id) + '">' +item.id + '</a>',
      commits: formatDescription(item.commits)
    };
  });
}



// function fetchContent(event) {
//   if (event) { event.preventDefault(); }
//   var release = $('#release').val().trim();
//
//   $('#rtable').DataTable( {
//         "ajax": {
//           url: baseUrl + '/' + release,
//           dataSrc: dataTransformFunction
//         },
//         "columns": [
//             { "data": "id" },
//             { "data": "commits" }
//         ]
//     } );
// }


function fetchContent(event) {
  if (event) { event.preventDefault(); }
  var release = $('#release').val().trim();
  var settings = {
        type: 'GET',
        url: baseUrl + '/' + release,
        dataType: 'json',
        cache: 'true'
      };

  var jqxhr = $.ajax(settings)
    .done(function() {
      var a = jqxhr.responseJSON; // parsed object
      $('#rtable').DataTable( {
        data: transformResponse(a),
        columns: [
          { data: "id", className: 'dt-collapse' },
          { data: "commits", className: 'dt-widen' }
        ]
      } );
      $('#rtable').css('display', '');
    })
    .fail(function() {
      alert( "error fetching content: " + jqxhr.statusCode() + ' ' + jqxhr.statusText);
    })
    .always(function() {
      // alert( "complete" );
    });



}



// function rowAppender($div) {
//   var n = 0;
//   return function (item){
//     n++;
//     var $newdiv = $( "<div class='rel-item'/>" );
//     $newdiv.html(n + '. <a href="'+ linkify(item.id) + '">' +item.id + '</a>' +
//                  formatDescription(item.commits));
//     $div.append($newdiv);
//   };
// }

// function fetchContent(event) {
//   if (event) { event.preventDefault(); }
//   var release = $('#release').val().trim();
//
//   var settings = {
//         type: 'GET',
//         url: baseUrl + '/' + release,
//         dataType: 'json',
//         cache: 'true'
//       };
//
//   var $list = $('<div></div>');
//   // Assign handlers immediately after making the request,
//   // and remember the jqXHR object for this request
//   var jqxhr = $.ajax(settings)
//     .done(function() {
//       var a = jqxhr.responseJSON; // parsed object
//       a.forEach(rowAppender($list));
//       $('#output').append($list);
//       $('#myTable').DataTable();
//     })
//     .fail(function() {
//       alert( "error fetching content: " + jqxhr.statusCode() + ' ' + jqxhr.statusText);
//     })
//     .always(function() {
//       // alert( "complete" );
//     });
//
//   // jqxhr has these properties:
//   //   readyState
//   //   status
//   //   statusText
//   //   responseXML and/or responseText and/or responseJSON
//   //   setRequestHeader(name, value)
//   //   getAllResponseHeaders()
//   //   getResponseHeader(name)
//   //   statusCode()
// }


$(document).ready(function() {
    $( "#submit" ).on('click', fetchContent);
});
