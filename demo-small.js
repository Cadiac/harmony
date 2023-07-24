function initializeSynth() {
  const audioContext = new AudioContext();

  // Lowpass filter
  const lowpassFilterNode = audioContext.createBiquadFilter();
  lowpassFilterNode.type = "lowpass";
  lowpassFilterNode.frequency.value = (0.1 * audioContext.sampleRate) / 2;
  lowpassFilterNode.Q.value = 10;

  // Connections:
  // OSC -> Lowpass -> Destination
  lowpassFilterNode.connect(audioContext.destination);

  const lfo = audioContext.createOscillator();
  lfo.frequency.value = 5;
  lfo.start();

  const lfoGainNode = audioContext.createGain();
  lfoGainNode.gain.value = 5;

  lfo.connect(lfoGainNode);

  // Oscilators: [octave, detune]
  [
    [3, 0],
    [2, 20],
    [2, -20],
  ].map(([octave, detune]) => {
    const oscillator = new OscillatorNode(audioContext);
    oscillator.type = "sawtooth";
    oscillator.frequency.value = 440 * Math.pow(2, octave - 4); // A
    oscillator.detune.value = detune;

    oscillator.connect(lowpassFilterNode);
    lfoGainNode.connect(oscillator.frequency);

    // A C F G
    const f = [440, 523.25, 349.23, 392.0];
    for (let i = 0; i < 100; i++) {
      oscillator.frequency.setValueAtTime(
        f[i % 4] * Math.pow(2, octave - 4),
        audioContext.currentTime + i * 2
      );
    }

    oscillator.start();

    return oscillator;
  });

  let update = (angularVelocity1, angularVelocity2) => {
    lowpassFilterNode.frequency.setValueAtTime(
      (0.05 * Math.abs(angularVelocity2) * audioContext.sampleRate) / 2,
      audioContext.currentTime
    );
    lowpassFilterNode.Q.setValueAtTime(
      10 + angularVelocity1,
      audioContext.currentTime
    );
    lfo.frequency.setValueAtTime(
      Math.abs(angularVelocity2),
      audioContext.currentTime
    );
    lfoGainNode.gain.setValueAtTime(
      Math.abs(angularVelocity2),
      audioContext.currentTime
    );
  };

  return update;
}

