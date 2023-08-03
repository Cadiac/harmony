precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec4 u_p;

const float MAX_DIST = 250.0;
const float EPSILON = .00001;

const vec3 FOG_COLOR = vec3(.8, .7, .6);
const vec3 COLOR_SHIFT = vec3(1., .92, 1.);
const vec3 SKY_COLOR = vec3(.7, .8, .9);

struct Material {
  vec3 d;
  vec3 m;
  vec3 e;
  float h;
  float f;
};

struct Surface {
  int i;
  float d;
  Material m;
};

struct Ray {
  Surface d;
  vec3 n;
  vec3 o;
  bool h;
};

// Noise functions
// Taken from IQ, https://iquilezles.org/, MIT
float hash1(float n) { return fract(n * 17.0 * fract(n * 0.3183099)); }

// Taken from IQ, https://iquilezles.org/, MIT
float noise(in vec3 x) {
  vec3 p = floor(x);
  vec3 w = fract(x);

  vec3 u = w * w * (3.0 - 2.0 * w);
  float n = p.x + 317.0 * p.y + 157.0 * p.z;

  float a = hash1(n + 0.0);
  float b = hash1(n + 1.0);
  float c = hash1(n + 317.0);
  float d = hash1(n + 318.0);
  float e = hash1(n + 157.0);
  float f = hash1(n + 158.0);
  float g = hash1(n + 474.0);
  float h = hash1(n + 475.0);

  float k0 = a;
  float k1 = b - a;
  float k2 = c - a;
  float k3 = e - a;
  float k4 = a - b - c + d;
  float k5 = a - c - e + g;
  float k6 = a - b - e + f;
  float k7 = -a + b + c - d + e - f - g + h;

  return -1.0 + 2.0 * (k0 + k1 * u.x + k2 * u.y + k3 * u.z + k4 * u.x * u.y +
                       k5 * u.y * u.z + k6 * u.z * u.x + k7 * u.x * u.y * u.z);
}

// Taken from IQ, https://iquilezles.org/, MIT
float fbm(in vec3 x) {
  float f = 2.0;
  float s = 0.5;
  float a = 0.0;
  float b = 0.5;
  for (int i = 0; i < 7; i++) {
    float n = noise(x);
    a += b * n;
    b *= s;
    x = f * mat3(0.00, 0.80, 0.60, -0.80, 0.36, -0.48, -0.60, -0.48, 0.64) * x;
  }
  return a;
}

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

// https://iquilezles.org/articles/distfunctions/, MIT
float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), .0, 1.);
  return length(pa - ba * h) - r;
}

// https://iquilezles.org/articles/distfunctions/, MIT
float sdSphere(vec3 p, float s) { return length(p) - s; }

// https://iquilezles.org/articles/distfunctions/, MIT
float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float sdPendulum(in vec3 p) {
  vec3 p1 = vec3(u_p.xy, 0.);
  vec3 p2 = vec3(u_p.zw, 0.);

  float ball0 = sdSphere(p, .3);
  float ball1 = sdSphere(p - p1, 0.8);
  float ball2 = sdSphere(p - p2, 0.5);

  float line1 = sdCapsule(p, vec3(0), p1, 0.05);
  float line2 = sdCapsule(p, p1, p2, 0.05);

  return min(min(ball0, min(ball1, ball2)), min(line1, line2));
}

Surface opUnion(Surface a, Surface b) {
  if (a.d < b.d) {
    return a;
  }
  return b;
}

Surface scene(in vec3 p) {
  Surface surface;

  Surface pendulum =
      Surface(0, sdPendulum(p - vec3(0., 9., 0.)),
              Material(vec3(0.5), vec3(0.5), vec3(0.5), 50.0, 0.5));
  Surface ground = Surface(1, dot(p, vec3(0., 1.5, 0.)) + 2.0,
                           Material(vec3(1.), vec3(.5), vec3(.5), 2.0, 0.0));
  Surface sphere1 =
      Surface(2, sdSphere(p - vec3(5.0), 5.0),
              Material(vec3(0.5), vec3(0.5), vec3(0.5), 50.0, 0.5));
  Surface sphere2 = Surface(
      3, sdSphere(p - vec3(-2.0, 2.0, -3.0), 2.5),
      Material(vec3(1.0, 0.3, 0.2), vec3(0.9, 0.5, 0.5), vec3(0.9), 50.0, 0.3));

  Surface box1 =
      Surface(4,
              sdBox(tRotateX(u_time * 0.0001) * tRotateY(u_time * 0.0005) *
                        (p - vec3(-8, 5, 3)),
                    vec3(2)),
              Material(vec3(0.5, 0.5, 0.8), vec3(0.1), vec3(0.9), 50.0, 0.5));

  surface = opUnion(ground, pendulum);
  surface = opUnion(surface, sphere1);
  surface = opUnion(surface, sphere2);
  surface = opUnion(surface, box1);

  return surface;
}

vec3 sky(in vec3 camera, in vec3 dir, in vec3 sun) {
  // Deeper blue when looking up
  vec3 color = SKY_COLOR - .5 * dir.y;

  // Fade to fog further away
  float dist = (25000. - camera.y) / dir.y;
  vec3 e = exp2(-abs(dist) * EPSILON * COLOR_SHIFT);
  color = color * e + (1.0 - e) * FOG_COLOR;

  // Sun
  float dotSun = dot(sun, dir);
  if (dotSun > .9999) {
    float h = dir.y - sun.y;
    color = vec3(.9);
  }

  return color;
}

