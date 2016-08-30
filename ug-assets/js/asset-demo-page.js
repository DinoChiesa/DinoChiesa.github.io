// asset-demo-page.js
// ------------------------------------------------------------------
//
// Description goes here....
//
// created: Tue Aug 30 10:28:33 2016
// last saved: <2016-August-30 12:41:31>

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

  function createAsset(client, done) {
    var asset = new Usergrid.Asset({
          client: client,
          data: {
            name: filename,
            owner: user.get("uuid"),
            path: filepath
          }
        }, function(e, response, asset) {
          if(err){
            assert(false, err);
          }
          done(asset);
        });
  }

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

  function uploadAsset(event) {
    event.preventDefault();
    var userUuid = $( "#userselect option:selected" )[0].value;
    var selectedFiles = $('#file1')[0].files;
    if (selectedFiles[0] && selectedFiles[0].name) {
      var c = getClient();
      new Usergrid.Asset({
        client: c,
        data: { name: selectedFiles[0].name,
                owner: userUuid,
                path: '/assets'
              }
      }, function(e, response, asset) {
        if(e){
          alert('while creating asset: ' + e);
          return;
        }
        asset.upload(selectedFiles[0], function(e, response, asset) {
          if(e){
            alert('while uploading asset: ' + e);
          }
          else {
            alert('uploaded asset.');
          }
        });

      });

      // I could not get the following to work properly.
      // 500 error, with this payload:
      // {
      //   "error":"web_application",
      //   "timestamp":1472585023491,
      //   "duration":0,
      //   "exception":"javax.ws.rs.WebApplicationException"
      // }
      //
      // c.getEntity({ type: 'user', uuid: userUuid}, function(e, response, userEntity) {
      //   if ( e) {
      //     alert('error: ' + e);
      //     return;
      //   }
      //   userEntity.attachAsset(selectedFiles[0], function(e, xhr, entity) {
      //     if (e) {
      //       alert('while attaching asset: ' + e);
      //     }
      //     else {
      //       alert ('the asset has been attached');
      //     }
      //   });
      // });

    }
    else {
      alert('select a file before clicking UPLOAD');
    }
  }

  function updateFile(event) {
    $('#selectedfile').html($('#file1')[0].value );
  }

  $(document).ready(function() {
    $('.user-chosen').chosen();
    //$('.user-chosen').on('chosen:showing_dropdown', retrieveUsers);

    $('#ugorg').keyup( $.debounce( 850, resetUsers ) );
    $('#ugapp').keyup( $.debounce( 850, resetUsers ) );

    // $("#ugorg").on('change', clearUsers);
    // $("#ugapp").on('change', clearUsers);
    $("#btnSelectFile").click(selectFile);
    $('#file1').change(updateFile);
    $("#btnSubmit").click(uploadAsset);

    populateFormFields();
    updateModel();
    resetUsers(null);

  });


}());
