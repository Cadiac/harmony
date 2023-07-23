precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_test;
uniform sampler2D u_audio;

uniform vec2 u_p1;
uniform vec2 u_p2;
uniform float u_r1;
uniform float u_r2;

const int MAX_MARCHING_STEPS = 400;
const int REFLECTIONS = 10;
const float MIN_DIST = 0.0;
const float MAX_DIST = 250.0;
const float FOV = 60.0;
const float EPSILON = 0.00001;
const float SPEED = 500.0;
const float PI = 3.14159;

const vec3 SUN_COLOR = vec3(0.9, 0.9, 0.9);
const vec3 SKY_COLOR = vec3(0.9, 0.8, 0.7);
const vec3 FOG_COLOR = vec3(0.8, 0.7, 0.6);
const vec3 COLOR_SHIFT = vec3(1.0, 0.92, 1.0);

struct Material {
  vec3 diffuse;
  float reflection;
};

struct Surface {
  int id;
  float dist;
  Material material;
};

// Translations
// http://en.wikipedia.org/wiki/Rotation_matrix#Basic_rotations
mat3 tRotateX(float theta) {
  float s = sin(theta);
  float c = cos(theta);

  return mat3(vec3(1, 0, 0), vec3(0, c, -s), vec3(0, s, c));
}

mat3 tRotateY(float theta) {
  float s = sin(theta);
  float c = cos(theta);

  return mat3(vec3(c, 0, s), vec3(0, 1, 0), vec3(-s, 0, c));
}

mat3 tRotateZ(float theta) {
  float s = sin(theta);
  float c = cos(theta);

  return mat3(vec3(c, -s, 0), vec3(s, c, 0), vec3(0, 0, 1));
}

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

float sdPendulum(in vec3 p) {
  vec3 offset = vec3(0.0, 9., 0.0);
  vec3 p1 = vec3(u_p1.x, u_p1.y, 0.0) + offset;
  vec3 p2 = vec3(u_p2.x, u_p2.y, 0.0) + offset;

  float ball1 = sdSphere(p - p1, u_r1);
  float ball2 = sdSphere(p - p2, u_r2);

  float line1 = sdCapsule(p, offset, p1, 0.05);
  float line2 = sdCapsule(p, p1, p2, 0.05);

  return min(min(ball1, ball2), min(line1, line2));
}

// https://iquilezles.org/articles/distfunctions/, MIT
float sdCylinder(vec3 p, vec3 c) { return length(p.xz - c.xy) - c.z; }

Surface opUnion(Surface a, Surface b) {
  if (a.dist < b.dist) {
    return a;
  }
  return b;
}

Surface scene(in vec3 p) {
  Surface surface;

  Surface pendulum =
      Surface(0, sdPendulum(p), Material(vec3(0.5, 0.5, 0.5), 0.5));
  Surface ground = Surface(1, sdPlane(p, vec3(0., 1., 0.), 2.0),
                           Material(vec3(0.5, 1.0, 1.0), 0.0));
  Surface sphere1 = Surface(2, sdSphere(p - vec3(5.0), 5.0),
                            Material(vec3(1.0, 1.0, 1.0), 0.7));
  Surface sphere2 = Surface(3, sdSphere(p - vec3(-1.0, 2.0, -3.0), 3.0),
                            Material(vec3(1.0, 0.3, 0.2), 0.3));

  surface = opUnion(ground, pendulum);
  surface = opUnion(surface, sphere1);
  surface = opUnion(surface, sphere2);

  return surface;
}

vec3 fog(in vec3 color, float dist) {
  vec3 e = exp2(-dist * 0.025 * COLOR_SHIFT);
  return color * e + (1.0 - e) * FOG_COLOR;
}

vec3 sky(in vec3 camera, in vec3 dir, in vec3 sun) {
  // Deeper blue when looking up
  vec3 color = SKY_COLOR - 0.5 * dir.y;

  // Fade to fog further away
  float dist = (25000. - camera.y) / dir.y;
  vec3 e = exp2(-abs(dist) * 0.00001 * COLOR_SHIFT);
  color = color * e + (1.0 - e) * FOG_COLOR;

  // Sun
  float dotSun = dot(sun, dir);
  if (dotSun > 0.9999) {
    float h = dir.y - sun.y;
    color = SUN_COLOR;
  }

  // Sun glare
  if (dotSun > 0.9998) {
    color = mix(color, SUN_COLOR, (dotSun - 0.9998) / (1. - 0.9998));
  }

  return color;
}

float softShadows(in vec3 sunDir, in vec3 p, float k) {
  float opacity = 1.0;
  float depth = 1.0;

  for (int s = 0; s < MAX_MARCHING_STEPS; ++s) {
    if (depth >= MAX_DIST) {
      return opacity;
    }

    Surface surface = scene(p + depth * sunDir);
    if (surface.dist < EPSILON) {
      return 0.0;
    }
    opacity = min(opacity, k * surface.dist / depth);
    depth += surface.dist;
  }

  return opacity;
}

// Tetrahedron technique, https://iquilezles.org/articles/normalsSDF/
vec3 calcNormal(in vec3 p) {
  const vec2 k = vec2(1, -1);
  return normalize(k.xyy * scene(p + k.xyy * EPSILON).dist +
                   k.yyx * scene(p + k.yyx * EPSILON).dist +
                   k.yxy * scene(p + k.yxy * EPSILON).dist +
                   k.xxx * scene(p + k.xxx * EPSILON).dist);
}

