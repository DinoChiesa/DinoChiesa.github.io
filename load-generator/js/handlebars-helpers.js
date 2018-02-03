// handlebars-helpers.js
// ------------------------------------------------------------------
//
// created: Fri Feb  2 15:36:32 2018
// last saved: <2018-February-02 16:46:22>

(function (){
  'use strict';

  if (Handlebars) {

    let helpers = {};
    let rStringChars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

    // helpers.base64 = function(s) {
    //   if (typeof s !== 'string') {
    //     throw new Error('expected s to be an string');
    //   }
    //   var a = window.btoa(s);
    //   return a;
    // };

    helpers.httpbasicauth = function(u, p) {
      if (typeof u !== 'string') {
        throw new Error('expected u to be an string');
      }
      if (typeof p !== 'string') {
        throw new Error('expected p to be an string');
      }
      var a = window.btoa(u + ':' + p);
      return 'Basic ' + a;
    };

    //helpers.concat = (...args) => args.slice(0, -1).join('');

    helpers.random = function(min, max) {
      if (!isNumber(min)) {
        throw new Error('expected minimum to be a number');
      }
      if (!isNumber(max)) {
        throw new Error('expected maximum to be a number');
      }
      return utils.random(min, max);
    };

    helpers.randomItem = function(a){
      if ( ! Array.isArray(a)) {
        throw new Error('expected a to be an array');
      }
      var L = a.length;
      var s = a[Math.floor((Math.random() * L))];
      return s;
    };

    helpers.randomString = function(length) {
      var i, result = '';
      length = length || Math.ceil((Math.random() * 28)) + 12;
      length = Math.abs(Math.min(length, 1024));
      for (i = length; i > 0; --i) {
        result += rStringChars[Math.round(Math.random() * (rStringChars.length - 1))];
      }
      return result;
    };

    helpers.weightedRandomSelect = function(aa) {
      // select a random value
      var i, L;
      var totalWeight = 0;
      var weightThreshold = [];

      // initialize
      for (i = 0, L = aa.length; i<L; i++) {
        totalWeight += Math.abs(aa[i][1]);
        weightThreshold[i] = totalWeight;
      }

      // select a number
      var R = Math.floor(Math.random() * totalWeight);

      // now find the bucket that R value falls into.
      for (i = 0; i < L; i++) {
        if (R < weightThreshold[i]) {
          return aa[i][0];
        }
      }
      return aa[L - 1][0];
    };

    // now register them all
    Object.keys(helpers).forEach( (key) => Handlebars.registerHelper(key, helpers[key]) );
  }


}());