float softShadows(in vec3 sunDir, in vec3 p, float k) {
  float opacity = 1.;
  float depth = 1.;

  for (int s = 0; s < 400; ++s) {
    if (depth >= MAX_DIST) {
      return opacity;
    }

    Surface surface = scene(p + depth * sunDir);
    if (surface.d < EPSILON) {
      return 0.;
    }
    opacity = min(opacity, k * surface.d / depth);
    depth += surface.d;
  }

  return opacity;
}

mat4 lookAt(vec3 camera, vec3 target, vec3 up) {
  vec3 f = normalize(target - camera);
  vec3 s = normalize(cross(up, f));
  vec3 u = cross(f, s);

  return mat4(vec4(s, .0), vec4(u, .0), vec4(-f, .0), vec4(.0, .0, .0, 1.));
}

vec3 lightning(in vec3 sun, in vec3 normal, in vec3 p, in vec3 rayDir,
               in float rayDist, Material material) {
  vec3 ambient = material.m;

  float shadow = softShadows(sun, p, 10.0);
  float dotLN = clamp(dot(sun, normal) * shadow, 0., 1.);
  vec3 diffuse = material.d * dotLN;

  float dotRV = clamp(dot(reflect(sun, normal), rayDir), 0., 1.);
  vec3 specular = material.e * pow(dotRV, material.h);

  vec3 color = ambient + diffuse + specular;

  // Fog
  vec3 e = exp2(-rayDist * .05 * COLOR_SHIFT);
  return color * e + (1. - e) * FOG_COLOR;
}

Ray rayMarch(in vec3 camera, in vec3 rayDir) {
  float stepDist = EPSILON;
  float dist = EPSILON;
  float depth = EPSILON;

  Ray result;

  for (int i = 0; i < 400; i++) {
    stepDist = 0.001 * depth;

    result.o = camera + depth * rayDir;
    result.d = scene(result.o);

    if (result.d.d < stepDist) {
      result.h = true;
      break;
    }

    depth += result.d.d * 0.5;

    if (depth >= MAX_DIST) {
      break;
    }
  }

  result.d.d = depth;

  return result;
}

vec3 render(vec3 camera, vec3 rayDir, vec3 sun) {
  vec3 color = vec3(0.0);
  float reflection = 1.0;
  vec3 dir = rayDir;

  float rayDist = 0.0;
  Ray ray = rayMarch(camera, dir);

  for (int i = 0; i < 4; i++) {
    if (!ray.h) {
      color = mix(color, sky(camera, dir, sun), reflection);
      break;
    }

    vec3 normal = vec3(0.);

    // More accurate normals for spheres and ground
    if (ray.d.i == 1) {
      normal = vec3(.0, 1., 0.);
    } else if (ray.d.i == 2) {
      normal =
          normalize(ray.o - 0.5 * fbm(tRotateZ(u_time * 0.0001) * ray.o * 5.) -
                    vec3(5.0));
    } else if (ray.d.i == 3) {
      normal = normalize(ray.o - vec3(-1.0, 2.0, -3.0));
    } else {
      // Tetrahedron technique, https://iquilezles.org/articles/normalsSDF/
      const vec2 k = vec2(1, -1);
      normal = normalize(k.xyy * scene(ray.o + k.xyy * EPSILON).d +
                         k.yyx * scene(ray.o + k.yyx * EPSILON).d +
                         k.yxy * scene(ray.o + k.yxy * EPSILON).d +
                         k.xxx * scene(ray.o + k.xxx * EPSILON).d);
    }

    rayDist += ray.d.d;
    vec3 newColor = lightning(sun, normal, ray.o, dir, rayDist, ray.d.m);

    color = mix(color, newColor, reflection);

    reflection *= ray.d.m.f;
    if (reflection < EPSILON) {
      break;
    }

    dir = reflect(dir, normal);
    ray = rayMarch(ray.o, dir);
  }

  // Add sun glare to sky and the ground plane
  if (!ray.h || ray.d.i == 1) {
    float glare = clamp(dot(sun, dir), 0.0, 1.0);
    color += 0.5 * vec3(1., .5, .2) * pow(glare, 32.0);
  }
  return color;
}

void main() {
  vec2 xy = gl_FragCoord.xy - u_resolution / 2.0;
  float z = u_resolution.y / tan(radians(60.0) / 2.0);
  vec3 viewDir = normalize(vec3(xy, -z));

  float speed = 250.;

  vec3 camera = vec3(-10. + 20. * sin(u_time / (20. * speed)),
                     4. + sin(u_time / (10. * speed)),
                     -20. + 20. * cos(u_time / (20. * speed)));
  vec3 target = vec3(0., 5. + cos(u_time / (20. * speed)), 0.);
  vec3 sun = normalize(vec3(u_time / -700., 10.0, u_time / 500.));

  // mat4 viewToWorld = lookAt(camera, target,
  //                           normalize(vec3(1. - sin(u_time / (10. * speed)),
  //                                          sin(u_time / (10. * speed)),
  //                                          0.0)));
  mat4 viewToWorld = lookAt(camera, target, normalize(vec3(0., 1., 0.)));
  vec3 worldDir = (viewToWorld * vec4(viewDir, 0.0)).xyz;

  vec3 color = render(camera, worldDir, sun);

  color = pow(color, COLOR_SHIFT);
  color *= vec3(1.02, 0.99, 0.9);
  color.z = color.z + 0.1;

  color = smoothstep(0.0, 1.0, color);

  if (u_time < 1000.) {
    color = mix(color, vec3(0.), (1000. - u_time) / 1000.);
  }

  gl_FragColor = vec4(color, 1.0);
}