mat4 lookAt(vec3 camera, vec3 target, vec3 up) {
  vec3 f = normalize(target - camera);
  vec3 s = normalize(cross(up, f));
  vec3 u = cross(f, s);

  return mat4(vec4(s, 0.0), vec4(u, 0.0), vec4(-f, 0.0),
              vec4(0.0, 0.0, 0.0, 1.0));
}

vec3 lightning(in vec3 sun, in vec3 p, in vec3 camera, in vec3 normal,
               in vec3 material) {
  float beat = texture2D(u_audio, vec2(0.0, 0.5)).r * 3.;

  float dotNS = dot(normal, sun);
  vec3 sunLight = vec3(0.0);
  if (dotNS > 0.0) {
    sunLight = clamp(SUN_COLOR * dotNS * softShadows(sun, p, 10.0), 0.0, 1.0);
  }

  vec3 skyLight =
      clamp(SUN_COLOR * (0.5 + 0.5 * normal.y) * (0.5 * SKY_COLOR), 0.0, 1.0);

  float dotNB = dot(normal, -sun);
  vec3 bounceLight = vec3(0.0);
  if (dotNB > 0.0) {
    bounceLight = clamp(SUN_COLOR * dotNB * (0.4 * SUN_COLOR), 0.0, 1.0);
  }

  return clamp(material * (skyLight + sunLight + bounceLight), 0.0, 1.0);
}

struct RayResult {
  Surface surface;
  vec3 normal;
  vec3 pos;
  bool hit;
};

RayResult rayMarch(in vec3 camera, in vec3 rayDir, float start, float end) {
  // Check if we would hit the bounding plane before reaching "end"
  float stepsToBoundingPlane = (100.0 - camera.y) / rayDir.y;
  if (stepsToBoundingPlane > 0.0) {
    end = min(end, stepsToBoundingPlane);
  }

  float stepDist = 0.0;
  float dist = 0.0;
  float depth = start;

  RayResult result;

  for (int i = 0; i < MAX_MARCHING_STEPS; i++) {
    stepDist = 0.001 * depth;

    result.pos = camera + depth * rayDir;
    result.surface = scene(result.pos);

    if (result.surface.dist < stepDist) {
      result.hit = true;
      break;
    }

    depth += result.surface.dist * 0.5;

    if (depth >= end) {
      break;
    }
  }

  result.surface.dist = depth;
  result.normal = calcNormal(result.pos);

  return result;
}

vec3 render(in vec3 camera, in vec3 rayDir, float start, float end) {
  vec3 sun = normalize(vec3(0.0, 10.0, 10.0));

  vec3 color = vec3(0.0);
  float reflection = 1.0;
  vec3 dir = rayDir;

  float rayDist = 0.0;
  RayResult ray = rayMarch(camera, dir, start, end);

  for (int i = 0; i < REFLECTIONS; i++) {
    if (!ray.hit) {
      color = mix(color, sky(camera, rayDir, sun), reflection);
      break;
    }

    vec3 normal = ray.normal;

    // More accurate normals
    if (ray.surface.id == 1) {
      normal = vec3(0.0, 1.0, 0.0);
    } else if (ray.surface.id == 2) {
      normal = normalize(ray.pos - vec3(5.0));
    } else if (ray.surface.id == 3) {
      normal = normalize(ray.pos - vec3(-1.0, 2.0, -3.0));
    }

    rayDist += ray.surface.dist;
    vec3 newColor = ray.surface.material.diffuse;
    newColor = lightning(sun, ray.pos, camera, normal, newColor);
    newColor = fog(newColor, rayDist);

    color = mix(color, newColor, reflection);

    reflection *= ray.surface.material.reflection;
    if (reflection < EPSILON) {
      break;
    }

    dir = reflect(dir, normal);
    ray = rayMarch(ray.pos, dir, EPSILON, MAX_DIST);
  }

  return color;
}

vec3 rayDirection(float fov, vec2 dimensions, vec2 fragCoord) {
  vec2 xy = fragCoord - dimensions / 2.0;
  float z = dimensions.y / tan(radians(fov) / 2.0);
  return normalize(vec3(xy, -z));
}

void main() {
  vec3 viewDir = rayDirection(FOV, u_resolution, gl_FragCoord.xy);

  vec3 camera = vec3(-10. + 20. * sin(u_time / (20. * SPEED)),
                     4. + sin(u_time / (10. * SPEED)),
                     -20. + 20. * cos(u_time / (20. * SPEED)));

  // vec3 camera = vec3(20, 15, 20);
  vec3 target = vec3(0, 7, 0);

  // mat4 viewToWorld = lookAt(camera, target, normalize(vec3(1. - sin(u_time
  // / (10. * SPEED)), sin(u_time / (10. * SPEED)), 0.0)));
  mat4 viewToWorld = lookAt(camera, target, normalize(vec3(0., 1., 0.)));
  vec3 worldDir = (viewToWorld * vec4(viewDir, 0.0)).xyz;

  vec3 color = render(camera, worldDir, MIN_DIST, MAX_DIST);

  color = pow(color, vec3(1.0, 0.92, 1.0));
  color *= vec3(1.02, 0.99, 0.9);
  color.z = color.z + 0.1;

  color = smoothstep(0.0, 1.0, color);

  gl_FragColor = vec4(color, 1.0);
}