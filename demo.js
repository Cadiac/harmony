function createOscillator(audioContext, octave, detune, destination) {
  const oscillator = new OscillatorNode(audioContext);
  oscillator.type = "sawtooth";
  oscillator.frequency.value = 440 * Math.pow(2, octave - 4); // A
  oscillator.detune.value = detune;

  const gainNode = new GainNode(audioContext);
  gainNode.gain.value = 0.5;

  // OSC -> Gain -> Destination
  oscillator.connect(gainNode);
  gainNode.connect(destination);

  // A C F G
  const f = [440, 523.25, 349.23, 392.0];
  for (let i = 0; i < 100; i++) {
    oscillator.frequency.setValueAtTime(
      f[i % 4] * Math.pow(2, octave - 4),
      audioContext.currentTime + i * 2
    );
  }

  oscillator.start();

  return {
    osc: oscillator,
    gain: gainNode,
    octave,
  };
}

function createModulator(audioContext, destinations, enabled, type) {
  const lfo = audioContext.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 5;
  lfo.start();

  const noise = noiseGenerator(audioContext);
  noise.start();

  const gainNode = audioContext.createGain();
  gainNode.gain.value = 5;

  // OSC -> Gain -> Destination.frequency
  if (enabled) {
    if (type === "lfo") {
      lfo.connect(gainNode);
    } else {
      noise.connect(gainNode);
    }
  }

  destinations.forEach((destination) => gainNode.connect(destination));

  return {
    enabled,
    type,
    lfo,
    noise,
    gain: gainNode,
  };
}

function noiseGenerator(audioContext) {
  const bufferSize = audioContext.sampleRate * 2; // 2 seconds of audio
  const buffer = audioContext.createBuffer(
    1,
    bufferSize,
    audioContext.sampleRate
  );

  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    channelData[i] = Math.random() * 2 - 1;
  }

  const noiseGeneratorNode = audioContext.createBufferSource();
  noiseGeneratorNode.buffer = buffer;
  noiseGeneratorNode.loop = true;

  return noiseGeneratorNode;
}

function createWhiteNoise(audioContext, destinations) {
  const noiseGeneratorNode = noiseGenerator(audioContext);

  const gainNode = new GainNode(audioContext);
  gainNode.gain.value = 0.5;

  // Noise generator -> Gain -> Destination
  // NOTE: noiseGeneratorNode is disconnected by default
  destinations.forEach((destination) => gainNode.connect(destination));

  noiseGeneratorNode.start();

  return {
    enabled: false,
    generator: noiseGeneratorNode,
    gain: gainNode,
  };
}

function createPinkNoise(audioContext, destinations) {
  const bufferSize = audioContext.sampleRate * 2; // 2 seconds of audio
  const noiseBuffer = audioContext.createBuffer(
    1,
    bufferSize,
    audioContext.sampleRate
  );

  // Based on https://noisehack.com/generate-noise-web-audio-api/
  // which in turn is based on "Paul Kellet’s refined method", now 404
  const b = [0, 0, 0, 0, 0, 0, 0];
  const channelData = noiseBuffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;

    b[0] = 0.99886 * b[0] + white * 0.0555179;
    b[1] = 0.99332 * b[1] + white * 0.0750759;
    b[2] = 0.969 * b[2] + white * 0.153852;
    b[3] = 0.8665 * b[3] + white * 0.3104856;
    b[4] = 0.55 * b[4] + white * 0.5329522;
    b[5] = -0.7616 * b[5] - white * 0.016898;

    channelData[i] =
      b[0] + b[1] + b[2] + b[3] + b[4] + b[5] + b[6] + white * 0.5362;
    channelData[i] *= 0.11; // (roughly) compensate for gain
    b[6] = white * 0.115926;
  }

  // Connect the noise buffer to the filter
  const noiseGeneratorNode = audioContext.createBufferSource();
  noiseGeneratorNode.buffer = noiseBuffer;
  noiseGeneratorNode.loop = true;

  // Gain node to control volume
  const gainNode = new GainNode(audioContext);
  gainNode.gain.value = 0.5;

  // Noise generator -> Gain -> Destination
  // NOTE: noiseGeneratorNode is disconnected by default
  destinations.forEach((destination) => gainNode.connect(destination));

  noiseGeneratorNode.start();

  return {
    enabled: false,
    generator: noiseGeneratorNode,
    gain: gainNode,
  };
}

