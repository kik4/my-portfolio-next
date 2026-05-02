import * as THREE from "three";

// Silhouette outline material using the classic backface-hull technique:
// render the same geometry with side: BackSide and inflate every vertex
// outward along its world-space outward direction. Outward direction is taken
// as normalize(position) (i.e. the vector from the head center) instead of the
// vertex normal, because the head mesh has degenerate triangles at the apex /
// chin where normals are unreliable. The outward direction from the origin is
// always sensible.
//
// thickness is in world units (the head spans roughly Y=-1.1..1, so 0.02 is a
// thin pen line on screen at the default camera distance).

export const createOutlineMaterial = (
  color: string,
  thickness: number,
): THREE.ShaderMaterial =>
  new THREE.ShaderMaterial({
    uniforms: {
      outlineColor: { value: new THREE.Color(color) },
      outlineThickness: { value: thickness },
    },
    vertexShader: /* glsl */ `
      uniform float outlineThickness;

      void main() {
        vec3 outward = normalize(position);
        vec3 inflated = position + outward * outlineThickness;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(inflated, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 outlineColor;

      void main() {
        gl_FragColor = vec4(outlineColor, 1.0);
      }
    `,
    side: THREE.BackSide,
    depthTest: true,
    depthWrite: true,
  });
