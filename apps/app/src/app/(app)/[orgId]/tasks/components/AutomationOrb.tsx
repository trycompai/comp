'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

// Simplex 3D Noise (from existing codebase)
const simplexNoise = `
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

float snoise(vec3 v){ 
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 =   v - i + dot(i, C.xxx) ;
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );
  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1. + 3.0 * C.xxx;
  i = mod(i, 289.0 ); 
  vec4 p = permute( permute( permute( 
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
  float n_ = 1.0/7.0;
  vec3  ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
}

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
`;

const vertexShader = `
${simplexNoise}

uniform float u_time;
uniform float u_scale;
uniform vec3 u_lightPositions[3];
uniform float u_noiseScale;
uniform float u_noiseStrength;
uniform float u_breathingSpeed;
uniform float u_waveSpeed;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;
varying float vNoise;
varying float vDepth;
varying vec3 vViewDirection;

void main() {
vNormal = normalize(normalMatrix * normal);
vPosition = position;
  
  vec3 pos = position;
  
  // Multi-octave noise for organic liquid deformation
  vec3 noiseCoord = pos * u_noiseScale + vec3(u_time * u_waveSpeed * 0.1);
  float noiseValue = fbm(noiseCoord, 4);
  
  // Additional wave layers for fluid motion
  float wave1 = sin(pos.x * 2.0 + u_time * u_waveSpeed * 0.8) * cos(pos.y * 2.5 - u_time * u_waveSpeed * 0.6) * 0.08;
  float wave2 = cos(pos.y * 3.0 - u_time * u_waveSpeed * 0.7) * sin(pos.z * 2.5 + u_time * u_waveSpeed * 0.5) * 0.06;
  float wave3 = sin(length(pos.xy) * 4.0 - u_time * u_waveSpeed * 1.0) * 0.04;
  
  // Combine noise and waves for liquid-like deformation
  float totalDeformation = noiseValue * u_noiseStrength + wave1 + wave2 + wave3;
  
  // Apply deformation along normal for organic shape
pos += normal * totalDeformation;
  
  // Subtle breathing animation
  float breathing = sin(u_time * u_breathingSpeed) * 0.02 + cos(u_time * u_breathingSpeed * 1.3) * 0.01 + 1.0;
  pos *= breathing;
  
// Apply global scale
pos *= u_scale;

  // Store noise value for fragment shader
  vNoise = totalDeformation;
  
  // Calculate depth for volumetric effects
  vDepth = length(pos) / 1.0;
  
  // View direction for Fresnel
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  vViewDirection = normalize(-mvPosition.xyz);
vWorldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
vPosition = pos;
  
  gl_Position = projectionMatrix * mvPosition;
}
`;

