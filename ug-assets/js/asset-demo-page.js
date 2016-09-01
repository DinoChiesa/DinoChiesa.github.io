// asset-demo-page.js
// ------------------------------------------------------------------
//
// Demonstrate the use of the Usergrid SDK to upload assets.
//
// created: Tue Aug 30 10:28:33 2016
// last saved: <2016-August-31 17:20:41>

(function (){
  'use strict';

  // for localstorage
  var html5AppId = html5AppId || "FCF093C8-FFBF-4A8B-A238-F9BF25553D4B";
  var model = model || {
        ugorg : '',
        ugapp : ''
      };
  var client = null;

  function populateFormFields() {
    // get values from local storage, and place into the form
    Object.keys(model)
      .forEach(function(key) {
        var value = window.localStorage.getItem(html5AppId + '.model.' + key);
        if (value && value !== '') {
          var $item = $('#' + key);
          // value is a simple string, form field type is input.
          $item.val(value);
        }
      });
  }

  function storeValues() {
    Object.keys(model)
      .forEach(function(key) {
        var pattern = "${" + key + "}", value = '';
        if (model[key]) {
          value = model[key];
          // set into local storage
          if (value) {
            window.localStorage.setItem(html5AppId + '.model.' + key, value);
          }
        }
      });
  }

  function resetClient() { client = null;}
  function getClient() {
    if ( ! client) {
      client = new Usergrid.Client({
        orgName: model.ugorg,
        appName: model.ugapp,
        logging: false, //optional - turn on logging, off by default
        buildCurl: true //optional - turn on curl commands, off by default
      });
    }
    return client;
  }

  // function createAsset(client, done) {
  //   var asset = new Usergrid.Asset({
  //         client: client,
  //         data: {
  //           name: filename,
  //           owner: user.get("uuid"),
  //           path: filepath
  //         }
  //       }, function(e, response, asset) {
  //         if(err){
  //           assert(false, err);
  //         }
  //         done(asset);
  //       });
  // }

  function updateModel() {
    Object.keys(model).forEach(function(key) {
      var $item = $('#' + key), value = $item.val();
      model[key] = value;
    });
  }

  function resetUsers(event) {
    updateModel();
    resetClient();
    var $us = $('#userselect');
    $('#userselect option').remove();
    $us.append('<option value=""></option>');
    $us.trigger("chosen:updated");

    if (model.ugorg && model.ugapp) {
      var c = getClient();
      c.request({ method: 'GET', endpoint: 'users' },
                function(e, data) {
                  if (e) {
                    alert('error retrieving users:' + e);
                  }
                  else {
                    data.entities.forEach(function(entity) {
                      $us.append('<option value="'+ entity.uuid +'">'+
                                 entity.uuid + ' (' + entity.name +')</option>');
                    });
                    $us.trigger("chosen:updated");
                  }
                });
    }
  }

  function selectFile(event) {
    event.preventDefault();
    $('#file1').trigger('click');
  }

  function clearMessage() {
    $('#alertbanner').css("display","none");
  }

  function displayError(msg) {
    $('#alertbanner').css("display","block")
      .addClass('alert-danger')
      .removeClass('alert-info');
    $('#msgtag').html('Error:');
    $('#messagetext').html(msg);
  }

  function displayMessage(msg) {
    $('#alertbanner').css("display","block")
      .addClass('alert-info')
      .removeClass('alert-danger');
    $('#msgtag').html('Message:');
    $('#messagetext').html(msg);
  }

  function clearAnyExistingAsset(client, name, done) {
    client.request({ method: 'GET', endpoint: 'Assets' },
                   function(err, data) {
                     var assets = [];
                     if(data && data.entities && data.entities.length){
                       assets = data.entities.filter(function(asset) {
                         return asset.name === name;
                       });
                     }
                     if (assets.length) {
                       assets.forEach(function(asset) {
                         client.request({ method: 'DELETE', endpoint: 'assets/' + asset.uuid });
                       });
                     }
                     done(null, assets.length);
                   });
  }

  function uploadAsset(event) {
    event.preventDefault();
    storeValues();
    clearMessage();
    var userUuid = $( "#userselect option:selected" )[0].value;
    var selectedFiles = $('#file1')[0].files;
    if (selectedFiles[0] && selectedFiles[0].name) {
      var c = getClient();
      clearAnyExistingAsset(c, selectedFiles[0].name, function(e, count) {
        if (e) {
          displayError('cannot clear existing assets: ' + JSON.stringify(e.message));
          return;
        }
        if (count) {
          displayMessage('cleared '+ count +' asset(s).');
        }
        new Usergrid.Asset({
          client: c,
          data: { name: selectedFiles[0].name,
                  owner: userUuid,
                  path : '/images/' + Math.round(10000 * Math.random())
                }
        }, function(e, response, asset) {
          if(e){
            displayError('while creating asset: ' + JSON.stringify(e.message));
            return;
          }
          asset.upload(selectedFiles[0], function(e, xhr, window) {
            if(e){
              displayError('while uploading asset: ' + e);
            }
            else {
              displayMessage('uploaded asset.');
              if (xhr && xhr.responseURL) {
                $('#asseturl').val(xhr.responseURL);
                $('#img1').attr('src', xhr.responseURL);
              }
              else {
                displayMessage('no url to display.');
              }
            }
          });
        });
      });
    }
    else {
      displayError('select a file before clicking UPLOAD');
    }
  }

  // function downloadAsset(event) {
  //   event.preventDefault();
  //   clearMessage();
  //   storeValues();
  //   var assetUuid = $('#assetuuid').value();
  //   if (assetUuid) {
  //     new Usergrid.Asset({
  //       client: c,
  //       data: { name: assetUuid, path: '/assets' }
  //     }, function(e, response, asset) {
  //       if(e){
  //         alert('while creating asset: ' + e);
  //         return;
  //       }
  //       asset.download(function(e, response, asset) {
  //         if(e){
  //           displayError('while downloading asset: ' + e);
  //         }
  //         else {
  //           displayMessage('downloaded asset.');
  //         }
  //       });
  //     });
  //   }
  //   else {
  //     displayError('select a file before clicking DOWNLOAD');
  //   }
  // }

  function updateFile(event) {
    $('#selectedfile').html($('#file1')[0].value );
  }

  function resetImages(event) {
    event.preventDefault();
    clearMessage();
    $('#img1').attr('src', "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7");
    $('#asseturl').val('');
  }


  $(document).ready(function() {
    $('.user-chosen').chosen();

    // debounce changes in the ug org and app, before retrieving users
    $('#ugorg').keyup( $.debounce( 850, resetUsers ) );
    $('#ugapp').keyup( $.debounce( 850, resetUsers ) );

    $("#btnSelectFile").click(selectFile);
    $('#file1').change(updateFile);
    $("#btnUpload").click(uploadAsset);
    //$("#btnDownload").click(downloadAsset);
    $("#btnReset").click(resetImages);

    populateFormFields();
    updateModel();
    resetUsers(null);
  });


}());
