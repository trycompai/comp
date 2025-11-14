# AutomationOrb Upgrade Plan: Three.js + Advanced Shaders

## Overview
Transform the Canvas 2D orb into a sophisticated 3D liquid sphere using Three.js with custom GLSL shaders, achieving Siri-like quality with brand colors.

---

## Architecture

### 1. **Core Components**
```
AutomationOrb (React Component)
├── Canvas (react-three/fiber)
│   ├── Scene
│   │   ├── MainSphere (ShaderMaterial)
│   │   ├── InternalLights (PointLights)
│   │   ├── CoreGlow (Mesh with emissive material)
│   │   └── PostProcessing (EffectsComposer)
│   └── Camera (Orthographic for 2D-like view)
```

### 2. **Shader System Architecture**

#### **Vertex Shader Responsibilities:**
- **Geometry Deformation**: Multi-octave Simplex noise for organic liquid movement
- **Surface Waves**: Sine/cosine wave combinations for fluid dynamics
- **Vertex Displacement**: Per-vertex noise-based displacement
- **Morphing**: Smooth transitions between deformation states
- **Floating Animation**: Subtle position oscillation

#### **Fragment Shader Responsibilities:**
- **Fresnel Effect**: Edge lighting based on view angle
- **Volumetric Lighting**: Internal light scattering simulation
- **Refraction**: Glass-like light bending (using normal perturbation)
- **Color Mixing**: Brand color gradients with smooth interpolation
- **Specular Highlights**: Dynamic reflection points
- **Rim Lighting**: Edge glow enhancement
- **Transparency**: Layered alpha blending

---

## Implementation Phases

### **Phase 1: Foundation Setup**
**Goal**: Basic Three.js sphere with custom shader material

**Tasks:**
1. Replace Canvas 2D with `@react-three/fiber` Canvas
2. Create base sphere geometry (high subdivision: 64x64 segments)
3. Set up ShaderMaterial with basic vertex/fragment shaders
4. Implement uniform system for time, colors, etc.
5. Configure camera (orthographic, fixed size: 96x96px)

**Key Uniforms:**
```glsl
uniform float u_time;
uniform vec3 u_brandColors[6]; // Primary colors array
uniform float u_scale;
uniform vec2 u_resolution;
uniform vec3 u_cameraPosition;
```

---

### **Phase 2: Advanced Vertex Shader**
**Goal**: Sophisticated liquid deformation

**Features:**
1. **Multi-Octave Simplex Noise**
   - 4-6 octaves for complex patterns
   - Time-based animation
   - Frequency scaling (1x, 2x, 4x, 8x)

2. **Liquid Wave System**
   - Primary wave: Slow, large amplitude
   - Secondary waves: Fast, small amplitude
   - Wave interference patterns
   - Directional flow simulation

3. **Surface Tension Simulation**
   - Smoothstep interpolation for fluid edges
   - Bezier-like curve approximation via noise
   - Maintains spherical base while deforming

4. **Breathing Animation**
   - Subtle scale pulsing (0.98x - 1.02x)
   - Multi-frequency breathing (slow + fast)
   - Smooth easing functions

**Shader Code Structure:**
```glsl
// Simplex noise function (from existing codebase)
float snoise(vec3 v) { ... }

// Multi-octave FBM
float fbm(vec3 p, int octaves) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  for(int i = 0; i < octaves; i++) {
    value += snoise(p * frequency) * amplitude;
    amplitude *= 0.5;
    frequency *= 2.0;
  }
  return value;
}

// Vertex displacement
vec3 displacement = normal * fbm(position * 0.5 + u_time * 0.1, 4) * 0.15;
```

---

### **Phase 3: Advanced Fragment Shader**
**Goal**: Realistic glass/liquid appearance with brand colors

**Features:**

1. **Fresnel Effect**
   ```glsl
   vec3 viewDir = normalize(cameraPosition - vPosition);
   float fresnel = pow(1.0 - dot(viewDir, vNormal), 2.0);
   ```

2. **Volumetric Lighting**
   - Internal light sources (3-4 point lights)
   - Light scattering through translucent material
   - Distance-based falloff
   - Color mixing based on light position

3. **Refraction Simulation**
   - Normal perturbation using noise
   - Screen-space distortion (if using post-processing)
   - Chromatic aberration on edges

4. **Brand Color System**
   ```glsl
   // Color mixing based on depth and position
   vec3 color1 = mix(u_brandColors[0], u_brandColors[1], depth);
   vec3 color2 = mix(u_brandColors[2], u_brandColors[3], fresnel);
   vec3 finalColor = mix(color1, color2, noiseValue);
   ```

5. **Specular Highlights**
   - Dynamic highlight positions (time-based)
   - Size variation based on surface curvature
   - Color tinted by brand colors

6. **Core Glow**
   - Bright white center with brand color tint
   - Pulsing intensity
   - Radial gradient falloff