const fragmentShader = `
uniform float u_time;
uniform vec3 u_brandColors[6];
uniform vec3 u_lightPositions[3];
uniform vec3 u_lightColors[3];
uniform float u_lightIntensity;
uniform float u_fresnelPower;
uniform float u_specularIntensity;
uniform float u_coreGlowIntensity;
uniform float u_colorIntensity;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;
varying float vNoise;
varying float vDepth;
varying vec3 vViewDirection;

void main() {
  // Enhanced Fresnel effect for edge lighting
  vec3 viewDir = normalize(vViewDirection);
  vec3 normal = normalize(vNormal);
  float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), u_fresnelPower);
  float rimLight = pow(fresnel, 0.8);
  
  // Volumetric lighting from internal light sources (more sophisticated and vibrant)
  vec3 lightAccum = vec3(0.0);
  for(int i = 0; i < 3; i++) {
    vec3 lightDir = normalize(u_lightPositions[i] - vWorldPosition);
    float dist = length(u_lightPositions[i] - vWorldPosition);
    
    // Improved attenuation with smooth falloff
    float attenuation = 1.0 / (1.0 + dist * dist * 1.5);
    
    // Volumetric scattering (light passing through translucent material) - brighter
    float scatter = max(dot(vNormal, lightDir), 0.0);
    scatter = pow(scatter, 1.5); // Brighter scattering
    
    // Distance-based intensity falloff - more pronounced
    float distFactor = smoothstep(0.6, 0.0, dist);
    
    // Add pulsing effect to lights
    float iFloat = float(i);
    float lightPulse = sin(u_time * 1.5 + iFloat * 2.0) * 0.2 + 1.0;
    
    lightAccum += u_lightColors[i] * u_lightIntensity * attenuation * scatter * distFactor * lightPulse * 0.8;
  }
  
  // Depth-based color mixing with noise variation - more vibrant
  float depthFactor = smoothstep(0.15, 1.0, vDepth);
  vec3 baseColor = mix(u_brandColors[1], u_brandColors[2], depthFactor * 0.8);
  baseColor = mix(baseColor, u_brandColors[3], depthFactor * 0.3);
  
  // Add noise-based color variation for organic feel - more pronounced
  float noiseColor = vNoise * 0.5 + 0.5;
  baseColor = mix(baseColor, u_brandColors[2], noiseColor * 0.6);
  baseColor = mix(baseColor, u_brandColors[4], noiseColor * 0.3);
  
  // Fresnel rim lighting with brand colors and bright white highlights
  vec3 rimColor = mix(baseColor, u_brandColors[3], fresnel * 0.9);
  rimColor = mix(rimColor, u_brandColors[2], fresnel * 0.5);
  rimColor = mix(rimColor, vec3(1.0), fresnel * 0.6);
  
  // Multiple specular highlights (glass-like reflections)
  vec3 specularAccum = vec3(0.0);
  for(int i = 0; i < 3; i++) {
    vec3 lightDir = normalize(u_lightPositions[i] - vWorldPosition);
    vec3 reflectDir = reflect(-lightDir, vNormal);
    float iFloat = float(i);
    float spec = pow(max(dot(vViewDirection, reflectDir), 0.0), 32.0 + iFloat * 8.0);
    specularAccum += u_lightColors[i] * spec * u_specularIntensity * (1.0 / (iFloat + 1.0));
  }
  
  // Core glow (bright white center with pulsing) - more prominent
  float coreDistance = length(vPosition) / 0.6;
  float corePulse = sin(u_time * 2.5) * 0.15 + cos(u_time * 1.8) * 0.1 + 1.0;
  float coreGlow = smoothstep(1.0, 0.0, coreDistance * corePulse) * u_coreGlowIntensity;
  
  // Core color gradient (bright white to brand teal) - more vibrant
  vec3 coreColor = mix(vec3(1.0, 1.0, 1.0), u_brandColors[4], smoothstep(0.0, 0.25, coreDistance));
  coreColor = mix(coreColor, u_brandColors[2], smoothstep(0.0, 0.4, coreDistance));
  coreColor = mix(coreColor, u_brandColors[3], smoothstep(0.0, 0.6, coreDistance));
  
  // Inner bright white core - more intense
  float innerCore = smoothstep(0.25, 0.0, coreDistance) * 1.0;
  vec3 innerCoreColor = vec3(1.0, 1.0, 1.0) * innerCore;
  
  // Combine all lighting effects with better weighting for vibrancy
  vec3 finalColor = baseColor * 0.2;
  finalColor += lightAccum * 0.7; // Volumetric lighting - more prominent
  finalColor += rimColor * rimLight * 0.5; // Fresnel rim - brighter
  finalColor += specularAccum * 0.4; // Specular highlights - more visible
  finalColor += coreColor * coreGlow * 0.8; // Core glow - more intense
  finalColor += innerCoreColor * 0.6; // Inner core - brighter
  
  // Add subtle color boost for vibrancy
  finalColor = mix(finalColor, finalColor * 1.2, 0.3);
  
  // Apply color intensity
  finalColor *= u_colorIntensity;
  
  // Enhanced alpha calculation with Fresnel, depth, and core glow - more visible
  float alpha = 0.65;
  alpha += fresnel * 0.35;
  alpha += coreGlow * 0.25;
  alpha += innerCore * 0.2;
  alpha = clamp(alpha, 0.6, 0.98);
  
  gl_FragColor = vec4(finalColor, alpha);
}
`;

