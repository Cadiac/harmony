C = Math.cos;
S = Math.sin;
P = Math.pow;

run = () =>
  document.documentElement.requestFullscreen().then(() => {
    l = performance.now();
    frame = 0;

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

    [program, effectsProgram] = [gl.createProgram(), gl.createProgram()];

    // vertex shader, 2 triangles filling the screen as as a quad
    V = `attribute vec2 p;void main(){gl_Position=vec4(p,0,1);}`;

    shader = gl.createShader(0x8b31);
    gl.shaderSource(shader, V);
    gl.compileShader(shader);
    gl.attachShader(program, shader);

    shader = gl.createShader(0x8b30);
    gl.shaderSource(
      shader,
      `precision highp float;uniform float v;uniform vec2 d;uniform vec4 m;const vec3 i=vec3(.8,.7,.6),M=vec3(1,.92,1),e=vec3(.7,.8,.9);struct Material{vec3 d;vec3 m;vec3 e;float h;float f;};struct Surface{int i;float d;Material m;};struct Ray{Surface d;vec3 n;vec3 o;bool h;};float n(float v){return fract(v*17.*fract(v*.3183099));}float f(vec3 v){vec3 d=floor(v),M=fract(v),c=M*M*(3.-2.*M);float m=d.x+317.*d.y+157.*d.z,e=n(m),i=n(m+1.),o=n(m+317.),z=n(m+318.),f=n(m+157.),h=n(m+158.),y=n(m+474.),S=n(m+475.);return-1.+2.*(e+(i-e)*c.x+(o-e)*c.y+(f-e)*c.z+(e-i-o+z)*c.x*c.y+(e-o-f+y)*c.y*c.z+(e-i-f+h)*c.z*c.x+(-e+i+o-z+f-h-y+S)*c.x*c.y*c.z);}float t(vec3 v){float m=0.,M=.5;for(int i=0;i<7;i++){float c=f(v);m+=M*c;M*=.5;v=2.*mat3(0.,.8,.6,-.8,.36,-.48,-.6,-.48,.64)*v;}return m;}mat3 s(float v){float m=sin(v),M=cos(v);return mat3(vec3(1,0,0),vec3(0,M,-m),vec3(0,m,M));}mat3 l(float v){float m=sin(v),M=cos(v);return mat3(vec3(M,0,m),vec3(0,1,0),vec3(-m,0,M));}mat3 r(float v){float m=sin(v),M=cos(v);return mat3(vec3(M,-m,0),vec3(m,M,0),vec3(0,0,1));}float f(vec3 v,vec3 m,vec3 e){vec3 i=v-m,M=e-m;return length(i-M*clamp(dot(i,M)/dot(M,M),0.,1.))-.05;}float f(vec3 v,float m){return length(v)-m;}float h(vec3 v){vec3 m=abs(v)-vec3(2);return length(max(m,0.))+min(max(m.x,max(m.y,m.z)),0.);}float p(vec3 v){vec3 M=vec3(m.xy,0),e=vec3(m.zw,0);float i=f(v,.3),d=f(v-M,.8),h=f(v-e,.5),c=f(v,vec3(0),M),z=f(v,M,e);return min(min(i,min(d,h)),min(c,z));}Surface h(Surface m,Surface v){if (m.d<v.d){return m;}return v;}Surface c(vec3 m){Surface i,M=Surface(0,p(m-vec3(0,9,0)),Material(vec3(.5),vec3(.5),vec3(.5),50.,.5)),d=Surface(1,dot(m,vec3(0,1.5,0))+2.,Material(vec3(1),vec3(.5),vec3(.5),2.,0.)),e=Surface(2,f(m-vec3(5),5.),Material(vec3(.5),vec3(.5),vec3(.5),50.,.5)),z=Surface(3,f(m-vec3(-2,2,-3),3.),Material(vec3(1,.3,.2),vec3(.9,.5,.5),vec3(.9),50.,.3)),c=Surface(4,h(s(v*1e-4)*l(v*5e-4)*(m-vec3(-8,5,3))),Material(vec3(.5,.5,.8),vec3(.1),vec3(.9),50.,.5));i=h(d,M);i=h(i,e);i=h(i,z);return h(i,c);}vec3 c(vec3 m,vec3 v,vec3 d){vec3 f=e-.5*v.y,c=exp2(-abs((2.5e4-m.y)/v.y)*1e-5*M);f=f*c+(1.-c)*i;float h=dot(d,v);if(h>.9999)f=vec3(.9);return f;}float c(vec3 v,vec3 m){float i=1.,M=1.;for(int f=0;f<400;++f){if(M>=250.)return i;Surface d=c(m+M*v);if(d.d<1e-5)return 0.;i=min(i,10.*d.d/M);M+=d.d;}return i;}mat4 S(vec3 v){vec3 m=normalize(vec3(0,5,0)-v),M=normalize(cross(normalize(vec3(0,1,0)),m));return mat4(vec4(M,0),vec4(cross(m,M),0),vec4(-m,0),vec4(0,0,0,1));}vec3 S(vec3 v,vec3 m,vec3 d,vec3 e,float f,Material h){float l=c(v,d);vec3 z=exp2(-f*.05*M);return(h.m+h.d*clamp(dot(v,m)*l,0.,1.)+h.e*pow(clamp(dot(reflect(v,m),e),0.,1.),h.h))*z+(1.-z)*i;}Ray S(vec3 m,vec3 v){float i=1e-5,M=1e-5;Ray f;for(int d=0;d<400;d++){i=.001*M;f.o=m+M*v;f.d=c(f.o);if(f.d.d<i){f.h=true;break;}M+=f.d.d*.5;if(M>=250.)break;}f.d.d=M;return f;}vec3 l(vec3 m,vec3 f){vec3 M=normalize(vec3(0,10,v/5e2)),i=vec3(0);float d=1.;vec3 e=f;float z=0.;Ray h=S(m,e);for(int o=0;o<4;o++){if(!h.h){i=mix(i,c(m,e,M),d);break;}vec3 y=vec3(0);if(h.d.i==1)y=vec3(0,1,0);else if(h.d.i==2)y=normalize(h.o-.5*t(r(v*1e-4)*h.o*5.)-vec3(5));else if(h.d.i==3)y=normalize(h.o-vec3(-1,2,-3));else{const vec2 l=vec2(1,-1);y=normalize(l.xyy*c(h.o+l.xyy*1e-5).d+l.yyx*c(h.o+l.yyx*1e-5).d+l.yxy*c(h.o+l.yxy*1e-5).d+l.xxx*c(h.o+l.xxx*1e-5).d);}z+=h.d.d;vec3 l=S(M,y,h.o,e,z,h.d.m);i=mix(i,l,d);d*=h.d.m.f;if(d<1e-5)break;e=reflect(e,y);h=S(h.o,e);}if(!h.h||h.d.i==1){float l=clamp(dot(M,e),0.,1.);i+=.5*vec3(1,.5,.2)*pow(l,32.);}return i;}void main(){vec2 m=gl_FragCoord.xy-d/2.;vec3 i=vec3(-10.+20.*sin(v/1e4),4.+sin(v/5e3),-20.+20.*cos(v/1e4));mat4 f=S(i);vec3 h=l(i,(f*vec4(normalize(vec3(m,-d.y/tan(radians(60.)/2.))),0)).xyz);h=pow(h,M);h*=vec3(1.02,.99,.9);h.z=h.z+.1;h=smoothstep(0.,1.,h);gl_FragColor=vec4(h,1);}`
    );
    gl.compileShader(shader);
    gl.attachShader(program, shader);

    gl.linkProgram(program);

    shader = gl.createShader(0x8b31);
    gl.shaderSource(shader, V);
    gl.compileShader(shader);
    gl.attachShader(effectsProgram, shader);

    shader = gl.createShader(0x8b30);
    gl.shaderSource(
      shader,
      `precision highp float;uniform vec2 f;uniform sampler2D z,t;void main(){vec2 d=gl_FragCoord.xy/f;vec3 v=mix(texture2D(z,d).xyz,texture2D(t,d).xyz,.25);v*=.5+.5*pow(32.*d.x*d.y*(1.-d.x)*(1.-d.y),.5);gl_FragColor=vec4(v,1);}`
    );
    gl.compileShader(shader);
    gl.attachShader(effectsProgram, shader);

    gl.linkProgram(effectsProgram);

    A = 0x8892;
    B = 0xde1; // gl.TEXTURE_2D
    F = 0x8d40; // gl.FRAMEBUFFER

    // Two triangles filling the screen
    gl.bindBuffer(A, gl.createBuffer());
    gl.bufferData(A, new Float32Array([1, 1, 1, -1, -1, 1, -1, -1]), 0x88e4); // gl.STATIC_DRAW
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, 0x1406, false, 0, 0); // gl.FLOAT

    textures = [1, 2].map(() => {
      let texture = gl.createTexture();
      gl.bindTexture(B, texture);

      gl.texParameteri(B, 0x2800, 0x2600); // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(B, 0x2801, 0x2600); // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(B, 0x2802, 0x812f); // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(B, 0x2803, 0x812f); // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      gl.texImage2D(B, 0, 0x1908, w, h, 0, 0x1908, 0x1401, null); //gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

      // Create a framebuffer
      let fbo = gl.createFramebuffer();
      gl.bindFramebuffer(F, fbo);

      // Attach a texture to it.
      gl.framebufferTexture2D(F, 0x8ce0, B, texture, 0);

      return [texture, fbo];
    });

    // Lagrange, based on math here:
    // https://diego.assencio.com/?index=1500c66ae7ab27bb0106467c68feebc6
    L = (dt, k) => {
      let [angle1, angle2, angularVelocity1, angularVelocity2] = k.map(
        (K, i) => p[i] + K * dt
      );

      A1 = 4 / 15;
      A2 = 3 / 4;
      a1 = A1 * C(angle1 - angle2);
      a2 = A2 * C(angle1 - angle2);

      f1 =
        -(A1 * P(angularVelocity2, 2) * S(angle1 - angle2)) -
        (10 * S(angle1)) / 3;
      f2 = A2 * P(angularVelocity1, 2) * S(angle1 - angle2) - 2.5 * S(angle2);

      g1 = (f1 - a1 * f2) / (1 - a1 * a2);
      g2 = (f2 - a2 * f1) / (1 - a1 * a2);

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

      // Render the frame on framebuffer
      gl.bindFramebuffer(F, textures[frame % 2][1]);
      gl.viewport(0, 0, w, h);

      gl.clearColor(0, 0, 0, 1);
      gl.clear(0x4000);

      gl.useProgram(program);

      // gl.uniform1f(gl.getUniformLocation(program, "u_time"), now);
      // gl.uniform2f(gl.getUniformLocation(program, "u_resolution"), w, h);
      // x = S(p[0]) * 3;
      // y = -C(p[0]) * 3;
      // gl.uniform4f(
      //   gl.getUniformLocation(program, "u_p"),
      //   x,
      //   y,
      //   x + S(p[1]) * 4,
      //   y - C(p[1]) * 4
      // );

      gl.uniform1f(gl.getUniformLocation(program, "v"), now);
      gl.uniform2f(gl.getUniformLocation(program, "d"), w, h);
      x = S(p[0]) * 3;
      y = -C(p[0]) * 3;
      gl.uniform4f(
        gl.getUniformLocation(program, "m"),
        x,
        y,
        x + S(p[1]) * 4,
        y - C(p[1]) * 4
      );

      // Draw to frame buffer texture
      gl.drawArrays(5, 0, 4);

      // Effects shader, draw the scene from texture applying effects
      gl.bindFramebuffer(F, null);
      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(0x4000);

      gl.useProgram(effectsProgram);

      gl.uniform2f(gl.getUniformLocation(effectsProgram, "u_resolution"), w, h);
      gl.uniform1i(gl.getUniformLocation(effectsProgram, "u_texture0"), 0);
      gl.uniform1i(gl.getUniformLocation(effectsProgram, "u_texture1"), 1);

      gl.uniform2f(gl.getUniformLocation(effectsProgram, "f"), w, h);
      gl.uniform1i(gl.getUniformLocation(effectsProgram, "z"), 0);
      gl.uniform1i(gl.getUniformLocation(effectsProgram, "t"), 1);

      gl.activeTexture(0x84c0); // gl.TEXTURE0
      gl.bindTexture(B, textures[frame % 2][0]);
      frame += 1;
      gl.activeTexture(0x84c1); // gl.TEXTURE1
      gl.bindTexture(B, textures[frame % 2][0]);

      // Draw the averaged frame
      gl.drawArrays(5, 0, 4);

      window.requestAnimationFrame(render);
    }

    window.requestAnimationFrame(render);
  });
