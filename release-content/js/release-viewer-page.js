// release-viewer-page.js
// ------------------------------------------------------------------
//
// page logic for release-content.html
//
// created: Thu Oct  1 13:37:31 2015
// last saved: <2016-January-27 19:34:25>

var baseUrl = 'https://deecee-test.apigee.net/release-content';
var re1 = new RegExp('^\\[[A-Z]{2,6}-[1-9][0-9]{1,5}\\] *');
var re2 = new RegExp('^[-\\|] *');
var re3 = new RegExp('desc-([a-zA-Z]+-[0-9]+)');

function fillDetails(ix, elt) {
  var $elt = $(elt);
  var id = re3.exec($elt.attr('id'))[1].trim().toUpperCase();
  var settings = {
        type: 'GET',
        url: baseUrl + '/jira/' + id,
        dataType: 'json',
        cache: 'false'
      };
  var jqxhr = $.ajax(settings)
    .done(function() {
      var o = jqxhr.responseJSON; // parsed object
      $($elt).html(o.fields.summary);
    });
}

function initTable(id) {
  $('#' + id).remove(); // clear any existing table
  var $output = $('#output');
  $output.html(''); // empty any elaborations around that table that were injected by DataTable
  var $rtable = $('<table id="' + id + '" class="display" cellspacing="0" width="100%" ' +
              'style="display:none;">' +
              '<thead><tr><th>id</th><th>description</th><th>commits</th></tr></thead>' +
              '<tfoot><tr><th>id</th><th>description</th><th>commits</th></tr></tfoot>' +
              '</table>');
  // insert a new empty table
  $output.append($rtable);
}


function fetchContent(event) {
  if (event) { event.preventDefault(); }
  var tableId = 'rtable';
  var release = $('#release').val().trim();
  var component = $('#component').val().trim();
  var settings = {
        type: 'GET',
        url: baseUrl + '/' + component + '/' + release + '?_=' +  generateRandomString(12, 8),
        dataType: 'json',
        cache: 'false'
      };

  initTable(tableId);
  var jqxhr = $.ajax(settings)
    .done(function() {
      var a = jqxhr.responseJSON; // parsed object
      var $table = $('#' + tableId);
      $table.DataTable( {
        data: transformResponse(a),
        columns: [
          { data: 'id', className: 'dt-collapse' },
          { data: 'description', className: 'dt-widen' },
          { data: 'commits', className: 'dt-widen' }
        ]
      } );
      $table.css('display', '');

      // now lazily fill the descriptions:
      $('div.item-description').each(fillDetails);
      $table.on( 'length.dt', pageRefresh);
      $table.on( 'page.dt', pageRefresh);
      $table.on( 'search.dt', pageRefresh);
    })
    .fail(function() {
      alert( "error fetching content: " + jqxhr.statusCode() + ' ' + jqxhr.statusText);
    })
    .always(function() {
      // alert( "complete" );
    });
}

function pageRefresh() {
  setTimeout( function() {
    var $items = $('div.item-description');
    $items.each(fillDetails);
  }, 350);
}

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
      description: '<div class="item-description" id="desc-' + item.id.toLowerCase() + '">'+
        '<img src="img/pending.gif"/>' +
        '</div>',
      commits: formatDescription(item.commits)
    };
  });
}

function generateRandomString(maxlen, minlen) {
  function c() {
    var m = Math.floor(Math.random() * 26),
        a = (Math.floor(Math.random() * 2) * 32);
    return String.fromCharCode(65 + m + a);
  }
  function getRandomInRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  var L = Math.floor(Math.random() * 7) + 8,
  actualLen,
  i,
  word = '';
  maxlen = maxlen || L;
  if (maxlen <=0) { maxlen = L;}
  if (maxlen > 1024) { maxlen = L;}
  minlen = minlen || maxlen;
  actualLen = getRandomInRange(minlen, maxlen);
  for (i=0; i<actualLen; i++) {
    word += c();
  }
  return word;
}


$(document).ready(function() {
    $( "#submit" ).on('click', fetchContent);
});
