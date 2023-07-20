(function () {
  const vs = `attribute vec2 p;void main(){gl_Position=vec4(p,0,1);}`;
  const fs = `precision highp float;uniform float u_time;uniform vec2 u_resolution,u_test;const vec3 v=vec3(.8,1,1),f=vec3(.86,.83,.69),t=vec3(.14,.12,.58),z=vec3(1);float n(vec3 v,float z){return length(v)-z;}float e(vec3 v,float z){return v.y-z;}float e(vec3 v){float f=e(v,0.),z=n(v-vec3(0,1,0),.6);return min(f,z);}vec3 p(vec3 v,float f){vec3 y=exp2(-f*.01*z);return v*y+(1.-y)*t;}float e(vec3 v,vec3 f,float z){float r=1.,i=1.;for(int y=0;y<400;++y){if(i>=100.)return r;float n=e(f+i*v);if(n<1e-5)return 0.;r=min(r,z*n/i);i+=n;}return r;}vec3 n(vec3 v){float f=e(vec3(v.x+1e-5,v.yz))-e(vec3(v.x-1e-5,v.yz)),z=e(vec3(v.x,v.y+1e-5,v.z))-e(vec3(v.x,v.y-1e-5,v.z)),y=e(vec3(v.xy,v.z+1e-5))-e(vec3(v.xy,v.z-1e-5));return normalize(vec3(f,z,y));}mat4 n(vec3 v,vec3 f,vec3 z){vec3 y=normalize(f-v),r=normalize(cross(z,y)),i=cross(y,r);return mat4(vec4(r,0),vec4(i,0),vec4(-y,0),vec4(0,0,0,1));}vec3 e(vec3 z,vec3 y,vec3 r,vec3 i){vec3 m=n(y),u,x,t;float c=dot(m,z),g;u=vec3(0);if(c>0.)u=clamp(v*c*e(z,y,3.),0.,1.);x=clamp(v*(.5+.5*m.y)*(.5*f),0.,1.);g=dot(m,-z);t=vec3(0);if(g>0.)t=clamp(v*g*(.5*v),0.,1.);return clamp(i*(u+x+t),0.,1.);}float n(vec3 v,vec3 z,float n,float y){float f=(100.-v.y)/z.y,r,i,t;if(f>0.)y=min(y,f);r=0.;i=0.;t=n;for(int u=0;u<400;u++){r=.001*t;vec3 m=v+t*z;float c=e(m);if(c<r)break;t+=c*.5;if(t>=y)break;}if(t>=y)return-1.;return t;}vec3 p(float v,vec2 y,vec2 z){vec2 f=z-y/2.;float r=y.y/tan(radians(v)/2.);return normalize(vec3(f,-r));}void main(){vec3 v=p(60.,u_resolution,gl_FragCoord.xy),f=vec3(2,2,3),y=vec3(0,1,0),r,z;mat4 i=n(f,y,vec3(0,1,0));r=(i*vec4(v,0)).xyz;float t=n(f,r,0.,100.);z=normalize(vec3(1,10,1));if(t<0.)gl_FragColor=vec4(1,0,1,1);else{vec3 u=vec3(.6,.5,.4),x=f+t*r,c=e(z,x,f,u);c=p(c,t);c=pow(c,vec3(1,.92,1));c*=vec3(1.02,.99,.9);c.z=c.z+.1;c=smoothstep(0.,1.,c);gl_FragColor=vec4(c,1);}}`;

  const programs = [];

  let gl, canvas;

  // Constants, shorter than using full gl.NAME variants.
  var GL_VERTEX_SHADER = 0x8b31,
    GL_FRAGMENT_SHADER = 0x8b30,
    GL_ARRAY_BUFFER = 0x8892,
    GL_STATIC_DRAW = 0x88e4,
    GL_COLOR_BUFFER_BIT = 0x4000,
    GL_TRIANGLE_STRIP = 5,
    GL_FLOAT = 0x1406;

  const width = window.innerWidth,
    height = window.innerHeight;

  function loop() {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(GL_COLOR_BUFFER_BIT);

    const program = programs[0];
    gl.useProgram(program);

    const time = performance.now();

    gl.uniform1f(gl.getUniformLocation(program, "u_time"), time);
    gl.uniform2f(gl.getUniformLocation(program, "u_resolution"), width, height);

    gl.drawArrays(GL_TRIANGLE_STRIP, 0, 4);

    window.requestAnimationFrame(loop);
  }

  (function setup() {
    canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    canvas.width = width;
    canvas.height = height;

    const s = canvas.style;
    s.position = "fixed";
    s.left = s.top = 0;

    gl = canvas.getContext("experimental-webgl");

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

    window.requestAnimationFrame(loop);
  })();
})();
