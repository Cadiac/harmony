precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform sampler2D u_texture0;
uniform sampler2D u_texture1;

void main() {
  vec2 p = gl_FragCoord.xy / u_resolution;
  vec3 current = texture2D(u_texture0, p).xyz;
  vec3 previous = texture2D(u_texture1, p).xyz;

  vec3 color = mix(current, previous, 0.25);

  // Burn effect
  float burn = u_time < 40000. ? 0. : (u_time - 40000.) / 7000.;
  color *= 0.5 + (0.5 + burn) *
                     pow(32.0 * p.x * p.y * (1.0 - p.x) * (1.0 - p.y), 0.5);
  color += burn * vec3(1.);

  gl_FragColor = vec4(color, 1.0);
}
