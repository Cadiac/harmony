const demolished = require("demolishedcompressor");

const html =
  '<body style="background:#000" onclick="run()"><p style="color:#fff">Click!</p>';

demolished.Compressor.Pngify("src/demo.min.js", "entry/harmony.html", html);