**Fragment Shader Structure:**
```glsl
void main() {
  // 1. Calculate view-dependent effects
  vec3 viewDir = normalize(cameraPosition - vPosition);
  float fresnel = pow(1.0 - dot(viewDir, vNormal), 1.5);
  
  // 2. Volumetric lighting from internal sources
  vec3 lightAccum = vec3(0.0);
  for(int i = 0; i < 3; i++) {
    vec3 lightPos = u_lightPositions[i];
    float dist = length(vPosition - lightPos);
    float intensity = 1.0 / (1.0 + dist * dist);
    lightAccum += u_lightColors[i] * intensity;
  }
  
  // 3. Base color with depth variation
  float depth = length(vPosition) / u_maxRadius;
  vec3 baseColor = mix(u_brandColors[0], u_brandColors[1], depth);
  
  // 4. Fresnel rim lighting
  vec3 rimColor = mix(baseColor, u_brandColors[2], fresnel);
  
  // 5. Specular highlights
  float specular = calculateSpecular(vPosition, vNormal, u_time);
  
  // 6. Combine all effects
  vec3 finalColor = baseColor * 0.4 + lightAccum * 0.3 + rimColor * 0.2 + specular * 0.1;
  float alpha = 0.6 + fresnel * 0.3 + specular * 0.1;
  
  gl_FragColor = vec4(finalColor, alpha);
}
```

---

### **Phase 4: Internal Light System**
**Goal**: Animated internal lights that swirl within the orb

**Implementation:**
1. **Point Lights** (3-4 lights)
   - Positioned inside sphere
   - Animated orbital paths
   - Different speeds/directions
   - Brand-colored (teal, sky-blue, emerald)

2. **Light Animation**
   ```typescript
   useFrame((state) => {
     lights.forEach((light, i) => {
       const angle = state.clock.elapsedTime * light.speed + light.offset;
       light.position.set(
         Math.cos(angle) * light.radius,
         Math.sin(angle) * light.radius * 0.7,
         Math.sin(angle * 0.8) * light.radius * 0.5
       );
     });
   });
   ```

3. **Light Contribution in Shader**
   - Pass light positions/colors as uniforms
   - Calculate per-fragment lighting
   - Blend with base material

---

### **Phase 5: Post-Processing Effects**
**Goal**: Enhanced visual quality with post-processing

**Effects (using @react-three/postprocessing):**
1. **Bloom**
   - Glow on bright areas (core, highlights)
   - Intensity: 0.5-1.0
   - Threshold: 0.8

2. **Chromatic Aberration** (optional)
   - Subtle edge color separation
   - Very low intensity (0.1-0.2)

3. **Vignette** (optional)
   - Subtle darkening at edges
   - Very subtle (0.2 intensity)

**Setup:**
```typescript
import { EffectComposer, Bloom } from '@react-three/postprocessing';

<EffectComposer>
  <Bloom intensity={0.8} threshold={0.8} />
</EffectComposer>
```

---

### **Phase 6: Performance Optimization**
**Goal**: Smooth 60fps on all devices

**Optimizations:**
1. **Geometry LOD**
   - Reduce segments when orb is small/off-screen
   - Use 32x32 for small sizes, 64x64 for normal

2. **Shader Complexity**
   - Reduce noise octaves on lower-end devices
   - Use `renderer.capabilities.isWebGL2` to detect capabilities

3. **Frame Rate Management**
   - Use `useFrame` with delta time
   - Skip frames if performance drops
   - Adaptive quality based on FPS

4. **Uniform Updates**
   - Only update uniforms that change
   - Batch uniform updates
   - Use `useMemo` for static values

5. **Render Optimization**
   - Set `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))`
   - Use `antialias: true` but limit samples
   - Consider `powerPreference: "high-performance"`

---

### **Phase 7: Brand Color Integration**
**Goal**: Perfect brand color matching

**Color System:**
```typescript
const brandColors = {
  primaryDark: new THREE.Color(0x004c3a),    // rgb(0, 76, 58)
  primaryRich: new THREE.Color(0x00785c),   // rgb(0, 120, 92)
  primaryMid: new THREE.Color(0x00644b),     // rgb(0, 100, 75)
  skyTeal: new THREE.Color(0x0ea5e9),       // rgb(14, 165, 233)
  teal: new THREE.Color(0x14b8a6),          // rgb(20, 184, 166)
  emerald: new THREE.Color(0x10b981),       // rgb(16, 185, 129)
  white: new THREE.Color(0xffffff),
};

// Pass as uniform array
const colorUniforms = {
  u_brandColors: [
    brandColors.primaryDark,
    brandColors.primaryRich,
    brandColors.skyTeal,
    brandColors.teal,
    brandColors.emerald,
    brandColors.white,
  ],
};
```

**Shader Color Mixing:**
- Use depth for primary color selection
- Use fresnel for rim color
- Use noise for organic color variation
- Maintain brand identity while allowing natural variation

