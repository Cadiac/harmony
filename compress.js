const demolished = require("demolishedcompressor");

const html =
  '<body style="background:#000" onclick="run()"><p style="color:#fff;height:100vh">Click!</p>';

demolished.Compressor.Pngify("demo.min.js", "demo.png.html", html);
