function play() {
  // create an AudioContext object
  const audioContext = new AudioContext();
  const analyser = audioContext.createAnalyser();
  analyser.connect(audioContext.destination);
  // analyser.fftSize = 128;
  analyser.smoothingTimeConstant = 0.75;

  // Make a audio node
  const audio = new Audio();
  audio.loop = true;
  audio.autoplay = true;

  // this line is only needed if the music you are trying to play is on a
  // different server than the page trying to play it.
  // It asks the server for permission to use the music. If the server says "no"
  // then you will not be able to play the music
  // Note if you are using music from the same domain
  // **YOU MUST REMOVE THIS LINE** or your server must give permission.
  audio.crossOrigin = "anonymous";
  audio.addEventListener("canplay", handleCanplay);

  // audio.src =
  //   "https://twgljs.org/examples/sounds/DOCTOR%20VOX%20-%20Level%20Up.mp3";
  // audio.load();

  function handleCanplay() {
    // connect the audio element to the analyser node and the analyser node
    // to the main Web Audio context
    const source = audioContext.createMediaElementSource(audio);
    source.connect(analyser);
  }

  return analyser;
}

async function run() {
  const vs = `attribute vec2 p;void main(){gl_Position=vec4(p,0,1);}`;
  const res = await fetch("/fragment.glsl");
  const fs = await res.text();

  const programs = [];

  let gl, mCanvas, mWidth, mHeight;

  let fft;
  let analyser;
  let texture;
  let lastRenderTime = performance.now();

  const LENGTH_1 = 5.0,
    LENGTH_2 = 2.0,
    MASS_1 = 1.0,
    MASS_2 = 5.0,
    G = 9.81,
    DAMPING = 0.1;

  let pendulum = {
    angle1: Math.PI * 1.0,
    angularVelocity1: 0.0,
    angle2: Math.PI * 0.5,
    angularVelocity2: 0.0,
  };

  const VERTEX_SHADER = 0x8b31,
    FRAGMENT_SHADER = 0x8b30,
    ARRAY_BUFFER = 0x8892,
    STATIC_DRAW = 0x88e4,
    COLOR_BUFFER_BIT = 0x4000,
    TRIANGLE_STRIP = 5,
    FLOAT = 0x1406;

  // Based on math here:
  // https://diego.assencio.com/?index=1500c66ae7ab27bb0106467c68feebc6
  function lagrange(angle1, angle2, angularVelocity1, angularVelocity2) {
    let a1 =
      (LENGTH_2 / LENGTH_1) *
      (MASS_2 / (MASS_1 + MASS_2)) *
      Math.cos(angle1 - angle2);
    let a2 = (LENGTH_1 / LENGTH_2) * Math.cos(angle1 - angle2);

    let f1 =
      -(LENGTH_2 / LENGTH_1) *
        (MASS_2 / (MASS_1 + MASS_2)) *
        Math.pow(angularVelocity2, 2) *
        Math.sin(angle1 - angle2) -
      (G / LENGTH_1) * Math.sin(angle1);
    let f2 =
      (LENGTH_1 / LENGTH_2) *
        Math.pow(angularVelocity1, 2) *
        Math.sin(angle1 - angle2) -
      (G / LENGTH_2) * Math.sin(angle2);

    let g1 = (f1 - a1 * f2) / (1.0 - a1 * a2) - DAMPING * angularVelocity1;
    let g2 = (f2 - a2 * f1) / (1.0 - a1 * a2) - DAMPING * angularVelocity2;

    return [angularVelocity1, angularVelocity2, g1, g2];
  }

  function update(pendulum, dt) {
    const { angle1, angle2, angularVelocity1, angularVelocity2 } = pendulum;

    // Runga-Kutta method
    let k1 = lagrange(angle1, angle2, angularVelocity1, angularVelocity2);
    let k2 = lagrange(
      angle1 + (dt * k1[0]) / 2.0,
      angle2 + (dt * k1[1]) / 2.0,
      angularVelocity1 + (dt * k1[2]) / 2.0,
      angularVelocity2 + (dt * k1[3]) / 2.0
    );
    let k3 = lagrange(
      angle1 + (dt * k2[0]) / 2.0,
      angle2 + (dt * k2[1]) / 2.0,
      angularVelocity1 + (dt * k2[2]) / 2.0,
      angularVelocity2 + (dt * k2[3]) / 2.0
    );
    let k4 = lagrange(
      angle1 + dt * k3[0],
      angle2 + dt * k3[1],
      angularVelocity1 + dt * k3[2],
      angularVelocity2 + dt * k3[3]
    );

    return {
      angle1:
        pendulum.angle1 +
        (dt * (k1[0] + 2.0 * k2[0] + 2.0 * k3[0] + k4[0])) / 6.0,
      angle2:
        pendulum.angle2 +
        (dt * (k1[1] + 2.0 * k2[1] + 2.0 * k3[1] + k4[1])) / 6.0,
      angularVelocity1:
        angularVelocity1 +
        (dt * (k1[2] + 2.0 * k2[2] + 2.0 * k3[2] + k4[2])) / 6.0,
      angularVelocity2:
        angularVelocity2 +
        (dt * (k1[3] + 2.0 * k2[3] + 2.0 * k3[3] + k4[3])) / 6.0,
    };
  }

  function position(pendulum) {
    return {
      pos1: {
        x: Math.sin(pendulum.angle1) * LENGTH_1,
        y: -Math.cos(pendulum.angle1) * LENGTH_1,
      },
      pos2: {
        x:
          Math.sin(pendulum.angle1) * LENGTH_1 +
          Math.sin(pendulum.angle2) * LENGTH_2,
        y:
          -Math.cos(pendulum.angle1) * LENGTH_1 -
          Math.cos(pendulum.angle2) * LENGTH_2,
      },
    };
  }

  function render() {
    const now = performance.now();
    const dt = (now - lastRenderTime) / 1000;
    lastRenderTime = now;

    pendulum = update(pendulum, dt);
    const { pos1, pos2 } = position(pendulum);

    try {
      const width = window.innerWidth,
        height = window.innerHeight;

      if (width != mWidth || height != mHeight) {
        mCanvas.width = width;
        mCanvas.height = height;
        gl.viewport(0, 0, width, height);
        mWidth = width;
        mHeight = height;
      }

      gl.clearColor(0, 0, 0, 1);
      gl.clear(COLOR_BUFFER_BIT);

      const program = programs[0];
      gl.useProgram(program);

      gl.uniform1f(gl.getUniformLocation(program, "u_time"), now);
      gl.uniform2f(
        gl.getUniformLocation(program, "u_resolution"),
        width,
        height
      );

      gl.uniform2f(gl.getUniformLocation(program, "u_p1"), pos1.x, pos1.y);
      gl.uniform2f(gl.getUniformLocation(program, "u_p2"), pos2.x, pos2.y);
      gl.uniform1f(
        gl.getUniformLocation(program, "u_r1"),
        0.2 * Math.pow(MASS_1, 0.333)
      );
      gl.uniform1f(
        gl.getUniformLocation(program, "u_r2"),
        0.2 * Math.pow(MASS_2, 0.333)
      );

      // FFT
      analyser.getByteFrequencyData(fft);

      // upload the audio data to the texture
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0, // level
        gl.LUMINANCE, // internal format
        analyser.frequencyBinCount, // width
        1, // height
        0, // border
        gl.LUMINANCE, // format
        gl.UNSIGNED_BYTE, // type
        fft
      );

      // bind the texture to texture unit 0
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);

      // Draw
      gl.drawArrays(TRIANGLE_STRIP, 0, 4);

      window.requestAnimationFrame(render);
    } catch (err) {
      console.log(err);
      alert("Error: " + err.message);
    }
  }

  (function setup() {
    try {
      mCanvas = document.createElement("canvas");
      document.body.appendChild(mCanvas);
      const s = mCanvas.style;
      s.position = "fixed";
      s.left = s.top = 0;

      gl = mCanvas.getContext("experimental-webgl");
      if (!gl) {
        alert("WebGL is required");
        return;
      }

      const program = gl.createProgram();
      programs[0] = program;

      let shader = gl.createShader(VERTEX_SHADER);
      gl.shaderSource(shader, vs);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert("Vertex shader: " + gl.getShaderInfoLog(shader));
      }
      gl.attachShader(program, shader);

      shader = gl.createShader(FRAGMENT_SHADER);
      gl.shaderSource(shader, fs);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert("Fragment shader: " + gl.getShaderInfoLog(shader));
      }
      gl.attachShader(program, shader);

      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        alert("Link program: " + gl.getProgramInfoLog(program));
      }

      const vertices = [1, 1, 1, -1, -1, 1, -1, -1];

      gl.bindBuffer(ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(ARRAY_BUFFER, new Float32Array(vertices), STATIC_DRAW);

      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, FLOAT, false, 0, 0);

      analyser = play();
      fft = new Uint8Array(analyser.frequencyBinCount);

      texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      window.requestAnimationFrame(render);
    } catch (err) {
      console.error(err);
      alert("Error: " + err.message);
    }
  })();
}
