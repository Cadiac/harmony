C = Math.cos;
S = Math.sin;
P = Math.pow;

run = async () => {
  vs = `attribute vec2 p;void main(){gl_Position=vec4(p,0,1);}`;
  // const res = await fetch("/fragment.glsl");
  // const fs = await res.text();
  fs = `precision highp float;uniform float v;uniform vec2 d;uniform vec4 m;const vec3 i=vec3(.8,.7,.6),h=vec3(1,.92,1);struct M{vec3 d;vec3 m;vec3 e;float h;float f;};struct S{int i;float d;M m;};struct R{S d;vec3 n;vec3 o;bool h;};float n(vec3 v,vec3 d,vec3 e){vec3 i=v-d,h=e-d;return length(i-h*clamp(dot(i,h)/dot(h,h),0.,1.))-.05;}float n(vec3 v,float d){return length(v)-d;}float n(vec3 v){vec3 d=vec3(0,9,0),h=vec3(m.xy,0)+d,i=vec3(m.zw,0)+d;float f=n(v-h,.2),o=n(v-i,.4),c=n(v,d,h),y=n(v,h,i);return min(min(f,o),min(c,y));}S f(S d,S h){if (d.d<h.d){return d;}return h;}S f(vec3 v){S i,h=S(0,n(v),M(vec3(.5),vec3(.5),vec3(.5),50.,.5)),d=S(1,dot(v,vec3(0,1,0))+2.,M(vec3(.5,1,1),vec3(.5),vec3(.5),2.,0.)),o=S(2,n(v-vec3(5),5.),M(vec3(.9),vec3(.5),vec3(.5),50.,.5)),y=S(3,n(v-vec3(-2,2,-3),3.),M(vec3(1,.3,.2),vec3(.9,.5,.5),vec3(.9),50.,.3));i=f(d,h);i=f(i,o);return f(i,y);}vec3 e(vec3 d,float v){vec3 m=exp2(-v*.05*h);return d*m+(1.-m)*i;}vec3 e(vec3 d,vec3 v,vec3 m){vec3 f=vec3(.7,.8,.9)-.5*v.y,o=exp2(-abs((2.5e4-d.y)/v.y)*1e-5*h);f=f*o+(1.-o)*i;float e=dot(m,v);if(e>.9999)f=vec3(.9);if(e>.9998)f=mix(f,vec3(.9),(e-.9998)/2e-4);return f;}float t(vec3 v,vec3 d){float i=1.,h=1.;for(int m=0;m<400;++m){if(h>=250.)return i;S e=f(d+h*v);if(e.d<1e-5)return 0.;i=min(i,10.*e.d/h);h+=e.d;}return i;}mat4 s(vec3 v,vec3 d){vec3 h=normalize(vec3(0,5,0)-v),i=normalize(cross(d,h));return mat4(vec4(i,0),vec4(cross(h,i),0),vec4(-h,0),vec4(0,0,0,1));}vec3 e(vec3 v,vec3 h,vec3 d,vec3 i,M m){float f=clamp(dot(v,h)*t(v,d),0.,1.);return m.m+m.d*f+m.e*pow(clamp(dot(reflect(v,h),i),0.,1.),m.h);}R p(vec3 v,vec3 d){float h=1e-5,i=1e-5;R m;for(int r=0;r<400;r++){h=.001*i;m.o=v+i*d;m.d=f(m.o);if(m.d.d<h){m.h=true;break;}i+=m.d.d*.5;if(i>=250.)break;}m.d.d=i;const vec2 e=vec2(1,-1);vec3 r=m.o;m.n=normalize(e.xyy*f(r+e.xyy*1e-5).d+e.yyx*f(r+e.yyx*1e-5).d+e.yxy*f(r+e.yxy*1e-5).d+e.xxx*f(r+e.xxx*1e-5).d);return m;}vec3 r(vec3 v,vec3 d){vec3 h=normalize(vec3(0,10,10)),i=vec3(0);float m=1.;vec3 f=d;float r=0.;R n=p(v,f);for(int o=0;o<10;o++){if(!n.h){i=mix(i,e(v,f,h),m);break;}vec3 y=n.n;if(n.d.i==1)y=vec3(0,1,0);else if(n.d.i==2)y=normalize(n.o-vec3(5));else if(n.d.i==3)y=normalize(n.o-vec3(-1,2,-3));r+=n.d.d;vec3 c=e(h,y,n.o,f,n.d.m);c=e(c,r);i=mix(i,c,m);m*=n.d.m.f;if(m<1e-5)break;f=reflect(f,y);n=p(n.o,f);}return i;}void main(){vec2 i=gl_FragCoord.xy-d/2.;vec3 f=vec3(-10.+20.*sin(v/1e4),4.+sin(v/5e3),-20.+20.*cos(v/1e4));mat4 m=s(f,normalize(vec3(1.-sin(v/5e3),sin(v/5e3),0)));vec3 n=r(f,(m*vec4(normalize(vec3(i,-d.y/tan(radians(60.)/2.))),0)).xyz);n=pow(n,h);n*=vec3(1.02,.99,.9);n.z=n.z+.1;n=smoothstep(0.,1.,n);gl_FragColor=vec4(n,1);}`;

  l = performance.now();

  // Synth
  a = new AudioContext();

  // Lowpass filter
  f = a.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = (0.1 * a.sampleRate) / 2;
  f.Q.value = 10;

  // Connections:
  // OSC -> Lowpass -> Destination
  f.connect(a.destination);

  m = a.createOscillator();
  m.frequency.value = 5;
  m.start();

  g = a.createGain();
  g.gain.value = 5;

  m.connect(g);

  // Oscilators: [octave, detune]
  [
    [3, 0],
    [2, 20],
    [2, -20],
  ].map(([octave, detune]) => {
    o = new OscillatorNode(a);
    o.type = "sawtooth";
    o.frequency.value = 440 * P(2, octave - 4); // A
    o.detune.value = detune;

    o.connect(f);
    g.connect(o.frequency);

    // A C F G
    n = [440, 523.25, 349.23, 392.0];
    for (let i = 0; i < 100; i++) {
      o.frequency.setValueAtTime(
        n[i % 4] * P(2, octave - 4),
        a.currentTime + i * 2
      );
    }

    o.start();

    return o;
  });

  w = window.innerWidth;
  h = window.innerHeight;

  p = [3, 2, 1, 0];

  // Setup
  canvas = document.createElement("canvas");
  document.body.appendChild(canvas);
  canvas.width = w;
  canvas.height = h;

  s = canvas.style;
  s.position = "fixed";
  s.left = s.top = 0;

  gl = canvas.getContext("webgl");

  gl.viewport(0, 0, w, h);

  program = gl.createProgram();

  let shader = gl.createShader(0x8b31);
  gl.shaderSource(shader, vs);
  gl.compileShader(shader);
  gl.attachShader(program, shader);

  shader = gl.createShader(0x8b30);
  gl.shaderSource(shader, fs);
  gl.compileShader(shader);
  gl.attachShader(program, shader);

  gl.linkProgram(program);

  const vertices = [1, 1, 1, -1, -1, 1, -1, -1];

  A = 0x8892;
  gl.bindBuffer(A, gl.createBuffer());
  gl.bufferData(A, new Float32Array(vertices), 0x88e4);

  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, 0x1406, false, 0, 0);

  // Lagrange, based on math here:
  // https://diego.assencio.com/?index=1500c66ae7ab27bb0106467c68feebc6
  L = (dt, k) => {
    let [angle1, angle2, angularVelocity1, angularVelocity2] = k.map(
      (K, i) => p[i] + K * dt
    );

    let a1 = C(angle1 - angle2) / 3;
    let a2 = 2.5 * C(angle1 - angle2);

    let f1 = -(P(angularVelocity2, 2) * S(angle1 - angle2)) / 3 - 2 * S(angle1);
    let f2 = 2.5 * P(angularVelocity1, 2) * S(angle1 - angle2) - 5 * S(angle2);

    let g1 = (f1 - a1 * f2) / (1 - a1 * a2);
    let g2 = (f2 - a2 * f1) / (1 - a1 * a2);

    return [angularVelocity1, angularVelocity2, g1, g2];
  };

  function render() {
    now = performance.now();
    dt = (now - l) / 1e3;
    l = now;

    // Update pendulum

    // Runga-Kutta method
    X = L(0, [0, 0, 0, 0]);
    Y = L(dt / 2, X);
    Z = L(dt / 2, Y);
    W = L(dt, Z);

    p.map((_, i) => {
      p[i] += (dt * (X[i] + 2 * Y[i] + 2 * Z[i] + W[i])) / 6;
    });

    // Update note
    f.frequency.setValueAtTime(
      (0.05 * Math.abs(p[3]) * a.sampleRate) / 2,
      a.currentTime
    );
    f.Q.setValueAtTime(10 + p[1], a.currentTime);
    m.frequency.setValueAtTime(Math.abs(p[3]), a.currentTime);
    g.gain.setValueAtTime(Math.abs(p[3]), a.currentTime);

    gl.clearColor(0, 0, 0, 1);
    gl.clear(0x4000);

    gl.useProgram(program);

    // gl.uniform1f(gl.getUniformLocation(program, "u_time"), now);
    // gl.uniform2f(gl.getUniformLocation(program, "u_resolution"), w, h);
    // x = S(p[0]) * 5;
    // y = -C(p[0]) * 5;
    // gl.uniform4f(
    //   gl.getUniformLocation(program, "u_p"),
    //   x,
    //   y,
    //   x + S(p[1]) * 2,
    //   y - C(p[1]) * 2
    // );

    gl.uniform1f(gl.getUniformLocation(program, "v"), now);
    gl.uniform2f(gl.getUniformLocation(program, "d"), w, h);
    x = S(p[0]) * 5;
    y = -C(p[0]) * 5;
    gl.uniform4f(
      gl.getUniformLocation(program, "m"),
      x,
      y,
      x + S(p[1]) * 2,
      y - C(p[1]) * 2
    );
    gl.uniform2f(
      gl.getUniformLocation(program, "f"),
      0.2 * Math.pow(1.0, 0.333),
      0.2 * Math.pow(5.0, 0.333)
    );

    gl.drawArrays(5, 0, 4);

    window.requestAnimationFrame(render);
  }

  window.requestAnimationFrame(render);
};