interface OrbMeshProps {
  uniforms: {
    u_time: { value: number };
    u_scale: { value: number };
    u_brandColors: { value: THREE.Color[] };
    u_lightPositions: { value: THREE.Vector3[] };
    u_lightColors: { value: THREE.Color[] };
    u_lightIntensity: { value: number };
    u_noiseScale: { value: number };
    u_noiseStrength: { value: number };
    u_breathingSpeed: { value: number };
    u_waveSpeed: { value: number };
    u_fresnelPower: { value: number };
    u_specularIntensity: { value: number };
    u_coreGlowIntensity: { value: number };
    u_colorIntensity: { value: number };
  };
}

function OrbMesh({ uniforms }: OrbMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;

    const time = state.clock.getElapsedTime();
    uniforms.u_time.value = time;

    // Animate internal lights in orbital paths (swirling motion)
    const lightSpeeds = [0.015, 0.012, 0.018];
    const lightDistances = [0.2, 0.175, 0.15];
    const lightOffsets = [0.0, Math.PI * 0.7, Math.PI * 1.2];

    uniforms.u_lightPositions.value.forEach((lightPos, i) => {
      const angle = time * lightSpeeds[i] + lightOffsets[i];
      lightPos.set(
        Math.cos(angle) * lightDistances[i],
        Math.sin(angle) * lightDistances[i] * 0.7,
        Math.sin(angle * 0.8) * lightDistances[i] * 0.5,
      );
    });

    // Subtle floating rotation for organic movement
    meshRef.current.rotation.y = time * 0.05;
    meshRef.current.rotation.x = Math.sin(time * 0.03) * 0.1;
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <sphereGeometry args={[0.6, 64, 64]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.NormalBlending}
      />
    </mesh>
  );
}

export function AutomationOrb() {
  // Brand colors
  const brandColors = useMemo(
    () => [
      new THREE.Color(0x004c3a), // primaryDark
      new THREE.Color(0x00785c), // primaryRich
      new THREE.Color(0x0ea5e9), // skyTeal
      new THREE.Color(0x14b8a6), // teal
      new THREE.Color(0x10b981), // emerald
      new THREE.Color(0xffffff), // white
    ],
    [],
  );

  // Light colors (brand teal variants)
  const lightColors = useMemo(
    () => [
      new THREE.Color(0x0ea5e9), // skyTeal
      new THREE.Color(0x14b8a6), // teal
      new THREE.Color(0x10b981), // emerald
    ],
    [],
  );

  // Initial light positions (will be animated)
  const lightPositions = useMemo(
    () => [
      new THREE.Vector3(0.2, 0, 0),
      new THREE.Vector3(-0.15, 0.1, 0),
      new THREE.Vector3(0, -0.15, 0.1),
    ],
    [],
  );

  const uniforms = useMemo(
    () => ({
      u_time: { value: 0.0 },
      u_scale: { value: 1.0 },
      u_brandColors: { value: brandColors },
      u_lightPositions: { value: lightPositions },
      u_lightColors: { value: lightColors },
      u_lightIntensity: { value: 2.0 },
      u_noiseScale: { value: 2.5 },
      u_noiseStrength: { value: 0.1 },
      u_breathingSpeed: { value: 0.6 },
      u_waveSpeed: { value: 0.7 },
      u_fresnelPower: { value: 1.5 },
      u_specularIntensity: { value: 1.2 },
      u_coreGlowIntensity: { value: 1.0 },
      u_colorIntensity: { value: 1.2 },
    }),
    [brandColors, lightColors, lightPositions],
  );

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-90">
      <Canvas
        camera={{
          position: [0, 0, 1.5],
          fov: 50,
          near: 0.1,
          far: 10,
        }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          premultipliedAlpha: false,
        }}
        dpr={typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1}
        style={{ width: '96px', height: '96px', display: 'block' }}
        onCreated={(state) => {
          // Ensure canvas is properly initialized
          state.gl.setClearColor('#000000', 0);
        }}
      >
        <ambientLight intensity={0.5} />
        <OrbMesh uniforms={uniforms} />
      </Canvas>
    </div>
  );
}
