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
  // const fs = `precision highp float;uniform float v;uniform vec2 d;uniform vec4 m;uniform vec2 f;const vec3 i=vec3(.8,.7,.6),h=vec3(1,.92,1);struct M{vec3 d;vec3 m;vec3 e;float h;float f;};struct S{int i;float d;M m;};struct R{S d;vec3 n;vec3 o;bool h;};float n(vec3 v,vec3 d,vec3 e){vec3 i=v-d,h=e-d;return length(i-h*clamp(dot(i,h)/dot(h,h),0.,1.))-.05;}float n(vec3 v,float d){return length(v)-d;}float n(vec3 v){vec3 d=vec3(0,9,0),h=vec3(m.xy,0)+d,i=vec3(m.zw,0)+d;float e=n(v-h,f.x),y=n(v-i,f.y),c=n(v,d,h),o=n(v,h,i);return min(min(e,y),min(c,o));}S e(S d, S h){if (d.d < h.d) return d; else return h;}S e(vec3 v){S i,h=S(0,n(v),M(vec3(.5),vec3(.5),vec3(.5),50.,.5)),d=S(1,dot(v,vec3(0,1,0))+2.,M(vec3(.5,1,1),vec3(.5),vec3(.5),2.,0.)),y=S(2,n(v-vec3(5),5.),M(vec3(.9),vec3(.5),vec3(.5),50.,.5)),o=S(3,n(v-vec3(-2,2,-3),3.),M(vec3(1,.3,.2),vec3(.9,.5,.5),vec3(.9),50.,.3));i=e(d,h);i=e(i,y);return e(i,o);}vec3 t(vec3 d,float v){vec3 m=exp2(-v*.05*h);return d*m+(1.-m)*i;}vec3 e(vec3 d,vec3 v,vec3 m){vec3 e=vec3(.7,.8,.9)-.5*v.y,y=exp2(-abs((2.5e4-d.y)/v.y)*1e-5*h);e=e*y+(1.-y)*i;float o=dot(m,v);if(o>.9999)e=vec3(.9);if(o>.9998)e=mix(e,vec3(.9),(o-.9998)/2e-4);return e;}float s(vec3 v,vec3 d){float i=1.,h=1.;for(int f=0;f<400;++f){if(h>=250.)return i;S m=e(d+h*v);if(m.d<1e-5)return 0.;i=min(i,10.*m.d/h);h+=m.d;}return i;}mat4 p(vec3 v,vec3 d){vec3 h=normalize(vec3(0,5,0)-v),i=normalize(cross(d,h));return mat4(vec4(i,0),vec4(cross(h,i),0),vec4(-h,0),vec4(0,0,0,1));}vec3 e(vec3 v,vec3 h,vec3 d,vec3 i,M m){float e=clamp(dot(v,h)*s(v,d),0.,1.);return m.m+m.d*e+m.e*pow(clamp(dot(reflect(v,h),i),0.,1.),m.h);}R r(vec3 v,vec3 d){float h=1e-5,i=1e-5;R m;for(int f=0;f<400;f++){h=.001*i;m.o=v+i*d;m.d=e(m.o);if(m.d.d<h){m.h=true;break;}i+=m.d.d*.5;if(i>=250.)break;}m.d.d=i;const vec2 f=vec2(1,-1);vec3 o=m.o;m.n=normalize(f.xyy*e(o+f.xyy*1e-5).d+f.yyx*e(o+f.yyx*1e-5).d+f.yxy*e(o+f.yxy*1e-5).d+f.xxx*e(o+f.xxx*1e-5).d);return m;}vec3 x(vec3 v,vec3 d){vec3 h=normalize(vec3(0,10,10)),i=vec3(0);float f=1.;vec3 m=d;float o=0.;R n=r(v,m);for(int s=0;s<10;s++){if(!n.h){i=mix(i,e(v,m,h),f);break;}vec3 y=n.n;if(n.d.i==1)y=vec3(0,1,0);else if(n.d.i==2)y=normalize(n.o-vec3(5));else if(n.d.i==3)y=normalize(n.o-vec3(-1,2,-3));o+=n.d.d;vec3 c=e(h,y,n.o,m,n.d.m);c=t(c,o);i=mix(i,c,f);f*=n.d.m.f;if(f<1e-5)break;m=reflect(m,y);n=r(n.o,m);}return i;}void main(){vec2 i=gl_FragCoord.xy-d/2.;vec3 m=vec3(-10.+20.*sin(v/1e4),4.+sin(v/5e3),-20.+20.*cos(v/1e4));mat4 e=p(m,normalize(vec3(1.-sin(v/5e3),sin(v/5e3),0)));vec3 f=x(m,(e*vec4(normalize(vec3(i,-d.y/tan(radians(60.)/2.))),0)).xyz);f=pow(f,h);f*=vec3(1.02,.99,.9);f.z=f.z+.1;f=smoothstep(0.,1.,f);gl_FragColor=vec4(f,1);}`;

  const res2 = await fetch("/effect.glsl");
  const fs2 = await res2.text();

  const programs = [];
  const textures = [];
  const framebuffers = [];

  let gui;
  let synth;
  let frame = 0;

  let gl, mCanvas, mWidth, mHeight;
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
        mWidth = width;
        mHeight = height;
      }

      // Bind to current fbo, using the texture from last
      gl.bindTexture(gl.TEXTURE_2D, textures[frame % 2]);
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[frame % 2]);
      // gl.bindTexture(gl.TEXTURE_2D, textures[1]);
      gl.viewport(0, 0, width, height);

      gl.clearColor(0, 0, 0, 1);
      gl.clear(COLOR_BUFFER_BIT);

      const program = programs[0];
      gl.useProgram(program);

      gl.uniform1i(gl.getUniformLocation(program, "u_frame"), frame % 2);
      gl.uniform1f(gl.getUniformLocation(program, "u_time"), now);
      gl.uniform2f(
        gl.getUniformLocation(program, "u_resolution"),
        width,
        height
      );
      gl.uniform4f(
        gl.getUniformLocation(program, "u_p"),
        pos1.x,
        pos1.y,
        pos2.x,
        pos2.y
      );
      gl.uniform2f(
        gl.getUniformLocation(program, "u_r"),
        0.2 * Math.pow(pendulum.mass1, 0.333),
        0.2 * Math.pow(pendulum.mass2, 0.333)
      );

      gl.uniform1f(gl.getUniformLocation(program, "v"), now);
      gl.uniform2f(gl.getUniformLocation(program, "d"), width, height);
      gl.uniform4f(
        gl.getUniformLocation(program, "m"),
        pos1.x,
        pos1.y,
        pos2.x,
        pos2.y
      );
      gl.uniform2f(
        gl.getUniformLocation(program, "f"),
        0.2 * Math.pow(pendulum.mass1, 0.333),
        0.2 * Math.pow(pendulum.mass2, 0.333)
      );

      // Draw
      gl.drawArrays(TRIANGLE_STRIP, 0, 4);

      // Effects shader, drawing the scene from texture

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, width, height);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(COLOR_BUFFER_BIT);

      const effectsProgram = programs[1];
      gl.useProgram(effectsProgram);

      gl.uniform2f(
        gl.getUniformLocation(effectsProgram, "u_resolution"),
        width,
        height
      );
      gl.uniform1i(gl.getUniformLocation(effectsProgram, "u_texture0"), 0);
      gl.uniform1i(gl.getUniformLocation(effectsProgram, "u_texture1"), 1);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, textures[0]);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, textures[1]);

      // Draw
      gl.drawArrays(TRIANGLE_STRIP, 0, 4);

      window.requestAnimationFrame(render);
    } catch (err) {
      console.log(err);
      alert("Error: " + err.message);
    }

    frame += 1;
  }

  function createAndSetupTexture(gl) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Set up texture so we can render any size image and so we are
    // working with pixels.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    return texture;
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
      const effectsProgram = gl.createProgram();
      programs[1] = effectsProgram;

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

      shader = gl.createShader(VERTEX_SHADER);
      gl.shaderSource(shader, vs);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert("Vertex shader: " + gl.getShaderInfoLog(shader));
      }
      gl.attachShader(effectsProgram, shader);

      shader = gl.createShader(FRAGMENT_SHADER);
      gl.shaderSource(shader, fs2);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert("Fragment shader: " + gl.getShaderInfoLog(shader));
      }
      gl.attachShader(effectsProgram, shader);

      gl.linkProgram(effectsProgram);
      if (!gl.getProgramParameter(effectsProgram, gl.LINK_STATUS)) {
        alert("Link program: " + gl.getProgramInfoLog(effectsProgram));
      }

      const vertices = [1, 1, 1, -1, -1, 1, -1, -1];

      gl.bindBuffer(ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(ARRAY_BUFFER, new Float32Array(vertices), STATIC_DRAW);

      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, FLOAT, false, 0, 0);

      synth = initializeSynth();

      for (var ii = 0; ii < 2; ++ii) {
        const texture = createAndSetupTexture(gl);
        textures.push(texture);

        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          window.innerWidth,
          window.innerHeight,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          null
        );

        // Create a framebuffer
        const fbo = gl.createFramebuffer();
        framebuffers.push(fbo);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

        // Attach a texture to it.
        gl.framebufferTexture2D(
          gl.FRAMEBUFFER,
          gl.COLOR_ATTACHMENT0,
          gl.TEXTURE_2D,
          texture,
          0
        );
      }

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