function run() {
  const vs = `attribute vec2 p;void main(){gl_Position=vec4(p,0,1);}`;
  const fs = `precision highp float;uniform float v;uniform vec2 d;uniform vec4 m;uniform vec2 f;const vec3 i=vec3(.8,.7,.6),h=vec3(1,.92,1);struct M{vec3 d;vec3 m;vec3 e;float h;float f;};struct S{int i;float d;M m;};struct R{S d;vec3 n;vec3 o;bool h;};float n(vec3 v,vec3 d,vec3 e){vec3 i=v-d,h=e-d;return length(i-h*clamp(dot(i,h)/dot(h,h),0.,1.))-.05;}float n(vec3 v,float d){return length(v)-d;}float n(vec3 v){vec3 d=vec3(0,9,0),h=vec3(m.xy,0)+d,i=vec3(m.zw,0)+d;float e=n(v-h,f.x),y=n(v-i,f.y),c=n(v,d,h),o=n(v,h,i);return min(min(e,y),min(c,o));}S e(S d, S h){if (d.d < h.d) return d; else return h;}S e(vec3 v){S i,h=S(0,n(v),M(vec3(.5),vec3(.5),vec3(.5),50.,.5)),d=S(1,dot(v,vec3(0,1,0))+2.,M(vec3(.5,1,1),vec3(.5),vec3(.5),2.,0.)),y=S(2,n(v-vec3(5),5.),M(vec3(.9),vec3(.5),vec3(.5),50.,.5)),o=S(3,n(v-vec3(-2,2,-3),3.),M(vec3(1,.3,.2),vec3(.9,.5,.5),vec3(.9),50.,.3));i=e(d,h);i=e(i,y);return e(i,o);}vec3 t(vec3 d,float v){vec3 m=exp2(-v*.05*h);return d*m+(1.-m)*i;}vec3 e(vec3 d,vec3 v,vec3 m){vec3 e=vec3(.7,.8,.9)-.5*v.y,y=exp2(-abs((2.5e4-d.y)/v.y)*1e-5*h);e=e*y+(1.-y)*i;float o=dot(m,v);if(o>.9999)e=vec3(.9);if(o>.9998)e=mix(e,vec3(.9),(o-.9998)/2e-4);return e;}float s(vec3 v,vec3 d){float i=1.,h=1.;for(int f=0;f<400;++f){if(h>=250.)return i;S m=e(d+h*v);if(m.d<1e-5)return 0.;i=min(i,10.*m.d/h);h+=m.d;}return i;}mat4 p(vec3 v,vec3 d){vec3 h=normalize(vec3(0,5,0)-v),i=normalize(cross(d,h));return mat4(vec4(i,0),vec4(cross(h,i),0),vec4(-h,0),vec4(0,0,0,1));}vec3 e(vec3 v,vec3 h,vec3 d,vec3 i,M m){float e=clamp(dot(v,h)*s(v,d),0.,1.);return m.m+m.d*e+m.e*pow(clamp(dot(reflect(v,h),i),0.,1.),m.h);}R r(vec3 v,vec3 d){float h=1e-5,i=1e-5;R m;for(int f=0;f<400;f++){h=.001*i;m.o=v+i*d;m.d=e(m.o);if(m.d.d<h){m.h=true;break;}i+=m.d.d*.5;if(i>=250.)break;}m.d.d=i;const vec2 f=vec2(1,-1);vec3 o=m.o;m.n=normalize(f.xyy*e(o+f.xyy*1e-5).d+f.yyx*e(o+f.yyx*1e-5).d+f.yxy*e(o+f.yxy*1e-5).d+f.xxx*e(o+f.xxx*1e-5).d);return m;}vec3 x(vec3 v,vec3 d){vec3 h=normalize(vec3(0,10,10)),i=vec3(0);float f=1.;vec3 m=d;float o=0.;R n=r(v,m);for(int s=0;s<10;s++){if(!n.h){i=mix(i,e(v,m,h),f);break;}vec3 y=n.n;if(n.d.i==1)y=vec3(0,1,0);else if(n.d.i==2)y=normalize(n.o-vec3(5));else if(n.d.i==3)y=normalize(n.o-vec3(-1,2,-3));o+=n.d.d;vec3 c=e(h,y,n.o,m,n.d.m);c=t(c,o);i=mix(i,c,f);f*=n.d.m.f;if(f<1e-5)break;m=reflect(m,y);n=r(n.o,m);}return i;}void main(){vec2 i=gl_FragCoord.xy-d/2.;vec3 m=vec3(-10.+20.*sin(v/1e4),4.+sin(v/5e3),-20.+20.*cos(v/1e4));mat4 e=p(m,normalize(vec3(1.-sin(v/5e3),sin(v/5e3),0)));vec3 f=x(m,(e*vec4(normalize(vec3(i,-d.y/tan(radians(60.)/2.))),0)).xyz);f=pow(f,h);f*=vec3(1.02,.99,.9);f.z=f.z+.1;f=smoothstep(0.,1.,f);gl_FragColor=vec4(f,1);}`;

  const programs = [];

  let gl, canvas, updateNote, now, dt;
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

  let GL_VERTEX_SHADER = 0x8b31,
    GL_FRAGMENT_SHADER = 0x8b30,
    GL_ARRAY_BUFFER = 0x8892,
    GL_STATIC_DRAW = 0x88e4,
    GL_COLOR_BUFFER_BIT = 0x4000,
    GL_TRIANGLE_STRIP = 5,
    GL_FLOAT = 0x1406;

  const width = window.innerWidth,
    height = window.innerHeight;

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
    now = performance.now();
    dt = (now - lastRenderTime) / 1000;
    lastRenderTime = now;

    update(pendulum, dt);
    const { pos1, pos2 } = position(pendulum);
    updateNote(pendulum.angularVelocity1, pendulum.angularVelocity2);

    gl.clearColor(0, 0, 0, 1);
    gl.clear(GL_COLOR_BUFFER_BIT);

    const program = programs[0];
    gl.useProgram(program);

    const time = performance.now();

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

    gl.drawArrays(GL_TRIANGLE_STRIP, 0, 4);

    window.requestAnimationFrame(render);
  }

  (function setup() {
    canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    canvas.width = width;
    canvas.height = height;

    const s = canvas.style;
    s.position = "fixed";
    s.left = s.top = 0;

    gl = canvas.getContext("webgl");

    gl.viewport(0, 0, width, height);

    const program = gl.createProgram();
    programs[0] = program;

    let shader = gl.createShader(GL_VERTEX_SHADER);
    gl.shaderSource(shader, vs);
    gl.compileShader(shader);
    gl.attachShader(program, shader);

    shader = gl.createShader(GL_FRAGMENT_SHADER);
    gl.shaderSource(shader, fs);
    gl.compileShader(shader);
    gl.attachShader(program, shader);

    gl.linkProgram(program);

    const vertices = [1, 1, 1, -1, -1, 1, -1, -1];

    gl.bindBuffer(GL_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(GL_ARRAY_BUFFER, new Float32Array(vertices), GL_STATIC_DRAW);

    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, GL_FLOAT, false, 0, 0);

    updateNote = initializeSynth();

    window.requestAnimationFrame(render);
  })();
}
