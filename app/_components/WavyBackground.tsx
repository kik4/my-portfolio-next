"use client";

import { useEffect, useRef } from "react";

export const WavyBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    // Set canvas dimensions to match parent container
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.offsetWidth;
        canvas.height = parent.offsetHeight;
      }
    };

    // Initial resize
    resizeCanvas();

    // Add resize listener
    window.addEventListener("resize", resizeCanvas);

    // Animation function
    const animate = () => {
      time += 0.005;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw multiple wavy lines
      const waveCount = 5;
      const colors = [
        "rgba(120, 130, 146, 0.1)", // blue-600 with low opacity
        "rgba(120, 130, 146, 0.07)",
        "rgba(120, 130, 146, 0.05)",
        "rgba(120, 130, 146, 0.03)",
        "rgba(120, 130, 146, 0.02)",
      ];

      for (let i = 0; i < waveCount; i++) {
        const amplitude = 40 + i * 5; // Increasing amplitude for each wave
        const wavelength = 200 + i * 50; // Increasing wavelength for each wave
        const speed = 1 + i * 0.2; // Different speeds for each wave

        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);

        for (let x = 0; x < canvas.width; x++) {
          const y =
            Math.sin(x / wavelength + time * speed) * amplitude +
            canvas.height / 2;
          ctx.lineTo(x, y);
        }

        // Complete the wave by drawing to the bottom and back to start
        ctx.lineTo(canvas.width, canvas.height);
        ctx.lineTo(0, canvas.height);
        ctx.closePath();

        // Fill with semi-transparent color
        ctx.fillStyle = colors[i % colors.length];
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    // Start animation
    animate();

    // Cleanup
    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="-z-10 absolute inset-0"
      style={{ pointerEvents: "none" }}
    />
  );
};
