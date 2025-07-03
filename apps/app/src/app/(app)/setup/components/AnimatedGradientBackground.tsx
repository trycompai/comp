'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

const vertexShader = `
uniform float u_time;
uniform float u_scale;
uniform vec2 u_mouse;
uniform float u_pulse;
uniform float u_glow;
uniform float u_scrollRotation;
uniform float u_rage;
varying vec3 vNormal;
varying vec3 vPosition;
varying float vNoise;

//	Simplex 3D Noise 
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

void main() {
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;
  
  vec3 pos = position;
  
  // Mouse influence calculations
  vec2 mouseOffset = u_mouse - 0.5;
  float mouseDistance = length(mouseOffset);
  vec3 mouseDir3D = normalize(vec3(mouseOffset.x, mouseOffset.y, 0.0));
  
  // Stretch the orb 10% towards mouse position
  float stretchAmount = 0.1; // 10% stretch
  float dotProduct = dot(normalize(pos), mouseDir3D);
  float stretchFactor = 1.0 + stretchAmount * max(0.0, dotProduct);
  pos *= stretchFactor;
  
  // Click pulse effect - expands the orb outward
  float pulseExpansion = u_pulse * 0.06 * (1.0 + sin(length(pos) * 3.0 - u_time * 1.0) * 0.2);
  pos *= 1.0 + pulseExpansion;
  
  // Dynamic geometric distortions
  float angle = atan(pos.y, pos.x);
  float radius = length(pos.xy);
  
  // Hexagonal-like patterns influenced by mouse
  float hex = sin(angle * 6.0 + u_time - mouseDistance * 3.0) * 0.08;
  hex += cos(angle * 12.0 - u_time * 1.5 + mouseOffset.x * 5.0) * 0.04;
  
  // Asymmetric waves that react to mouse position
  float wave1 = sin(pos.x * 3.0 + u_time * 1.2 + mouseOffset.x * 2.0) * cos(pos.y * 2.5 - u_time * 0.8) * 0.12;
  float wave2 = cos(pos.y * 4.0 - u_time * 1.5 + mouseOffset.y * 2.0) * sin(pos.z * 3.0 + u_time) * 0.1;
  float wave3 = sin(length(pos.xz) * 5.0 - u_time * 2.0 - mouseDistance * 4.0) * 0.08;
  
  // Spike-like protrusions that follow mouse
  float spikes = pow(sin(angle * 8.0 + u_time * 0.5 - atan(mouseOffset.y, mouseOffset.x)), 4.0) * 0.15;
  spikes *= smoothstep(0.3, 0.7, sin(pos.z * 4.0 + u_time));
  
  // Keyboard glow adds extra turbulence
  float keyboardTurbulence = u_glow * snoise(pos * 3.0 + u_time * 2.0) * 0.06;
  
  // Rage mode amplification
  float rageAmplification = 1.0 + u_rage * 2.5;
  float rageTurbulence = u_rage * snoise(pos * 4.0 + u_time * 5.0) * 0.15;
  rageTurbulence += u_rage * snoise(pos * 8.0 - u_time * 8.0) * 0.1;
  
  // Turbulent noise for organic chaos
  float noise = snoise(pos * 1.2 + u_time * 0.3 + vec3(mouseOffset, 0.0)) * 0.08;
  noise += snoise(pos * 2.5 - u_time * 0.4) * 0.05;
  noise += snoise(pos * 5.0 + u_time * 0.6) * 0.03;
  noise += keyboardTurbulence;
  noise += rageTurbulence;
  noise *= rageAmplification;
  
  // Combine all deformations
  float totalDisplacement = (hex + wave1 + wave2 + wave3 + spikes) * rageAmplification + noise;
  
  // Pulsing with variation - more erratic in rage mode
  float rageBreathing = sin(u_time * 3.0 + sin(u_time * 5.0)) * 0.08 * u_rage;
  float breathing = sin(u_time * 0.7) * 0.03 + sin(u_time * 1.3) * 0.02 + 1.0 + rageBreathing;
  
  pos *= breathing * u_scale;
  pos += normal * totalDisplacement * u_scale;
  
  vNoise = totalDisplacement;
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const fragmentShader = `
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_pulse;
uniform float u_glow;
uniform float u_rage;
varying vec3 vNormal;
varying vec3 vPosition;
varying float vNoise;

