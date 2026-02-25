'use strict';

// Shim for zlibjs using Node.js built-in zlib.
// zlibjs is only used in tesseract.js's browser worker (browser/gunzip.js).
// In Node.js CI environments the browser code path is never executed,
// but npm still needs to resolve the package.
const zlib = require('zlib');

module.exports = {
  gunzipSync: (data) => zlib.gunzipSync(Buffer.from(data)),
  inflateRawSync: (data) => zlib.inflateRawSync(Buffer.from(data)),
  inflateSync: (data) => zlib.inflateSync(Buffer.from(data)),
  deflateSync: (data) => zlib.deflateSync(Buffer.from(data)),
  deflateRawSync: (data) => zlib.deflateRawSync(Buffer.from(data)),
  gzipSync: (data) => zlib.gzipSync(Buffer.from(data)),
};