function updateNote(synth, angularVelocity1, angularVelocity2) {
  // synth.filter.frequency.setValueAtTime(
  //   400 + 400 * Math.sqrt(Math.abs(angularVelocity2)),
  //   synth.audioContext.currentTime
  // );

  // synth.adsr.gainNode.gain.cancelScheduledValues(
  //   synth.audioContext.currentTime
  // );
  // synth.echo.feedbackGainNode.gain.cancelScheduledValues(
  //   synth.audioContext.currentTime
  // );
  // synth.oscillators[0].osc.frequency.cancelScheduledValues(
  //   synth.audioContext.currentTime
  // );
  // synth.oscillators[0].osc.frequency.setValueAtTime(
  //   10 * angularVelocity1,
  //   synth.audioContext.currentTime
  // );
  // synth.oscillators[0].gain.gain.setValueAtTime(
  //   Math.pow(Math.abs(angularVelocity1), 0.1),
  //   synth.audioContext.currentTime
  // );
  // synth.oscillators[1].osc.frequency.cancelScheduledValues(
  //   synth.audioContext.currentTime
  // );
  // synth.oscillators[1].osc.frequency.setValueAtTime(
  //   40 * angularVelocity2,
  //   synth.audioContext.currentTime
  // );
  // synth.oscillators[1].gain.gain.setValueAtTime(
  //   Math.pow(Math.abs(angularVelocity2), 0.1),
  //   synth.audioContext.currentTime
  // );
  synth.adsr.gainNode.gain.setValueAtTime(1, synth.audioContext.currentTime);

  synth.lowpass.filterNode.frequency.setValueAtTime(
    (0.05 * Math.abs(angularVelocity2) * synth.audioContext.sampleRate) / 2,
    synth.audioContext.currentTime
  );
  synth.lowpass.filterNode.Q.setValueAtTime(
    10 + angularVelocity1,
    synth.audioContext.currentTime
  );

  synth.modulator.lfo.frequency.setValueAtTime(
    Math.abs(angularVelocity2),
    synth.audioContext.currentTime
  );
  synth.modulator.gain.gain.setValueAtTime(
    Math.abs(angularVelocity2),
    synth.audioContext.currentTime
  );
}

// function initializeSynth() {
//   const audioContext = new AudioContext();

//   const analyser = audioContext.createAnalyser();
//   analyser.smoothingTimeConstant = 0.75;
//   // analyser.fftSize = 128;

//   const noiseBuffer = audioContext.createBuffer(
//     1,
//     audioContext.sampleRate * 2,
//     audioContext.sampleRate
//   );
//   const noiseData = noiseBuffer.getChannelData(0);
//   for (let i = 0; i < noiseData.length; i++) {
//     noiseData[i] = Math.random() * 2 - 1;
//   }

//   const noise = audioContext.createBufferSource();
//   noise.buffer = noiseBuffer;
//   noise.loop = true;

//   const filter = audioContext.createBiquadFilter();
//   filter.type = "lowpass";
//   filter.frequency.value = 500;
//   filter.frequency.setValueAtTime(100, audioContext.currentTime);
//   // filter.frequency.linearRampToValueAtTime(800, audioContext.currentTime + 5); // increase cutoff over 5 seconds

//   let gainNode = audioContext.createGain();
//   gainNode.gain.value = 0.5;

//   // create convolver for reverb, to give the wind sound some space
//   const convolver = audioContext.createConvolver();
//   const impulseResponseBuffer = audioContext.createBuffer(
//     2,
//     audioContext.sampleRate * 1,
//     audioContext.sampleRate
//   ); // 1 second IR
//   for (let channel = 0; channel < 2; channel++) {
//     let impulseResponseData = impulseResponseBuffer.getChannelData(channel);
//     for (let i = 0; i < impulseResponseData.length; i++) {
//       // put a spike at the start and another one half way through, to create a "slapback" echo
//       if (i === 0 || i === impulseResponseData.length / 2) {
//         impulseResponseData[i] = 1;
//       } else {
//         impulseResponseData[i] = 0;
//       }
//     }
//   }