void main() {
  vec3 viewDirection = normalize(cameraPosition - vPosition);
  
  // Enhanced fresnel for glow
  float fresnel = dot(viewDirection, vNormal);
  float rimLight = 1.0 - abs(fresnel);
  rimLight = pow(rimLight, 1.2);
  
  // Mouse influence on colors
  vec2 mouseOffset = u_mouse - 0.5;
  float mouseDistance = length(mouseOffset);
  
  // Dynamic color palette that shifts based on deformation and mouse
  vec3 color1 = mix(vec3(0.024, 0.306, 0.231), vec3(0.9, 0.1, 0.2), u_rage);    // emerald-900 to red
  vec3 color2 = mix(vec3(0.024, 0.18, 0.133), vec3(0.7, 0.0, 0.1), u_rage);    // emerald-950 to dark red
  vec3 color3 = mix(vec3(0.024, 0.373, 0.275), vec3(1.0, 0.3, 0.0), u_rage);    // emerald-800 to orange-red
  
  // Keyboard glow effect - emerald tint
  vec3 glowColor = mix(vec3(0.016, 0.471, 0.341), vec3(1.0, 0.3, 0.3), u_rage);  // emerald-700
  float glowIntensity = u_glow * 0.25 * (1.0 + u_rage * 0.5);
  
  // Pulse effect - very subtle white tint
  vec3 pulseColor = mix(vec3(1.0, 1.0, 0.95), vec3(1.0, 0.8, 0.8), u_rage);
  float pulseIntensity = u_pulse * 0.15 * (1.0 + u_rage * 0.3);
  
  // Color based on deformation intensity and mouse proximity
  float deformIntensity = abs(vNoise) * 5.0;
  vec3 baseColor = mix(color1, color2, sin(deformIntensity + u_time * 0.5) * 0.5 + 0.5);
  baseColor = mix(baseColor, color3, smoothstep(0.1, 0.3, abs(vNoise)));
  
  // Subtle boost to maintain deep emerald richness
  baseColor = baseColor * 1.08;
  
  // Mix in glow color based on keyboard activity - very subtle to preserve vibrancy
  baseColor = mix(baseColor, glowColor, glowIntensity * rimLight * 0.3);
  
  // Add pulse flash - even more subtle
  baseColor = mix(baseColor, pulseColor, pulseIntensity * 0.3);
  
  // Extra glow where stretched towards mouse
  float stretchGlow = smoothstep(0.3, 0.7, dot(normalize(vPosition), normalize(vec3(mouseOffset, 0.0))));
  baseColor += mix(vec3(0.024, 0.373, 0.275), vec3(0.4, 0.1, 0.0), u_rage) * stretchGlow * 0.4;  // emerald-800
  
  // Holographic interference patterns enhanced by keyboard glow
  float interference = sin(vPosition.x * 15.0 + u_time) * sin(vPosition.y * 15.0 - u_time * 0.7);
  interference *= 0.1 * rimLight * (1.0 + u_glow * 1.5 + u_rage * 2.0);
  baseColor += vec3(interference * 0.02, interference * 0.3, interference * 0.2);
  
  // Electric rim effect enhanced by mouse proximity and keyboard glow
  float electricRim = pow(rimLight, 0.5);
  vec3 electricColor = mix(vec3(0.02, 0.588, 0.412), vec3(1.0, 0.4, 0.2), u_rage);  // emerald-600
  float electric = sin(atan(vPosition.y, vPosition.x) * 20.0 + u_time * 3.0) * electricRim;
  electric = smoothstep(0.6, 1.0, electric) * 0.3;
  electric *= 1.0 + (1.0 - mouseDistance) * 0.5 + u_glow * 0.5 + u_rage * 1.0;
  
  // Core energy with color variation
  float centerDistance = length(vPosition) / 2.2;
  float coreGlow = smoothstep(1.0, 0.0, centerDistance) * 0.5;
  vec3 coreColor = mix(vec3(0.016, 0.471, 0.341), vec3(0.024, 0.306, 0.231), sin(u_time * 1.5) * 0.5 + 0.5);  // emerald-700 to emerald-900
  coreColor = mix(coreColor, vec3(1.0, 0.5, 0.3), u_rage);
  coreColor = mix(coreColor, glowColor, u_glow * 0.3);
  
  // Combine all effects
  vec3 finalColor = baseColor;
  finalColor += electricColor * electric;
  finalColor += coreColor * coreGlow * (1.0 + u_pulse * 0.3);
  finalColor += electricColor * electricRim * 0.25;
  
  // Keyboard effect - flowing energy waves instead of dots
  float flowingEnergy = sin(vPosition.x * 10.0 - u_time * 5.0 + vPosition.y * 5.0) * 
                        cos(vPosition.y * 8.0 + u_time * 4.0 - vPosition.z * 3.0);
  flowingEnergy = smoothstep(0.7, 1.0, abs(flowingEnergy)) * u_glow;
  vec3 energyColor = mix(vec3(0.02, 0.588, 0.412), vec3(0.016, 0.471, 0.341), sin(u_time * 2.0) * 0.5 + 0.5);  // emerald-600 to emerald-700
  energyColor = mix(energyColor, vec3(1.0, 0.3, 0.2), u_rage);
  finalColor += energyColor * flowingEnergy * rimLight * 0.6;
  
  // Rage mode chaos - add flickering and instability
  if (u_rage > 0.0) {
    float chaos = sin(u_time * 20.0 + vPosition.x * 30.0) * cos(u_time * 15.0 - vPosition.y * 25.0);
    chaos = smoothstep(0.7, 1.0, abs(chaos)) * u_rage * 0.3;
    finalColor += vec3(1.0, 0.2, 0.1) * chaos;
  }
  
  // Energy fluctuations
  float fluctuation = sin(u_time * 4.0 + vPosition.z * 10.0) * 0.1 + 0.9;
  fluctuation = mix(fluctuation, sin(u_time * 10.0 + vNoise * 20.0) * 0.3 + 0.7, u_rage);
  finalColor *= fluctuation;
  
  // Dynamic alpha - increased base alpha for better visibility
  float alpha = 0.25 + rimLight * 0.4 + coreGlow * 0.25 + electric * 0.35 + u_glow * 0.15 + u_pulse * 0.2 + u_rage * 0.15;
  
  gl_FragColor = vec4(finalColor, alpha);
}
`;

interface AnimatedOrbProps {
  scale?: number;
}

function AnimatedOrb({ scale = 1 }: AnimatedOrbProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const currentScale = useRef(scale);
  const mousePosition = useRef({ x: 0, y: 0 });
  const pulseValue = useRef(0);
  const targetPulse = useRef(0);
  const glowValue = useRef(0);
  const keyboardTimer = useRef<NodeJS.Timeout | null>(null);
  const scrollRotation = useRef(0);
  const targetScrollRotation = useRef(0);
  const scrollVelocity = useRef(0);
  const rageMode = useRef(false);
  const rageValue = useRef(0);

  const uniforms = useMemo(
    () => ({
      u_time: { value: 0.0 },
      u_scale: { value: 1.0 },
      u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
      u_pulse: { value: 0.0 },
      u_glow: { value: 0.0 },
      u_scrollRotation: { value: 0.0 },
      u_rage: { value: 0.0 },
    }),
    [],
  );

  // Track mouse movement
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePosition.current.x = e.clientX / window.innerWidth;
      mousePosition.current.y = 1.0 - e.clientY / window.innerHeight; // Invert Y
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Handle clicks for pulse effect
  useEffect(() => {
    const handleClick = () => {
      targetPulse.current = 1.0;
      // Start decay after a short hold
      setTimeout(() => {
        targetPulse.current = 0;
      }, 100);
    };

    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // Handle ESC key for rage mode easter egg
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't process keyboard events if user is typing in an input
      const target = e.target as HTMLElement;
      const isInputElement = target.matches('input, textarea, select, [contenteditable="true"]');

      if (isInputElement) {
        return; // Skip processing for form inputs
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        rageMode.current = !rageMode.current;

        // Create a pulse effect when toggling
        targetPulse.current = 1.0;
        setTimeout(() => {
          targetPulse.current = 0;
        }, 200);
      } else {
        // Existing keyboard glow logic
        glowValue.current = 1.0;

        // Clear existing timer
        if (keyboardTimer.current) {
          clearTimeout(keyboardTimer.current);
        }

        // Set new timer to fade out glow
        keyboardTimer.current = setTimeout(() => {
          glowValue.current = 0;
        }, 150);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (keyboardTimer.current) {
        clearTimeout(keyboardTimer.current);
      }
    };
  }, []);

  // Handle scroll for rotation effect
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = (e: WheelEvent) => {
      // Check if the user is interacting with an interactive element
      const target = e.target as HTMLElement;
      const isInteractiveElement = target.closest(
        'input, textarea, select, button, [role="combobox"], [role="listbox"], ' +
          '[data-radix-collection-item], [data-state], .overflow-auto, .overflow-y-auto, ' +
          '.overflow-x-auto, .overflow-scroll, .overflow-y-scroll, .overflow-x-scroll',
      );

      // Only apply the orb effect if not scrolling on an interactive element
      if (!isInteractiveElement) {
        // Calculate scroll velocity for orb rotation
        const scrollDelta = e.deltaY * 0.001;
        scrollVelocity.current += scrollDelta;

        // Add to target rotation
        targetScrollRotation.current += scrollDelta * 2;

        // Clear existing timeout
        if (scrollTimeout) {
          clearTimeout(scrollTimeout);
        }

        // Start decay after scrolling stops
        scrollTimeout = setTimeout(() => {
          scrollVelocity.current = 0;
        }, 150);
      }
    };

    // Use wheel event for better scroll detection
    window.addEventListener('wheel', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleScroll);
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
    };
  }, []);

  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.getElapsedTime();
      uniforms.u_time.value = time;

      currentScale.current += (scale - currentScale.current) * 0.03;
      uniforms.u_scale.value = currentScale.current;

      // Smooth mouse position updates
      uniforms.u_mouse.value.x += (mousePosition.current.x - uniforms.u_mouse.value.x) * 0.05;
      uniforms.u_mouse.value.y += (mousePosition.current.y - uniforms.u_mouse.value.y) * 0.05;

      // Smooth pulse transitions with easing
      const pulseDiff = targetPulse.current - pulseValue.current;
      if (Math.abs(pulseDiff) > 0.001) {
        // Faster rise, slower fall
        const easing = pulseDiff > 0 ? 0.12 : 0.08;
        pulseValue.current += pulseDiff * easing;
      } else {
        pulseValue.current = targetPulse.current;
      }
      uniforms.u_pulse.value = pulseValue.current;

      // Smooth glow transitions
      const targetGlow = glowValue.current;
      uniforms.u_glow.value += (targetGlow - uniforms.u_glow.value) * 0.15;

      // Smooth rage mode transition
      const targetRage = rageMode.current ? 1.0 : 0.0;
      rageValue.current += (targetRage - rageValue.current) * 0.08;
      uniforms.u_rage.value = rageValue.current;

      // Smooth scroll rotation with momentum
      scrollRotation.current += (targetScrollRotation.current - scrollRotation.current) * 0.08;

      // Apply velocity decay for momentum effect
      if (Math.abs(scrollVelocity.current) > 0.001) {
        targetScrollRotation.current += scrollVelocity.current;
        scrollVelocity.current *= 0.95; // Friction
      }

      uniforms.u_scrollRotation.value = scrollRotation.current;

      // Subtle multi-axis rotation influenced by mouse and scroll
      const mouseInfluenceX = (uniforms.u_mouse.value.x - 0.5) * 0.3;
      const mouseInfluenceY = (uniforms.u_mouse.value.y - 0.5) * 0.3;

      // Rage mode adds erratic rotation
      const rageRotation = rageValue.current * Math.sin(time * 5.0) * 0.2;

      // Add scroll rotation to Y axis for spinning effect
      meshRef.current.rotation.y =
        time * 0.08 + mouseInfluenceX + scrollRotation.current + rageRotation;
      meshRef.current.rotation.x =
        Math.sin(time * 0.05) * 0.15 +
        mouseInfluenceY +
        Math.sin(scrollRotation.current * 0.5) * 0.1 +
        rageRotation * 0.5;
      meshRef.current.rotation.z =
        Math.cos(time * 0.07) * 0.1 +
        Math.cos(scrollRotation.current * 0.3) * 0.05 +
        Math.sin(time * 8.0) * rageValue.current * 0.1;
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[2.2, 96, 96]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

interface AnimatedGradientBackgroundProps {
  scale?: number;
}

export function AnimatedGradientBackground({ scale = 1 }: AnimatedGradientBackgroundProps) {
  return (
    <div className="fixed inset-0 -z-10 opacity-50">
      <Canvas
        camera={{
          position: [0, 0, 7],
          fov: 50,
        }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          powerPreference: 'high-performance',
        }}
      >
        <AnimatedOrb scale={scale} />
      </Canvas>
    </div>
  );
}
