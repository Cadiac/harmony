C = Math.cos;
S = Math.sin;
P = Math.pow;

run = () => {
  vs = `attribute vec2 p;void main(){gl_Position=vec4(p,0,1);}`;
  fs = `precision highp float;uniform float v;uniform vec2 d;uniform vec4 m;uniform vec2 f;const vec3 i=vec3(.8,.7,.6),h=vec3(1,.92,1);struct M{vec3 d;vec3 m;vec3 e;float h;float f;};struct S{int i;float d;M m;};struct R{S d;vec3 n;vec3 o;bool h;};float n(vec3 v,vec3 d,vec3 e){vec3 i=v-d,h=e-d;return length(i-h*clamp(dot(i,h)/dot(h,h),0.,1.))-.05;}float n(vec3 v,float d){return length(v)-d;}float n(vec3 v){vec3 d=vec3(0,9,0),h=vec3(m.xy,0)+d,i=vec3(m.zw,0)+d;float e=n(v-h,f.x),y=n(v-i,f.y),c=n(v,d,h),o=n(v,h,i);return min(min(e,y),min(c,o));}S e(S d, S h){if (d.d < h.d) return d; else return h;}S e(vec3 v){S i,h=S(0,n(v),M(vec3(.5),vec3(.5),vec3(.5),50.,.5)),d=S(1,dot(v,vec3(0,1,0))+2.,M(vec3(.5,1,1),vec3(.5),vec3(.5),2.,0.)),y=S(2,n(v-vec3(5),5.),M(vec3(.9),vec3(.5),vec3(.5),50.,.5)),o=S(3,n(v-vec3(-2,2,-3),3.),M(vec3(1,.3,.2),vec3(.9,.5,.5),vec3(.9),50.,.3));i=e(d,h);i=e(i,y);return e(i,o);}vec3 t(vec3 d,float v){vec3 m=exp2(-v*.05*h);return d*m+(1.-m)*i;}vec3 e(vec3 d,vec3 v,vec3 m){vec3 e=vec3(.7,.8,.9)-.5*v.y,y=exp2(-abs((2.5e4-d.y)/v.y)*1e-5*h);e=e*y+(1.-y)*i;float o=dot(m,v);if(o>.9999)e=vec3(.9);if(o>.9998)e=mix(e,vec3(.9),(o-.9998)/2e-4);return e;}float s(vec3 v,vec3 d){float i=1.,h=1.;for(int f=0;f<400;++f){if(h>=250.)return i;S m=e(d+h*v);if(m.d<1e-5)return 0.;i=min(i,10.*m.d/h);h+=m.d;}return i;}mat4 p(vec3 v,vec3 d){vec3 h=normalize(vec3(0,5,0)-v),i=normalize(cross(d,h));return mat4(vec4(i,0),vec4(cross(h,i),0),vec4(-h,0),vec4(0,0,0,1));}vec3 e(vec3 v,vec3 h,vec3 d,vec3 i,M m){float e=clamp(dot(v,h)*s(v,d),0.,1.);return m.m+m.d*e+m.e*pow(clamp(dot(reflect(v,h),i),0.,1.),m.h);}R r(vec3 v,vec3 d){float h=1e-5,i=1e-5;R m;for(int f=0;f<400;f++){h=.001*i;m.o=v+i*d;m.d=e(m.o);if(m.d.d<h){m.h=true;break;}i+=m.d.d*.5;if(i>=250.)break;}m.d.d=i;const vec2 f=vec2(1,-1);vec3 o=m.o;m.n=normalize(f.xyy*e(o+f.xyy*1e-5).d+f.yyx*e(o+f.yyx*1e-5).d+f.yxy*e(o+f.yxy*1e-5).d+f.xxx*e(o+f.xxx*1e-5).d);return m;}vec3 x(vec3 v,vec3 d){vec3 h=normalize(vec3(0,10,10)),i=vec3(0);float f=1.;vec3 m=d;float o=0.;R n=r(v,m);for(int s=0;s<10;s++){if(!n.h){i=mix(i,e(v,m,h),f);break;}vec3 y=n.n;if(n.d.i==1)y=vec3(0,1,0);else if(n.d.i==2)y=normalize(n.o-vec3(5));else if(n.d.i==3)y=normalize(n.o-vec3(-1,2,-3));o+=n.d.d;vec3 c=e(h,y,n.o,m,n.d.m);c=t(c,o);i=mix(i,c,f);f*=n.d.m.f;if(f<1e-5)break;m=reflect(m,y);n=r(n.o,m);}return i;}void main(){vec2 i=gl_FragCoord.xy-d/2.;vec3 m=vec3(-10.+20.*sin(v/1e4),4.+sin(v/5e3),-20.+20.*cos(v/1e4));mat4 e=p(m,normalize(vec3(1.-sin(v/5e3),sin(v/5e3),0)));vec3 f=x(m,(e*vec4(normalize(vec3(i,-d.y/tan(radians(60.)/2.))),0)).xyz);f=pow(f,h);f*=vec3(1.02,.99,.9);f.z=f.z+.1;f=smoothstep(0.,1.,f);gl_FragColor=vec4(f,1);}`;

  l = performance.now();

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

  u = (angularVelocity1, angularVelocity2) => {
    f.frequency.setValueAtTime(
      (0.05 * Math.abs(angularVelocity2) * a.sampleRate) / 2,
      a.currentTime
    );
    f.Q.setValueAtTime(10 + angularVelocity1, a.currentTime);
    m.frequency.setValueAtTime(Math.abs(angularVelocity2), a.currentTime);
    g.gain.setValueAtTime(Math.abs(angularVelocity2), a.currentTime);
  };

  p = {
    angle1: 3,
    angle2: 2,
    angularVelocity1: 1,
    angularVelocity2: 0,
    length1: 5,
    length2: 2,
    mass1: 1,
    mass2: 5,
    g: 10,
    damping: 0,
  };

  w = window.innerWidth;
  h = window.innerHeight;

  // Based on math here:
  // https://diego.assencio.com/?index=1500c66ae7ab27bb0106467c68feebc6
  L = (angle1, angle2, angularVelocity1, angularVelocity2) => {
    let { length1, length2, mass1, mass2, g, damping } = p;

    let a1 =
      (length2 / length1) * (mass2 / (mass1 + mass2)) * C(angle1 - angle2);
    let a2 = (length1 / length2) * C(angle1 - angle2);

    let f1 =
      -(length2 / length1) *
        (mass2 / (mass1 + mass2)) *
        P(angularVelocity2, 2) *
        S(angle1 - angle2) -
      (g / length1) * S(angle1);
    let f2 =
      (length1 / length2) * P(angularVelocity1, 2) * S(angle1 - angle2) -
      (g / length2) * S(angle2);

    let g1 = (f1 - a1 * f2) / (1 - a1 * a2) - damping * angularVelocity1;
    let g2 = (f2 - a2 * f1) / (1 - a1 * a2) - damping * angularVelocity2;

    return [angularVelocity1, angularVelocity2, g1, g2];
  };

  U = (p, dt) => {
    const { angle1, angle2, angularVelocity1, angularVelocity2 } = p;

    // Runga-Kutta method
    let k1 = L(angle1, angle2, angularVelocity1, angularVelocity2);
    let k2 = L(
      angle1 + (dt * k1[0]) / 2,
      angle2 + (dt * k1[1]) / 2,
      angularVelocity1 + (dt * k1[2]) / 2,
      angularVelocity2 + (dt * k1[3]) / 2
    );
    let k3 = L(
      angle1 + (dt * k2[0]) / 2,
      angle2 + (dt * k2[1]) / 2,
      angularVelocity1 + (dt * k2[2]) / 2,
      angularVelocity2 + (dt * k2[3]) / 2
    );
    let k4 = L(
      angle1 + dt * k3[0],
      angle2 + dt * k3[1],
      angularVelocity1 + dt * k3[2],
      angularVelocity2 + dt * k3[3]
    );

    p.angle1 += (dt * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0])) / 6;
    p.angle2 += (dt * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])) / 6;
    p.angularVelocity1 += (dt * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2])) / 6;
    p.angularVelocity2 += (dt * (k1[3] + 2 * k2[3] + 2 * k3[3] + k4[3])) / 6;
  };

  function render() {
    now = performance.now();
    dt = (now - l) / 1e3;
    l = now;

    U(p, dt);
    u(p.angularVelocity1, p.angularVelocity2);

    gl.clearColor(0, 0, 0, 1);
    gl.clear(0x4000);

    gl.useProgram(program);

    gl.uniform1f(gl.getUniformLocation(program, "v"), now);
    gl.uniform2f(gl.getUniformLocation(program, "d"), w, h);
    x = S(p.angle1) * p.length1;
    y = -C(p.angle1) * p.length1;
    gl.uniform4f(
      gl.getUniformLocation(program, "m"),
      x,
      y,
      x + S(p.angle2) * p.length2,
      y - C(p.angle2) * p.length2
    );
    gl.uniform2f(
      gl.getUniformLocation(program, "f"),
      0.2 * P(p.mass1, 0.33),
      0.2 * P(p.mass2, 0.33)
    );

    gl.drawArrays(5, 0, 4);

    window.requestAnimationFrame(render);
  }

  (function setup() {
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

    window.requestAnimationFrame(render);
  })();
};
