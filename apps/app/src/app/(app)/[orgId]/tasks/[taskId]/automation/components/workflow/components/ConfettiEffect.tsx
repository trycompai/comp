'use client';

import { RefObject, useEffect, useRef } from 'react';

// Confetti particle class
class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 12;
    this.vy = Math.random() * -15 - 10;
    this.size = Math.random() * 6 + 2;
    this.color = ['#10b981', '#22c55e', '#6ee7b7', '#34d399', '#86efac'][
      Math.floor(Math.random() * 5)
    ];
    this.alpha = 1;
    this.decay = 0.015;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.5; // gravity
    this.vx *= 0.99; // air resistance
    this.alpha -= this.decay;
    // Keep alpha at 0 minimum so particles keep falling
    if (this.alpha < 0) this.alpha = 0;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.size, this.size);
    ctx.restore();
  }
}

interface ConfettiEffectProps {
  trigger: boolean;
  particleCount?: number;
  containerRef?: RefObject<HTMLDivElement | null>;
}

export function ConfettiEffect({
  trigger,
  particleCount = 100,
  containerRef,
}: ConfettiEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    if (trigger && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      // Calculate center based on container or fallback to screen center
      let centerX = canvas.width / 2;
      let centerY = canvas.height / 2 - 100;

      if (containerRef?.current) {
        const rect = containerRef.current.getBoundingClientRect();
        centerX = rect.left + rect.width / 2;
        centerY = rect.top + rect.height / 2 - 50; // Slightly above center
      }

      particlesRef.current = Array.from(
        { length: particleCount },
        () => new Particle(centerX, centerY),
      );

      // Animation loop
      const animate = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particlesRef.current = particlesRef.current.filter((particle) => {
          particle.update();
          particle.draw(ctx);
          // Only remove particles that have fallen off the bottom of the screen
          return particle.y < canvas.height + 50; // +50 to ensure they're fully off-screen
        });

        if (particlesRef.current.length > 0) {
          animationRef.current = requestAnimationFrame(animate);
        }
      };

      animate();

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [trigger, particleCount]);

  if (!trigger) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[100]"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
}