//   // assign the impulse response to the convolver
//   convolver.buffer = impulseResponseBuffer;

//   // connect nodes
//   noise.connect(filter);
//   filter.connect(gainNode);
//   gainNode.connect(audioContext.destination);
//   // gainNode.connect(convolver);
//   // convolver.connect(audioContext.destination);
//   // analyser.connect(audioContext.destination);

//   // filter.frequency.setValueAtTime(800, audioContext.currentTime + 10); // change to a higher pitch after 10 seconds

//   // start playing
//   noise.start();

//   return {
//     audioContext,
//     analyser,
//     filter,
//   };
// }

function initializeSynth() {
  const audioContext = new AudioContext();

  const analyser = audioContext.createAnalyser();
  analyser.connect(audioContext.destination);
  analyser.smoothingTimeConstant = 0.75;
  // analyser.fftSize = 128;

  const volumeNode = audioContext.createGain();
  const adsrGainNode = audioContext.createGain();
  const lowpassFilterNode = audioContext.createBiquadFilter();
  const delayNode = audioContext.createDelay();
  const delayFeedbackGainNode = audioContext.createGain();

  // Connections:
  // OSC - -> ADSR - - - > Lowpass -> Volume -> Destination
  // Noise -^  v                ^
  //           Delay <-> Feedback
  adsrGainNode.connect(lowpassFilterNode);
  adsrGainNode.connect(delayNode);
  delayNode.connect(delayFeedbackGainNode);
  delayFeedbackGainNode.connect(delayNode);
  delayFeedbackGainNode.connect(lowpassFilterNode);
  lowpassFilterNode.connect(volumeNode);
  volumeNode.connect(analyser);

  const oscillators = [
    createOscillator(audioContext, 3, 0, adsrGainNode, true),
    createOscillator(audioContext, 2, 20, adsrGainNode, true),
    createOscillator(audioContext, 2, -20, adsrGainNode, true),
  ];

  const modulator = createModulator(
    audioContext,
    oscillators.map((o) => o.osc.frequency),
    true,
    "lfo"
  );

  // Master volume
  const volume = 0.8;
  volumeNode.gain.value = volume;

  // Lowpass filter
  lowpassFilterNode.type = "lowpass";
  lowpassFilterNode.frequency.value = (0.1 * audioContext.sampleRate) / 2;
  lowpassFilterNode.Q.value = 10;

  // ADSR
  adsrGainNode.gain.value = 0.0;

  // Delay
  delayNode.delayTime.value = 0.2;
  delayFeedbackGainNode.gain.value = 0.3;

  return {
    analyser,
    playingNotes: new Set(),
    audioContext,
    volume: {
      gainNode: volumeNode,
    },
    oscillators,
    pitch: 0,
    glide: 0.5,
    modulator,
    noise: createWhiteNoise(audioContext, [adsrGainNode]),
    lowpass: {
      filterNode: lowpassFilterNode,
    },
    adsr: {
      gainNode: adsrGainNode,
      attack: 0.1,
      decay: 0.2,
      sustain: 0.3,
      release: 0.4,
      maxDuration: 2,
    },
    echo: {
      delayNode,
      feedbackGainNode: delayFeedbackGainNode,
    },
  };
}

running = false;

