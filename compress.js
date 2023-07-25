const demolished = require("demolishedcompressor");

const html = '<body onclick="run()">';

demolished.Compressor.Pngify("demo.min.js", "demo.png.html", html);
