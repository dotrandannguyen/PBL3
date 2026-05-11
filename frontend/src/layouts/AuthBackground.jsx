import React, { useEffect, useRef } from "react";

/**
 * Single great-circle ring whose plane precesses through 3D space.
 * As the ring tilts, particles sweep across the sphere surface; long-lived
 * white trails draw out the wireframe sphere over time.
 * Sphere center translates toward the cursor (no rotation from cursor).
 */
const AuthBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const COUNT = 28;
    const FOCAL = 700;
    const TRAIL_ALPHA = 0.05;
    const FOLLOW_EASE = 0.12;

    let w = 0;
    let h = 0;
    let dpr = Math.max(1, window.devicePixelRatio || 1);
    let radius = 0;

    const resize = () => {
      dpr = Math.max(1, window.devicePixelRatio || 1);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      radius = Math.min(w, h) * 0.22;
    };
    resize();

    const particles = [];
    for (let i = 0; i < COUNT; i++) {
      particles.push({
        angle: (i / COUNT) * Math.PI * 2,
        speed: 0.005 + (Math.random() - 0.5) * 0.001,
        size: 1.4 + Math.random() * 0.6,
        prevX: 0,
        prevY: 0,
        seeded: false,
      });
    }

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let cx = mx;
    let cy = my;

    // ring plane orientation — precessing at 3 unequal rates
    let spinX = 0;
    let spinY = 0;
    let spinZ = 0;
    let raf = 0;

    const onMove = (e) => {
      mx = e.clientX;
      my = e.clientY;
    };
    const onLeave = () => {
      mx = window.innerWidth / 2;
      my = window.innerHeight / 2;
    };
    const onResize = () => {
      resize();
      particles.forEach((p) => {
        p.seeded = false;
      });
    };

    const tick = () => {
      cx += (mx - cx) * FOLLOW_EASE;
      cy += (my - cy) * FOLLOW_EASE;

      spinY += 0.0030;
      spinX += 0.0017;
      spinZ += 0.0011;

      // long-lived trails
      ctx.fillStyle = `rgba(7, 7, 12, ${TRAIL_ALPHA})`;
      ctx.fillRect(0, 0, w, h);

      const cZ = Math.cos(spinZ);
      const sZ = Math.sin(spinZ);
      const cX = Math.cos(spinX);
      const sX = Math.sin(spinX);
      const cY = Math.cos(spinY);
      const sY = Math.sin(spinY);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.angle += p.speed;

        // local position on the equatorial ring (XZ plane)
        const lx = Math.cos(p.angle) * radius;
        const ly = 0;
        const lz = Math.sin(p.angle) * radius;

        // rotate Z
        const x1 = lx * cZ - ly * sZ;
        const y1 = lx * sZ + ly * cZ;
        const z1 = lz;
        // rotate X
        const x2 = x1;
        const y2 = y1 * cX - z1 * sX;
        const z2a = y1 * sX + z1 * cX;
        // rotate Y
        const x3 = x2 * cY + z2a * sY;
        const z3 = -x2 * sY + z2a * cY;
        const y3 = y2;

        const persp = FOCAL / (FOCAL + z3);
        const x = cx + x3 * persp;
        const y = cy + y3 * persp;

        if (!p.seeded) {
          p.prevX = x;
          p.prevY = y;
          p.seeded = true;
          continue;
        }

        const alpha = Math.max(0.2, persp * persp);
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = p.size * persp;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(p.prevX, p.prevY);
        ctx.lineTo(x, y);
        ctx.stroke();

        p.prevX = x;
        p.prevY = y;
      }

      raf = requestAnimationFrame(tick);
    };

    if (!reduced) {
      window.addEventListener("mousemove", onMove, { passive: true });
      window.addEventListener("mouseleave", onLeave);
      window.addEventListener("resize", onResize);
      raf = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div aria-hidden="true" className="auth-bg pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0" />
    </div>
  );
};

export default AuthBackground;