async function run() {
  if (running) {
    return;
  }
  running = true;

  const vs = `attribute vec2 p;void main(){gl_Position=vec4(p,0,1);}`;
  const res = await fetch("/fragment.glsl");
  const fs = await res.text();

  const programs = [];

  let gui;
  let synth;

  let gl, mCanvas, mWidth, mHeight;

  let fft;
  let analyser;
  let texture;
  let lastRenderTime = performance.now();

  let pendulum = {
    angle1: Math.PI * 1.0,
    angle2: Math.PI * 0.5,
    angularVelocity1: 1.0,
    angularVelocity2: 0.0,
    length1: 5.0,
    length2: 2.0,
    mass1: 1.0,
    mass2: 5.0,
    g: 9.81,
    damping: 0.0,
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
    const { length1, length2, mass1, mass2, g, damping } = pendulum;

    let a1 =
      (length2 / length1) *
      (mass2 / (mass1 + mass2)) *
      Math.cos(angle1 - angle2);
    let a2 = (length1 / length2) * Math.cos(angle1 - angle2);

    let f1 =
      -(length2 / length1) *
        (mass2 / (mass1 + mass2)) *
        Math.pow(angularVelocity2, 2) *
        Math.sin(angle1 - angle2) -
      (g / length1) * Math.sin(angle1);
    let f2 =
      (length1 / length2) *
        Math.pow(angularVelocity1, 2) *
        Math.sin(angle1 - angle2) -
      (g / length2) * Math.sin(angle2);

    let g1 = (f1 - a1 * f2) / (1.0 - a1 * a2) - damping * angularVelocity1;
    let g2 = (f2 - a2 * f1) / (1.0 - a1 * a2) - damping * angularVelocity2;

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

    pendulum.angle1 += (dt * (k1[0] + 2.0 * k2[0] + 2.0 * k3[0] + k4[0])) / 6.0;
    pendulum.angle2 += (dt * (k1[1] + 2.0 * k2[1] + 2.0 * k3[1] + k4[1])) / 6.0;
    pendulum.angularVelocity1 +=
      (dt * (k1[2] + 2.0 * k2[2] + 2.0 * k3[2] + k4[2])) / 6.0;
    pendulum.angularVelocity2 +=
      (dt * (k1[3] + 2.0 * k2[3] + 2.0 * k3[3] + k4[3])) / 6.0;
  }

  function position(pendulum) {
    return {
      pos1: {
        x: Math.sin(pendulum.angle1) * pendulum.length1,
        y: -Math.cos(pendulum.angle1) * pendulum.length1,
      },
      pos2: {
        x:
          Math.sin(pendulum.angle1) * pendulum.length1 +
          Math.sin(pendulum.angle2) * pendulum.length2,
        y:
          -Math.cos(pendulum.angle1) * pendulum.length1 -
          Math.cos(pendulum.angle2) * pendulum.length2,
      },
    };
  }

  function render() {
    const now = performance.now();
    const dt = (now - lastRenderTime) / 1000;
    lastRenderTime = now;

    update(pendulum, dt);
    const { pos1, pos2 } = position(pendulum);
    updateNote(synth, pendulum.angularVelocity1, pendulum.angularVelocity2);

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
        0.2 * Math.pow(pendulum.mass1, 0.333)
      );
      gl.uniform1f(
        gl.getUniformLocation(program, "u_r2"),
        0.2 * Math.pow(pendulum.mass2, 0.333)
      );

      // FFT
      synth.analyser.getByteFrequencyData(fft);

      // upload the audio data to the texture
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0, // level
        gl.LUMINANCE, // internal format
        synth.analyser.frequencyBinCount, // width
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

      synth = initializeSynth();
      fft = new Uint8Array(synth.analyser.frequencyBinCount);

      texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      gui = new dat.GUI();
      gui.add(pendulum, "angle1", 0, 10, 0.01).listen();
      gui.add(pendulum, "angle2", 0, 10, 0.01).listen();
      gui.add(pendulum, "angularVelocity1", -10, 10, 0.01).listen();
      gui.add(pendulum, "angularVelocity2", -10, 10, 0.01).listen();
      gui.add(pendulum, "mass1", 0.1, 20, 0.01).listen();
      gui.add(pendulum, "mass2", 0.1, 20, 0.01).listen();
      gui.add(pendulum, "length1", 0.1, 10, 0.01).listen();
      gui.add(pendulum, "length2", 0.1, 10, 0.01).listen();
      gui.add(pendulum, "damping", 0, 1, 0.01).listen();
      gui.add(pendulum, "g", 0, 20, 0.01).listen();

      window.requestAnimationFrame(render);
    } catch (err) {
      console.error(err);
      alert("Error: " + err.message);
    }
  })();
}
