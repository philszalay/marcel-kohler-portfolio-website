uniform vec3 uClickPositions[3];
uniform float uClickPositionTimes[3];
uniform float uAmplitude;
uniform float uRange;
uniform float uWaveSize;
uniform float uDecayFactor;
uniform float uWaveFactor;
uniform float uNewNormalTangentFactor;
uniform float uRippleZFactor;
uniform float uRippleXFactor;
uniform float uRippleYFactor;

#define STANDARD

varying vec3 vViewPosition;

#ifdef USE_TRANSMISSION
varying vec3 vWorldPosition;
#endif

#include <common>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>

float calcRippleEffect(vec3 position, vec3 clickPosition, float clickPositionTime) {
    float distance = distance(position, clickPosition);
    float rippleEffect = -uAmplitude * exp(uRange * -distance) * cos(uWaveSize * (distance - clickPositionTime)) * exp(-clickPositionTime + uDecayFactor) * cos(uWaveFactor * clickPositionTime);
    return rippleEffect;
}

vec3 orthogonal(vec3 v) {
    return normalize(abs(v.x) > abs(v.z) ? vec3(-v.y, v.x, 0.0) : vec3(0.0, -v.z, v.y));
}

void main() {
    #include <uv_vertex>
    #include <color_vertex>
    #include <morphcolor_vertex>

    #include <beginnormal_vertex>
    #include <morphnormal_vertex>
    #include <skinbase_vertex>
    #include <skinnormal_vertex>

    // position calculation and normals
    vec3 transformedNormal = objectNormal;

    // nearby
    float tangentFactor = uNewNormalTangentFactor;
    vec3 tangent1 = orthogonal(objectNormal);
    vec3 tangent2 = normalize(cross(objectNormal, tangent1));
    vec3 nearby1 = position + tangent1 * tangentFactor;
    vec3 nearby2 = position + tangent2 * tangentFactor;

    vec3 totalRippleEffect = vec3(0.);
    vec3 totalRippleEffectNearby1 = vec3(0.);
    vec3 totalRippleEffectNearby2 = vec3(0.);

    for(int i = 0; i < 3; i++) {
        if(uClickPositions[i] != vec3(0.)) {
            totalRippleEffect += calcRippleEffect(position, uClickPositions[i], uClickPositionTimes[i]);
            totalRippleEffectNearby1 += calcRippleEffect(nearby1, uClickPositions[i], uClickPositionTimes[i]);
            totalRippleEffectNearby2 += calcRippleEffect(nearby2, uClickPositions[i], uClickPositionTimes[i]);
        }
    }

    vec3 newPosition = vec3(position.x + totalRippleEffect.x * uRippleXFactor, position.y + totalRippleEffect.y * uRippleYFactor, position.z + totalRippleEffect.z * uRippleZFactor);
    vec3 newPositionNearby1 = vec3(nearby1.x + totalRippleEffectNearby1.x * uRippleXFactor, nearby1.y + totalRippleEffectNearby1.y * uRippleYFactor, nearby1.z + totalRippleEffectNearby1.z * uRippleZFactor);
    vec3 newPositionNearby2 = vec3(nearby2.x + totalRippleEffectNearby2.x * uRippleXFactor, nearby2.y + totalRippleEffectNearby2.y * uRippleYFactor, nearby2.z + totalRippleEffectNearby2.z * uRippleZFactor);

    transformedNormal = normalize(cross(newPositionNearby1 - newPosition, newPositionNearby2 - newPosition));

    #ifndef FLAT_SHADED // normal is computed with derivatives when FLAT_SHADED
    vNormal = normalize(transformedNormal);

        #ifdef USE_TANGENT
    vTangent = normalize(transformedTangent);
    vBitangent = normalize(cross(vNormal, vTangent) * tangent.w);
        #endif
      #endif

    #include <begin_vertex>
    #include <morphtarget_vertex>
    #include <skinning_vertex>
    #include <displacementmap_vertex>
    #include <project_vertex>
    #include <logdepthbuf_vertex>
    #include <clipping_planes_vertex>

    vViewPosition = -mvPosition.xyz;

    #include <worldpos_vertex>
    #include <shadowmap_vertex>
    #include <fog_vertex>

    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.);

    #ifdef USE_TRANSMISSION
    vWorldPosition = worldPosition.xyz;
    #endif
}