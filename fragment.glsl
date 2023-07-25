precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec4 u_p;
uniform vec2 u_r;

const float MAX_DIST = 250.0;
const float EPSILON = .00001;

const vec3 FOG_COLOR = vec3(.8, .7, .6);
const vec3 COLOR_SHIFT = vec3(1., .92, 1.);

struct M {
  vec3 d;
  vec3 m;
  vec3 e;
  float h;
  float f;
};

struct S {
  int i;
  float d;
  M m;
};

struct R {
  S d;
  vec3 n;
  vec3 o;
  bool h;
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

// https://iquilezles.org/articles/distfunctions/, MIT
float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), .0, 1.);
  return length(pa - ba * h) - r;
}

// https://iquilezles.org/articles/distfunctions/, MIT
float sdSphere(vec3 p, float s) { return length(p) - s; }

float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float sdPendulum(in vec3 p) {
  vec3 offset = vec3(0., 9., 0.);
  vec3 p1 = vec3(u_p.xy, 0.) + offset;
  vec3 p2 = vec3(u_p.zw, 0.) + offset;

  float ball1 = sdSphere(p - p1, u_r.x);
  float ball2 = sdSphere(p - p2, u_r.y);

  float line1 = sdCapsule(p, offset, p1, 0.05);
  float line2 = sdCapsule(p, p1, p2, 0.05);

  return min(min(ball1, ball2), min(line1, line2));
}

S opUnion(S a, S b) {
  if (a.d < b.d) {
    return a;
  }
  return b;
}

S scene(in vec3 p) {
  S surface;

  S pendulum =
      S(0, sdPendulum(p), M(vec3(0.5), vec3(0.5), vec3(0.5), 50.0, 0.5));
  S ground = S(1, dot(p, vec3(0., 1., 0.)) + 2.0,
               M(vec3(1.0, 1.0, 1.0), vec3(0.5), vec3(0.5), 2.0, 0.0));
  S sphere1 = S(2, sdSphere(p - vec3(5.0), 5.0),
                M(vec3(0.9), vec3(0.5), vec3(0.5), 50.0, 0.5));
  S sphere2 =
      S(3, sdSphere(p - vec3(-2.0, 2.0, -3.0), 3.0),
        M(vec3(1.0, 0.3, 0.2), vec3(0.9, 0.5, 0.5), vec3(0.9), 50.0, 0.3));

  S box1 = S(4,
             sdBox(tRotateX(u_time * 0.0001) * tRotateY(u_time * 0.0005) *
                       (p - vec3(-8, 5, 3)),
                   vec3(2)),
             M(vec3(0.5, 0.5, 0.8), vec3(0.1), vec3(0.9), 50.0, 0.5));

  surface = opUnion(ground, pendulum);
  surface = opUnion(surface, sphere1);
  surface = opUnion(surface, sphere2);
  surface = opUnion(surface, box1);

  return surface;
}

vec3 fog(in vec3 color, float dist) {
  vec3 e = exp2(-dist * .05 * COLOR_SHIFT);
  return color * e + (1. - e) * FOG_COLOR;
}

vec3 sky(in vec3 camera, in vec3 dir, in vec3 sun) {
  // Deeper blue when looking up
  vec3 color = vec3(.7, .8, .9) - .5 * dir.y;

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

  // Sun glare
  if (dotSun > .9998) {
    color = mix(color, vec3(.9), (dotSun - .9998) / (1. - .9998));
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

    S surface = scene(p + depth * sunDir);
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

vec3 phong(in vec3 sun, in vec3 normal, in vec3 p, in vec3 rayDir, M material) {
  vec3 ambient = material.m;

  float dotLN = clamp(dot(sun, normal) * softShadows(sun, p, 10.0), 0., 1.);
  vec3 diffuse = material.d * dotLN;

  float dotRV = clamp(dot(reflect(sun, normal), rayDir), 0., 1.);
  vec3 specular = material.e * pow(dotRV, material.h);

  return ambient + diffuse + specular;
}

R rayMarch(in vec3 camera, in vec3 rayDir) {
  float stepDist = EPSILON;
  float dist = EPSILON;
  float depth = EPSILON;

  R result;

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

  // Tetrahedron technique, https://iquilezles.org/articles/normalsSDF/
  const vec2 k = vec2(1, -1);
  vec3 p = result.o;
  result.n = normalize(k.xyy * scene(p + k.xyy * EPSILON).d +
                       k.yyx * scene(p + k.yyx * EPSILON).d +
                       k.yxy * scene(p + k.yxy * EPSILON).d +
                       k.xxx * scene(p + k.xxx * EPSILON).d);

  return result;
}

vec3 render(in vec3 camera, in vec3 rayDir) {
  vec3 sun = normalize(vec3(0.0, 10.0, 10.0));

  vec3 color = vec3(0.0);
  float reflection = 1.0;
  vec3 dir = rayDir;

  float rayDist = 0.0;
  R ray = rayMarch(camera, dir);

  for (int i = 0; i < 10; i++) {
    if (!ray.h) {
      color = mix(color, sky(camera, dir, sun), reflection);
      break;
    }

    vec3 normal = ray.n;

    // More accurate normals
    if (ray.d.i == 1) {
      normal = vec3(0.0, 1.0, 0.0);
    } else if (ray.d.i == 2) {
      normal = normalize(ray.o - vec3(5.0));
    } else if (ray.d.i == 3) {
      normal = normalize(ray.o - vec3(-1.0, 2.0, -3.0));
    }

    rayDist += ray.d.d;
    vec3 newColor = phong(sun, normal, ray.o, dir, ray.d.m);
    newColor = fog(newColor, rayDist);

    color = mix(color, newColor, reflection);

    reflection *= ray.d.m.f;
    if (reflection < EPSILON) {
      break;
    }

    dir = reflect(dir, normal);
    ray = rayMarch(ray.o, dir);
  }

  return color;
}

void main() {
  vec2 xy = gl_FragCoord.xy - u_resolution / 2.0;
  float z = u_resolution.y / tan(radians(60.0) / 2.0);
  vec3 viewDir = normalize(vec3(xy, -z));

  float speed = 500.;

  vec3 camera = vec3(-10. + 20. * sin(u_time / (20. * speed)),
                     4. + sin(u_time / (10. * speed)),
                     -20. + 20. * cos(u_time / (20. * speed)));

  vec3 target = vec3(0, 5, 0);

  // mat4 viewToWorld = lookAt(camera, target,
  //                           normalize(vec3(1. - sin(u_time / (10. * speed)),
  //                                          sin(u_time / (10. * speed)),
  //                                          0.0)));
  mat4 viewToWorld = lookAt(camera, target, normalize(vec3(0., 1., 0.)));
  vec3 worldDir = (viewToWorld * vec4(viewDir, 0.0)).xyz;

  vec3 color = render(camera, worldDir);

  color = pow(color, COLOR_SHIFT);
  color *= vec3(1.02, 0.99, 0.9);
  color.z = color.z + 0.1;

  color = smoothstep(0.0, 1.0, color);

  gl_FragColor = vec4(color, 1.0);
}