---

## Technical Specifications

### **Geometry**
- **Type**: `THREE.SphereGeometry`
- **Segments**: 64x64 (high quality), 32x32 (performance mode)
- **Radius**: 0.5 (normalized, scaled by uniform)

### **Material**
- **Type**: `THREE.ShaderMaterial`
- **Transparent**: `true`
- **Blending**: `THREE.AdditiveBlending` for glow layers
- **Depth Write**: `false` (for transparency)
- **Side**: `THREE.DoubleSide`

### **Camera**
- **Type**: `THREE.OrthographicCamera`
- **Size**: 96x96px (matches current canvas size)
- **Position**: `[0, 0, 5]`
- **Near/Far**: `0.1, 100`

### **Lights**
- **Type**: `THREE.PointLight` (3-4 lights)
- **Position**: Inside sphere, animated
- **Color**: Brand colors (teal variants)
- **Intensity**: 1.5-2.0
- **Distance**: 0 (infinite falloff)

---

## Shader Uniforms Reference

```glsl
// Time and animation
uniform float u_time;              // Elapsed time in seconds
uniform float u_scale;             // Overall scale (default: 1.0)

// Colors
uniform vec3 u_brandColors[6];     // Brand color palette
uniform float u_colorIntensity;   // Color saturation (0.8-1.2)

// Lighting
uniform vec3 u_lightPositions[4];  // Internal light positions
uniform vec3 u_lightColors[4];    // Internal light colors
uniform float u_lightIntensity;   // Overall light intensity

// Effects
uniform float u_fresnelPower;      // Fresnel edge intensity (1.0-3.0)
uniform float u_specularIntensity; // Specular highlight strength
uniform float u_coreGlowIntensity; // Core glow brightness

// Noise
uniform float u_noiseScale;        // Noise frequency multiplier
uniform float u_noiseStrength;     // Deformation amount
uniform int u_noiseOctaves;        // Number of noise octaves (3-6)

// Animation
uniform float u_breathingSpeed;    // Breathing animation speed
uniform float u_waveSpeed;         // Wave animation speed
uniform float u_rotationSpeed;     // Light rotation speed
```

---

## Implementation Checklist

### **Week 1: Foundation**
- [ ] Set up Three.js Canvas component
- [ ] Create base sphere geometry
- [ ] Implement basic ShaderMaterial
- [ ] Set up uniform system
- [ ] Configure camera and scene

### **Week 2: Vertex Shader**
- [ ] Implement Simplex noise function
- [ ] Create multi-octave FBM
- [ ] Add liquid wave system
- [ ] Implement vertex displacement
- [ ] Add breathing animation

### **Week 3: Fragment Shader**
- [ ] Implement Fresnel effect
- [ ] Add volumetric lighting calculation
- [ ] Create brand color mixing system
- [ ] Add specular highlights
- [ ] Implement core glow

### **Week 4: Lights & Effects**
- [ ] Create internal point lights
- [ ] Animate light positions
- [ ] Integrate lights into shader
- [ ] Add post-processing (Bloom)
- [ ] Fine-tune visual effects

### **Week 5: Polish & Optimization**
- [ ] Performance optimization
- [ ] Brand color refinement
- [ ] Animation smoothing
- [ ] Cross-browser testing
- [ ] Mobile optimization

---

## Success Criteria

1. **Visual Quality**
   - ✅ Matches or exceeds Siri orb quality
   - ✅ Smooth, liquid-like motion
   - ✅ Realistic glass/translucent appearance
   - ✅ Perfect brand color integration

2. **Performance**
   - ✅ 60fps on desktop (Chrome, Safari, Firefox)
   - ✅ 30fps+ on mobile devices
   - ✅ Smooth animation without jank
   - ✅ Low memory usage (<50MB)

3. **Technical**
   - ✅ Clean, maintainable code
   - ✅ Proper TypeScript types
   - ✅ Reusable shader system
   - ✅ Well-documented uniforms

4. **Brand Alignment**
   - ✅ Colors match brand palette exactly
   - ✅ Feels "intelligent" and "powerful"
   - ✅ Stands out from competitors
   - ✅ Matches design system aesthetic

---

## Next Steps

1. **Start with Phase 1**: Set up basic Three.js structure
2. **Iterate on shaders**: Build vertex shader first, then fragment
3. **Test frequently**: Check performance and visual quality at each phase
4. **Gather feedback**: Get user input after Phase 3 (fragment shader)
5. **Polish**: Final optimization and refinement in Phase 7

---

## Resources

- **Three.js Docs**: https://threejs.org/docs/
- **React Three Fiber**: https://docs.pmnd.rs/react-three-fiber/
- **GLSL Shader Reference**: https://www.khronos.org/opengl/wiki/OpenGL_Shading_Language
- **Simplex Noise**: https://github.com/ashima/webgl-noise
- **Post-Processing**: https://github.com/pmndrs/postprocessing

