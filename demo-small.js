C = Math.cos;
S = Math.sin;
P = Math.pow;

run = () => {
  // Initialize synth, needs to be done here with the click event
  // Synth
  a = new AudioContext();

  // Master volume
  let volumeNode = a.createGain();
  volumeNode.gain.value = 0;
  volumeNode.gain.linearRampToValueAtTime(0.8, a.currentTime + 6);
  volumeNode.gain.linearRampToValueAtTime(0.5, a.currentTime + 10);
  volumeNode.gain.linearRampToValueAtTime(0.8, a.currentTime + 22);
  volumeNode.gain.linearRampToValueAtTime(0, a.currentTime + 42);

  // Lowpass filter
  let lowpassFilterNode = a.createBiquadFilter();
  lowpassFilterNode.type = "lowpass";

  // Pink noise
  let bufferSize = a.sampleRate * 4; // 4 seconds of audio
  let noiseBuffer = a.createBuffer(1, bufferSize, a.sampleRate);

  // Based on https://noisehack.com/generate-noise-web-audio-api/
  // which in turn is based on "Paul Kellet’s refined method", now 404
  let b = [0, 0, 0, 0, 0, 0, 0];
  let channelData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    f = Math.random() * 2 - 1;

    b[0] = 0.99886 * b[0] + f * 0.0555179;
    b[1] = 0.99332 * b[1] + f * 0.0750759;
    b[2] = 0.969 * b[2] + f * 0.153852;
    b[3] = 0.8665 * b[3] + f * 0.3104856;
    b[4] = 0.55 * b[4] + f * 0.5329522;
    b[5] = -0.7616 * b[5] - f * 0.016898;

    // b[0] = 0.999 * b[0] + f * 0.0556;
    // b[1] = 0.993 * b[1] + f * 0.075;
    // b[2] = 0.969 * b[2] + f * 0.154;
    // b[3] = 0.867 * b[3] + f * 0.31;
    // b[4] = 0.55 * b[4] + f * 0.533;
    // b[5] = -0.762 * b[5] - f * 0.017;

    channelData[i] = b.reduce((value, acc) => value + acc) + f * 0.5362;
    channelData[i] *= 0.11; // (roughly) compensate for gain
    b[6] = f * 0.116;
  }

  // Connect the noise buffer to the filter
  let noiseGeneratorNode = a.createBufferSource();
  noiseGeneratorNode.buffer = noiseBuffer;
  noiseGeneratorNode.loop = true;

  // Gain node to control volume
  let noiseGainNode = a.createGain();
  noiseGainNode.gain.value = 0.5;
  noiseGainNode.connect(lowpassFilterNode);
  noiseGeneratorNode.connect(noiseGainNode);
  noiseGeneratorNode.start();

  lowpassFilterNode.connect(volumeNode);
  volumeNode.connect(a.destination);

  document.documentElement.requestFullscreen();
  setTimeout(() => {
    e = performance.now();
    t = 0;
    frame = 0;

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
      `precision highp float;uniform float v;uniform vec2 d;uniform vec4 m;const vec3 i=vec3(.8,.7,.6),M=vec3(1,.92,1),e=vec3(.7,.8,.9);struct Material{vec3 d;vec3 m;vec3 e;float h;float f;};struct Surface{int i;float d;Material m;};struct Ray{Surface d;vec3 n;vec3 o;bool h;};float n(float v){return fract(v*17.*fract(v*.3183099));}float f(vec3 v){vec3 d=floor(v),M=fract(v),i=M*M*(3.-2.*M);float m=d.x+317.*d.y+157.*d.z,e=n(m),o=n(m+1.),f=n(m+317.),z=n(m+318.),c=n(m+157.),h=n(m+158.),y=n(m+474.),S=n(m+475.);return-1.+2.*(e+(o-e)*i.x+(f-e)*i.y+(c-e)*i.z+(e-o-f+z)*i.x*i.y+(e-f-c+y)*i.y*i.z+(e-o-c+h)*i.z*i.x+(-e+o+f-z+c-h-y+S)*i.x*i.y*i.z);}float t(vec3 v){float m=0.,M=.5;for(int i=0;i<7;i++){float d=f(v);m+=M*d;M*=.5;v=2.*mat3(0.,.8,.6,-.8,.36,-.48,-.6,-.48,.64)*v;}return m;}mat3 s(float v){float m=sin(v),M=cos(v);return mat3(vec3(1,0,0),vec3(0,M,-m),vec3(0,m,M));}mat3 l(float v){float m=sin(v),M=cos(v);return mat3(vec3(M,0,m),vec3(0,1,0),vec3(-m,0,M));}mat3 r(float v){float m=sin(v),M=cos(v);return mat3(vec3(M,-m,0),vec3(m,M,0),vec3(0,0,1));}float f(vec3 v,vec3 m,vec3 e){vec3 i=v-m,M=e-m;return length(i-M*clamp(dot(i,M)/dot(M,M),0.,1.))-.05;}float f(vec3 v,float m){return length(v)-m;}float h(vec3 v){vec3 m=abs(v)-vec3(2);return length(max(m,0.))+min(max(m.x,max(m.y,m.z)),0.);}float x(vec3 v){vec3 M=vec3(m.xy,0),e=vec3(m.zw,0);float i=f(v,.3),d=f(v-M,.8),h=f(v-e,.5),c=f(v,vec3(0),M),z=f(v,M,e);return min(min(i,min(d,h)),min(c,z));}Surface h(Surface m,Surface v){if (m.d<v.d){return m;} return v;}Surface p(vec3 m){Surface i,M=Surface(0,x(m-vec3(0,9,0)),Material(vec3(.5),vec3(.5),vec3(.5),50.,.5)),d=Surface(1,dot(m,vec3(0,1.5,0))+2.,Material(vec3(1),vec3(.5),vec3(.5),2.,0.)),e=Surface(2,f(m-vec3(5),5.),Material(vec3(.5),vec3(.5),vec3(.5),50.,.5)),z=Surface(3,f(m-vec3(-2,2,-3),2.5),Material(vec3(1,.3,.2),vec3(.9,.5,.5),vec3(.9),50.,.3)),y=Surface(4,h(s(v*1e-4)*l(v*5e-4)*(m-vec3(-8,5,3))),Material(vec3(.5,.5,.8),vec3(.1),vec3(.9),50.,.5));i=h(d,M);i=h(i,e);i=h(i,z);return h(i,y);}vec3 h(vec3 m,vec3 v,vec3 d){vec3 f=e-.5*v.y,z=exp2(-abs((2.5e4-m.y)/v.y)*1e-5*M);f=f*z+(1.-z)*i;float c=dot(d,v);if(c>.9999)f=vec3(.9);return f;}float l(vec3 v,vec3 m){float i=1.,M=1.;for(int f=0;f<400;++f){if(M>=250.)return i;Surface d=p(m+M*v);if(d.d<1e-5)return 0.;i=min(i,10.*d.d/M);M+=d.d;}return i;}mat4 n(vec3 v,vec3 m){vec3 M=normalize(m-v),i=normalize(cross(normalize(vec3(0,1,0)),M));return mat4(vec4(i,0),vec4(cross(M,i),0),vec4(-M,0),vec4(0,0,0,1));}vec3 f(vec3 v,vec3 m,vec3 d,vec3 e,float f,Material h){float c=l(v,d);vec3 z=exp2(-f*.05*M);return(h.m+h.d*clamp(dot(v,m)*c,0.,1.)+h.e*pow(clamp(dot(reflect(v,m),e),0.,1.),h.h))*z+(1.-z)*i;}Ray p(vec3 m,vec3 v){float i=1e-5,M=1e-5;Ray f;for(int d=0;d<400;d++){i=.001*M;f.o=m+M*v;f.d=p(f.o);if(f.d.d<i){f.h=true;break;}M+=f.d.d*.5;if(M>=250.)break;}f.d.d=M;return f;}vec3 l(vec3 m,vec3 i,vec3 M){vec3 d=vec3(0);float e=1.;vec3 z=i;float c=0.;Ray n=p(m,z);for(int o=0;o<4;o++){if(!n.h){d=mix(d,h(m,z,M),e);break;}vec3 y=vec3(0);if(n.d.i==1)y=vec3(0,1,0);else if(n.d.i==2)y=normalize(n.o-.5*t(r(v*1e-4)*n.o*5.)-vec3(5));else if(n.d.i==3)y=normalize(n.o-vec3(-1,2,-3));else{const vec2 S=vec2(1,-1);y=normalize(S.xyy*p(n.o+S.xyy*1e-5).d+S.yyx*p(n.o+S.yyx*1e-5).d+S.yxy*p(n.o+S.yxy*1e-5).d+S.xxx*p(n.o+S.xxx*1e-5).d);}c+=n.d.d;vec3 S=f(M,y,n.o,z,c,n.d.m);d=mix(d,S,e);e*=n.d.m.f;if(e<1e-5)break;z=reflect(z,y);n=p(n.o,z);}if(!n.h||n.d.i==1){float y=clamp(dot(M,z),0.,1.);d+=.5*vec3(1,.5,.2)*pow(y,32.);}return d;}void main(){vec2 m=gl_FragCoord.xy-d/2.;vec3 i=vec3(-10.+20.*sin(v/5e3),4.+sin(v/2500.),-20.+20.*cos(v/5e3));mat4 f=n(i,vec3(0,5.+cos(v/5e3),0));vec3 e=l(i,(f*vec4(normalize(vec3(m,-d.y/tan(radians(60.)/2.))),0)).xyz,normalize(vec3(v/-7e2,10,v/5e2)));e=pow(e,M);e*=vec3(1.02,.99,.9);e.z=e.z+.1;e=smoothstep(0.,1.,e);if(v<1e3)e=mix(e,vec3(0),(1e3-v)/1e3);gl_FragColor=vec4(e,1);}`
    );
    // const res = await fetch("/fragment.glsl");
    // const fs = await res.text();
    // gl.shaderSource(shader, fs);
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
      `precision highp float;uniform float f;uniform vec2 h;uniform sampler2D z,t;void main(){vec2 v=gl_FragCoord.xy/h;vec3 u=mix(texture2D(z,v).xyz,texture2D(t,v).xyz,.25);float m=f<4e4?0.:(f-4e4)/7e3;u*=.5+(.5+m)*pow(32.*v.x*v.y*(1.-v.x)*(1.-v.y),.5);u+=m*vec3(1);gl_FragColor=vec4(u,1);}`
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

      g1 =
        (now > 2e4 ? -0.27 : 0) * angularVelocity1 +
        (f1 - a1 * f2) / (1 - a1 * a2);
      g2 =
        (now > 2e4 ? -0.27 : 0) * angularVelocity2 +
        (f2 - a2 * f1) / (1 - a1 * a2);

      return [angularVelocity1, angularVelocity2, g1, g2];
    };

    function render() {
      now = performance.now() - e;
      dt = (now - t) / 1e3;
      t = now;
      if (now > 45e3) return document.exitFullscreen();

      // Update pendulum

      // Runga-Kutta method
      X = L(0, [0, 0, 0, 0]);
      Y = L(dt / 2, X);
      Z = L(dt / 2, Y);
      W = L(dt, Z);

      p.map((_, i) => {
        p[i] += (dt * (X[i] + 2 * Y[i] + 2 * Z[i] + W[i])) / 6;
      });

      x = S(p[0]) * 3;
      y = -C(p[0]) * 3;

      // lowpassFilterNode.frequency.setValueAtTime(
      //   (0.01 * Math.abs(p[3]) * a.sampleRate) / 2,
      //   a.currentTime
      // );
      lowpassFilterNode.Q.setValueAtTime(15 + 15 * S(p[1]), a.currentTime);

      // Render the frame on framebuffer
      gl.bindFramebuffer(F, textures[frame % 2][1]);
      gl.viewport(0, 0, w, h);

      gl.clearColor(0, 0, 0, 1);
      gl.clear(0x4000);

      gl.useProgram(program);

      // gl.uniform1f(gl.getUniformLocation(program, "u_time"), now);
      // gl.uniform2f(gl.getUniformLocation(program, "u_resolution"), w, h);
      // gl.uniform4f(
      //   gl.getUniformLocation(program, "u_p"),
      //   x,
      //   y,
      //   x + S(p[1]) * 4,
      //   y - C(p[1]) * 4
      // );

      gl.uniform1f(gl.getUniformLocation(program, "v"), now);
      gl.uniform2f(gl.getUniformLocation(program, "d"), w, h);
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

      // gl.uniform1f(gl.getUniformLocation(effectsProgram, "u_time"), now);
      // gl.uniform2f(gl.getUniformLocation(effectsProgram, "u_resolution"), w, h);
      // gl.uniform1i(gl.getUniformLocation(effectsProgram, "u_texture0"), 0);
      // gl.uniform1i(gl.getUniformLocation(effectsProgram, "u_texture1"), 1);

      gl.uniform1f(gl.getUniformLocation(effectsProgram, "f"), now);
      gl.uniform2f(gl.getUniformLocation(effectsProgram, "h"), w, h);
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
  }, 2000);
};
