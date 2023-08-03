# Chaos in Harmony - 4k intro

![Screenshot](https://github.com/Cadiac/heiluri/blob/main/entry/screenshot.png)

First released at Assembly Summer 2023.

Tools: JavaScript, WebGL, [Shader Minifier](http://www.ctrl-alt-test.fr), [UglifyJS](https://github.com/mishoo/UglifyJS), [demolishedCompressor](https://github.com/MagnusThor/demolishedcompressor)

## How to run:

Open harmony.html in Chrome or Safari in fullscreen mode with the CORS-security settings disabled.

On windows, for example:

```
"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --disable-web-security --user-data-dir=[some directory]
```

Or host the file locally, for instance with a minimal python3 server

```
$ python3 -m http.server
```

and open http://localhost:8000/harmony.html on the browser. This bypasses the need for CORS-security settings override.

Click to start the demo. It should automatically enter full screen mode and start after 2 second delay, and exit it once the demo is complete.
