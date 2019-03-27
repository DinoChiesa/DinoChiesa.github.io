/* jshint esversion: 8 */
/* global window */

(function (){
  /*
   * JavaScript base32 / base32hex encoder and decoder
   */

  /*
   * input: 5 times 8-bit characters: 11111111 00000000 11111111 00000000 11111111
   * base32: 8 times 5-bit indexes  : 11111 11100 00000 01111 11110 00000 00111 11111
   */

  var b32c = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";   // base32 dictionary
  var b32h = "0123456789ABCDEFGHIJKLMNOPQRSTUV";   // base32hex dictionary
  var b32pad = '=';

  /* base32_encode_data
   * Internal helper to encode data to base32 using specified dictionary.
   */
  function base32_encode_data(data, len, b32x, wantPadding) {
    var dst = "";
    var i;

    for (i = 0; i <= len - 5; i += 5) {
      dst += b32x[data.charCodeAt(i) >>> 3]
      dst += b32x[((data.charCodeAt(i) & 0x07) << 2) | (data.charCodeAt(i+1) >>> 6)]
      dst += b32x[(data.charCodeAt(i+1) & 0x3E) >>> 1]
      dst += b32x[((data.charCodeAt(i+1) & 0x01) << 4) | (data.charCodeAt(i+2) >>> 4)]
      dst += b32x[((data.charCodeAt(i+2) & 0x0F) << 1) | (data.charCodeAt(i+3) >>> 7)]
      dst += b32x[(data.charCodeAt(i+3) & 0x7C) >>> 2]
      dst += b32x[((data.charCodeAt(i+3) & 0x03) << 3) | ((data.charCodeAt(i+4) & 0xE0) >>> 5)]
      dst += b32x[data.charCodeAt(i+4) & 0x1F];
    }

    if (len % 5 == 4) {
      dst += b32x[data.charCodeAt(i) >>> 3]
      dst += b32x[((data.charCodeAt(i) & 0x07) << 2) | (data.charCodeAt(i+1) >>> 6)]
      dst += b32x[(data.charCodeAt(i+1) & 0x3E) >>> 1]
      dst += b32x[((data.charCodeAt(i+1) & 0x01) << 4) | (data.charCodeAt(i+2) >>> 4)]
      dst += b32x[((data.charCodeAt(i+2) & 0x0F) << 1) | (data.charCodeAt(i+3) >>> 7)]
      dst += b32x[(data.charCodeAt(i+3) & 0x7C) >>> 2]
      dst += b32x[(data.charCodeAt(i+3) & 0x03) << 3]
      if (wantPadding) {
        dst += b32pad;
      }
    }
    else if (len % 5 == 3)
    {
      dst += b32x[data.charCodeAt(i) >>> 3]
      dst += b32x[((data.charCodeAt(i) & 0x07) << 2) | (data.charCodeAt(i+1) >>> 6)]
      dst += b32x[(data.charCodeAt(i+1) & 0x3E) >>> 1]
      dst += b32x[((data.charCodeAt(i+1) & 0x01) << 4) | (data.charCodeAt(i+2) >>> 4)]
      dst += b32x[(data.charCodeAt(i+2) & 0x0F) << 1]
      if (wantPadding) {
        dst += b32pad;
        dst += b32pad;
        dst += b32pad;
      }
    }
    else if (len % 5 == 2)
    {
      dst += b32x[data.charCodeAt(i) >>> 3]
      dst += b32x[((data.charCodeAt(i) & 0x07) << 2) | (data.charCodeAt(i+1) >>> 6)]
      dst += b32x[(data.charCodeAt(i+1) & 0x3E) >>> 1]
      dst += b32x[(data.charCodeAt(i+1) & 0x01) << 4]
      if (wantPadding) {
      dst += b32pad
      dst += b32pad
      dst += b32pad
        dst += b32pad
      }
    }
    else if (len % 5 == 1)
    {
      dst += b32x[data.charCodeAt(i) >>> 3]
      dst += b32x[((data.charCodeAt(i) & 7) << 2)]
      if (wantPadding) {
      dst += b32pad
      dst += b32pad
      dst += b32pad
      dst += b32pad
      dst += b32pad
        dst += b32pad
      }
    }

    return dst;
  }

  /* base32_encode
   * Encode a JavaScript string to base32.
   * Specified string is first converted from JavaScript UCS-2 to UTF-8.
   */
  function encode(str) {
    var utf8str = unescape(encodeURIComponent(str))
    return base32_encode_data(utf8str, utf8str.length, b32c, false);
  }

  /* base32hex_encode
   * Encode a JavaScript string to base32hex.
   * Specified string is first converted from JavaScript UCS-2 to UTF-8.
   */
  function base32hex_encode(str) {
    var utf8str = unescape(encodeURIComponent(str))
    return base32_encode_data(utf8str, utf8str.length, b32h)
  }

  /* base32_decode_data
   * Internal helper to decode data from base32 using specified dictionary.
   */
  function base32_decode_data(data, len, b32x) {
    var dst = ""
    var i, a, b, c, d, e, f, g, h;

    for (i = 0; i < data.length - 7; i += 8) {
      a = b32x.indexOf(data[i+0]);
      b = b32x.indexOf(data[i+1]);
      c = b32x.indexOf(data[i+2]);
      d = b32x.indexOf(data[i+3]);
      e = b32x.indexOf(data[i+4]);
      f = b32x.indexOf(data[i+5]);
      g = b32x.indexOf(data[i+6]);
      h = b32x.indexOf(data[i+7]);

      dst += String.fromCharCode((a << 3) | (b >>> 2));
      if (data[i+3] != b32pad)
        dst += String.fromCharCode(((b << 6) & 0xC0) | (c << 1) | ((d >>> 4) & 0x01))
      if (data[i+4] != b32pad)
        dst += String.fromCharCode(((d << 4) & 0xF0) | (e >>> 1))
      if (data[i+6] != b32pad)
        dst += String.fromCharCode(((e << 7) & 0x80) | (f << 2) | (g >>> 3))
      if (data[i+7] != b32pad)
        dst += String.fromCharCode(((g << 5) & 0xE0) | h);
    }

    return dst;
  }

  /* base32_decode
   * Decode a base32 string to a JavaScript string.
   * Input is assumed to be a base32 encoded UTF-8 string.
   * Returned result is a JavaScript (UCS-2) string.
   */
  function decode(str) {
    var strUp = str.toUpperCase()
    var utf8str = base32_decode_data(strUp, strUp.length, b32c)
    return decodeURIComponent(escape(utf8str))
  }

  /* base32hex_decode
   * Decode a base32hex string to a JavaScript string.
   * Input is assumed to be a base32hex encoded UTF-8 string.
   * Returned result is a JavaScript (UCS-2) string.
   */
  function base32hex_decode(str) {
    var strUp = str.toUpperCase()
    var utf8str = base32_decode_data(strUp, strUp.length, b32h)
    return decodeURIComponent(escape(utf8str))
  }

  /* base32_sniff
   * Check whether specified base32 string contains base32 specific characters (as opposed to base32hex).
   * Return true if specified string is base32 encoded, false if undetermined.
   */
  function base32_sniff(base32) {
    base32 = base32.toUpperCase()
    if (base32.indexOf("W") >= 0) return true
    if (base32.indexOf("X") >= 0) return true
    if (base32.indexOf("Y") >= 0) return true
    if (base32.indexOf("Z") >= 0) return true
    return false
  }

  /* base32hex_sniff
   * Check whether specified base32 string contains base32hex specific characters.
   * Return true if specified string is base32hex encoded, false if undetermined.
   */
  function base32hex_sniff(base32) {
    if (base32.indexOf("0") >= 0) return true
    if (base32.indexOf("1") >= 0) return true
    if (base32.indexOf("8") >= 0) return true
    if (base32.indexOf("9") >= 0) return true
    return false
  }

  if (typeof window !== 'undefined') {
    window.base32 = { rfc4648: {decode, encode} };
  }

}());
