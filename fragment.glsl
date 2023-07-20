precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_test;
uniform sampler2D u_audio;

uniform vec2 u_p1;
uniform vec2 u_p2;

const int MAX_MARCHING_STEPS = 400;
const float MIN_DIST = 0.0;
const float MAX_DIST = 250.0;
const float FOV = 60.0;
const float EPSILON = 0.00001;
const float SPEED = 500.0;
const float PI = 3.14159;

const vec3 SUN_COLOR = vec3(0.9, 0.8, 0.7);
const vec3 SKY_COLOR = vec3(0.5, 0.4, 0.3);
const vec3 FOG_COLOR = vec3(0.5, 0.4, 0.3);
const vec3 COLOR_SHIFT = vec3(1.0, 1.0, 1.0);

// From https://www.shadertoy.com/view/ldl3W8
vec2 hash2(vec2 p) {
  return fract(
      sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) *
      43758.5453);
}

// https://www.shadertoy.com/view/lsl3RH
float noise(in vec2 p) { return sin(p.x) * sin(p.y); }

const mat2 m = mat2(0.80, 0.60, -0.60, 0.80);

// https://www.shadertoy.com/view/lsl3RH
float fbm4(vec2 p) {
  float f = 0.0;
  f += 0.5000 * noise(p);
  p = m * p * 2.02;
  f += 0.2500 * noise(p);
  p = m * p * 2.03;
  f += 0.1250 * noise(p);
  p = m * p * 2.01;
  f += 0.0625 * noise(p);
  return f / 0.9375;
}

// https://iquilezles.org/articles/distfunctions/, MIT
float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}

// https://iquilezles.org/articles/distfunctions/, MIT
float sdPlane(vec3 p, vec3 n, float h) { return dot(p, n) + h; }

// https://iquilezles.org/articles/distfunctions/, MIT
float sdSphere(vec3 p, float s) { return length(p) - s; }

float map(in vec3 p) {
  vec3 offset = vec3(0.0, 9., 0.0);
  vec3 p1 = vec3(u_p1.x, u_p1.y, 0.0) + offset;
  vec3 p2 = vec3(u_p2.x, u_p2.y, 0.0) + offset;

  float ball1 = sdSphere(p - p1, 0.2);
  float ball2 = sdSphere(p - p2, 0.2);

  float line1 = sdCapsule(p, offset, p1, 0.05);
  float line2 = sdCapsule(p, p1, p2, 0.05);

  float g = sdPlane(p, vec3(0., 1., 0.), 2.0);

  return min(g, min(min(ball1, ball2), min(line1, line2)));
}

vec3 fog(in vec3 color, float dist) {
  vec3 e = exp2(-dist * 0.055 * COLOR_SHIFT);
  return color * e + (1.0 - e) * FOG_COLOR;
}

float softShadows(in vec3 sunDir, in vec3 p, float k) {
  float opacity = 1.0;
  float depth = 1.0;

  for (int s = 0; s < MAX_MARCHING_STEPS; ++s) {
    if (depth >= MAX_DIST) {
      return opacity;
    }

    float dist = map(p + depth * sunDir);
    if (dist < EPSILON) {
      return 0.0;
    }
    opacity = min(opacity, k * dist / depth);
    depth += dist;
  }

  return opacity;
}

vec3 calcNormals(vec3 p) {
  float dx =
      map(vec3(p.x + EPSILON, p.y, p.z)) - map(vec3(p.x - EPSILON, p.y, p.z));
  float dy =
      map(vec3(p.x, p.y + EPSILON, p.z)) - map(vec3(p.x, p.y - EPSILON, p.z));
  float dz =
      map(vec3(p.x, p.y, p.z + EPSILON)) - map(vec3(p.x, p.y, p.z - EPSILON));
  return normalize(vec3(dx, dy, dz));
}

