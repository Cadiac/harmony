precision highp float;

uniform vec2 u_resolution;
uniform sampler2D u_texture0;
uniform sampler2D u_texture1;

void main() {
  vec2 p = gl_FragCoord.xy / u_resolution;
  vec3 current = texture2D(u_texture0, p).xyz;
  vec3 previous = texture2D(u_texture1, p).xyz;

  vec3 color = mix(current, previous, 0.25);

  // Burn effect
  // color *= 0.5 + 0.5 * pow(16.0 * p.x * p.y * (1.0 - p.x) * (1.0 - p.y),
  // 0.05);
  color *= 0.5 + 0.5 * pow(32.0 * p.x * p.y * (1.0 - p.x) * (1.0 - p.y), 0.5);

  gl_FragColor = vec4(color, 1.0);
}
