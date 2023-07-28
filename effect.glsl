precision highp float;

uniform vec2 u_resolution;
uniform int u_active_fbo;
uniform sampler2D u_texture0;
uniform sampler2D u_texture1;

void main() {
  vec2 p = gl_FragCoord.xy / u_resolution;
  vec3 texel_0 = texture2D(u_texture0, p).xyz;
  vec3 texel_1 = texture2D(u_texture1, p).xyz;

  vec3 color = vec3(0);
  float average = 0.5; // 0 to 0.5

  if (u_active_fbo == 0) {
    color = mix(texel_0, texel_1, average);
  } else {
    color = mix(texel_1, texel_0, average);
  }

  // Burn effect
  color *= 0.5 + 0.5 * pow(16.0 * p.x * p.y * (1.0 - p.x) * (1.0 - p.y), 0.05);

  gl_FragColor = vec4(color, 1.0);
}