mat4 lookAt(vec3 camera, vec3 target, vec3 up) {
  vec3 f = normalize(target - camera);
  vec3 s = normalize(cross(up, f));
  vec3 u = cross(f, s);

  return mat4(vec4(s, 0.0), vec4(u, 0.0), vec4(-f, 0.0),
              vec4(0.0, 0.0, 0.0, 1.0));
}

vec3 lightning(in vec3 sun, in vec3 p, in vec3 camera, in vec3 material) {
  float beat = texture2D(u_audio, vec2(0.0, 0.5)).r * 3.;

  vec3 n = calcNormals(p);

  float dotNS = dot(n, sun);
  vec3 sunLight = vec3(0.0);
  if (dotNS > 0.0) {
    sunLight = clamp(SUN_COLOR * dotNS * softShadows(sun, p, 24.0), 0.0, 1.0);
  }

  vec3 skyLight =
      clamp(SUN_COLOR * (0.5 + 0.5 * n.y) * (0.5 * SKY_COLOR), 0.0, 1.0);

  float dotNB = dot(n, -sun);
  vec3 bounceLight = vec3(0.0);
  if (dotNB > 0.0) {
    bounceLight = clamp(SUN_COLOR * dotNB * (0.4 * SUN_COLOR), 0.0, 1.0);
  }

  return clamp(material * (skyLight + sunLight + bounceLight), 0.0, 1.0);
}

float rayMarch(in vec3 camera, in vec3 rayDir, float start, float end) {
  // Check if we would hit the bounding plane before reaching "end"
  float stepsToBoundingPlane = (100.0 - camera.y) / rayDir.y;
  if (stepsToBoundingPlane > 0.0) {
    end = min(end, stepsToBoundingPlane);
  }

  float stepDist = 0.0;
  float dist = 0.0;
  float depth = start;

  for (int i = 0; i < MAX_MARCHING_STEPS; i++) {
    stepDist = 0.001 * depth;

    vec3 pos = camera + depth * rayDir;
    float dist = map(pos);

    if (dist < stepDist) {
      break;
    }

    depth += dist * 0.5;

    if (depth >= end)
      break;
  }

  if (depth >= end) {
    return -1.0;
  }

  return depth;
}

vec3 rayDirection(float fov, vec2 dimensions, vec2 fragCoord) {
  vec2 xy = fragCoord - dimensions / 2.0;
  float z = dimensions.y / tan(radians(fov) / 2.0);
  return normalize(vec3(xy, -z));
}

void main() {
  vec3 viewDir = rayDirection(FOV, u_resolution, gl_FragCoord.xy);

  // vec3 camera = vec3(-10. + 20. * sin(u_time / (20. * SPEED)),
  //                    4. + sin(u_time / (10. * SPEED)),
  //                    -20. + 20. * cos(u_time / (20. * SPEED)));

  vec3 camera = vec3(0, 10, 30);
  vec3 target = vec3(0, 7, 0);

  // mat4 viewToWorld = lookAt(camera, target, normalize(vec3(1. - sin(u_time /
  // (10. * SPEED)), sin(u_time / (10. * SPEED)), 0.0)));
  mat4 viewToWorld = lookAt(camera, target, normalize(vec3(0., 1., 0.)));
  vec3 worldDir = (viewToWorld * vec4(viewDir, 0.0)).xyz;

  float dist = rayMarch(camera, worldDir, MIN_DIST, MAX_DIST);

  vec3 sun = normalize(vec3(0.0, 10.0, 10.0));

  if (dist < 0.0) {
    gl_FragColor = vec4(SKY_COLOR, 1.0);
  } else {
    vec3 material = vec3(1.0, 1.0, 1.0);

    vec3 p = camera + dist * worldDir;

    vec3 color = lightning(sun, p, camera, material);
    color = fog(color, dist);

    color = pow(color, vec3(1.0, 0.92, 1.0));
    color *= vec3(1.02, 0.99, 0.9);
    color.z = color.z + 0.1;

    color = smoothstep(0.0, 1.0, color);

    gl_FragColor = vec4(color, 1.0);
  }
}