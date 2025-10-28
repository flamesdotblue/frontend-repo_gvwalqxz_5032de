import React, { useEffect, useRef } from 'react';

/**
 * Fullscreen canvas loader following the blueprint spec.
 * Phases:
 * 1) Blueprint grid + concentric circles reveal
 * 2) Scaffolding: slanted line groups sweep in
 * 3) Triangle "A" outline is stroke-drawn (left, right, crossbar) with double-line look
 */
export default function LoaderCanvas({ onComplete }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const DPR = Math.min(2, window.devicePixelRatio || 1);

    function resize() {
      const { innerWidth: w, innerHeight: h } = window;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      canvas.width = Math.floor(w * DPR);
      canvas.height = Math.floor(h * DPR);
    }

    resize();
    window.addEventListener('resize', resize);

    const strokeBase = '#D0D3DB';

    // Timings (ms)
    const tGrid = 1100; // grid + circles draw time
    const tScaffold = 900; // slanted lines sweep
    const tA = 1200; // triangle A draw
    const tHold = 500; // small hold at end before complete
    const total = tGrid + tScaffold + tA + tHold;

    let start = performance.now();
    let completed = false;

    function lerp(a, b, t) { return a + (b - a) * t; }
    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
    function easeInOutCubic(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2; }
    function clamp01(v){ return Math.max(0, Math.min(1, v)); }

    function draw(now) {
      const elapsed = now - start;
      const { width: W, height: H } = canvas;
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.scale(1, 1);

      // Background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, W, H);

      // Grid setup
      const gridGap = 40 * DPR; // base spacing
      const gridOpacityActive = 0.85;
      const gridOpacitySettle = 0.18;

      // Stroke widths
      const lineW = (DPR >= 2 ? 1.4 : 0.9) * DPR; // specify in device pixels
      const thinW = Math.max(0.5, 0.7 * DPR);

      // Phase progress values 0..1
      const pGrid = clamp01(elapsed / tGrid);
      const pScaf = clamp01((elapsed - tGrid) / tScaffold);
      const pA = clamp01((elapsed - tGrid - tScaffold) / tA);

      // 1) Draw grid lines with reveal from center outward
      const cx = W / 2; const cy = H / 2;
      const maxRadius = Math.hypot(W, H) / 2;
      const revealR = maxRadius * easeOutCubic(pGrid);

      // Vertical grid
      for (let x = 0; x <= W; x += gridGap) {
        const dist = Math.abs(x - cx);
        if (dist < revealR) {
          const t = clamp01(1 - dist / revealR);
          ctx.globalAlpha = lerp(gridOpacitySettle, gridOpacityActive, t);
          ctx.strokeStyle = strokeBase;
          ctx.lineWidth = thinW;
          ctx.beginPath();
          ctx.moveTo(x + 0.5, 0);
          ctx.lineTo(x + 0.5, H);
          ctx.stroke();
        }
      }
      // Horizontal grid
      for (let y = 0; y <= H; y += gridGap) {
        const dist = Math.abs(y - cy);
        if (dist < revealR) {
          const t = clamp01(1 - dist / revealR);
          ctx.globalAlpha = lerp(gridOpacitySettle, gridOpacityActive, t);
          ctx.strokeStyle = strokeBase;
          ctx.lineWidth = thinW;
          ctx.beginPath();
          ctx.moveTo(0, y + 0.5);
          ctx.lineTo(W, y + 0.5);
          ctx.stroke();
        }
      }

      // Concentric circles + dotted circle
      const circles = 4;
      for (let i = 1; i <= circles; i++) {
        const r = (Math.min(W, H) * 0.12 * i) * DPR;
        const arcProg = easeOutCubic(pGrid);
        const endAngle = -Math.PI / 2 + arcProg * Math.PI * 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.strokeStyle = strokeBase;
        ctx.lineWidth = thinW;
        ctx.globalAlpha = lerp(0.3, 0.85, arcProg);
        if (i === circles) {
          // dotted circle
          const dash = DPR >= 2 ? [3 * DPR, 6 * DPR] : [1.5 * DPR, 3 * DPR];
          ctx.setLineDash(dash);
        } else {
          ctx.setLineDash([]);
        }
        ctx.beginPath();
        ctx.arc(0, 0, r, -Math.PI / 2, endAngle);
        ctx.stroke();
        // settle
        ctx.globalAlpha = 0.30;
        ctx.beginPath();
        ctx.setLineDash(i === circles ? (DPR >= 2 ? [3 * DPR, 6 * DPR] : [1.5 * DPR, 3 * DPR]) : []);
        ctx.arc(0, 0, r, endAngle, endAngle);
        ctx.stroke();
        ctx.restore();
      }

      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      // 2) Scaffolding: diagonal line groups sweeping in via clipping window
      const scafGroups = 3;
      const angle = (-20 * Math.PI) / 180; // slanted
      const spacing = 14 * DPR;
      const sweep = easeInOutCubic(pScaf);
      const sweepX = lerp(-W * 0.2, W * 1.2, sweep);

      ctx.save();
      ctx.translate(0, 0);
      ctx.beginPath();
      ctx.rect(0, 0, sweepX, H);
      ctx.clip();

      for (let g = 0; g < scafGroups; g++) {
        const offset = g * 80 * DPR;
        ctx.save();
        ctx.translate(-H * Math.tan(angle) * 0.5, 0);
        ctx.rotate(angle);
        ctx.strokeStyle = strokeBase;
        ctx.lineWidth = thinW;
        ctx.globalAlpha = lerp(0.3, 0.85, sweep);
        for (let y = -H; y < H * 2; y += spacing) {
          ctx.beginPath();
          ctx.moveTo(-W, y + offset);
          ctx.lineTo(W * 2, y + offset);
          ctx.stroke();
        }
        ctx.restore();
      }
      ctx.restore();

      // 3) Triangle "A" drawing
      // Define A geometry in normalized space then scale
      const size = Math.min(W, H) * 0.28;
      const AcenterX = cx;
      const AcenterY = cy;
      const halfBase = size * 0.6;
      const height = size;
      const top = { x: AcenterX, y: AcenterY - height * 0.6 };
      const left = { x: AcenterX - halfBase, y: AcenterY + height * 0.4 };
      const right = { x: AcenterX + halfBase, y: AcenterY + height * 0.4 };
      const inset = size * 0.18;

      // stroke styles for A
      const activeAlpha = 0.85;
      const settleAlpha = 0.30;

      // total path lengths (approx for timing split)
      const lenLeft = Math.hypot(top.x - left.x, top.y - left.y);
      const lenRight = Math.hypot(right.x - top.x, right.y - top.y);
      const barY = lerp(left.y, top.y, 0.55);
      const barLeft = { x: lerp(left.x, top.x, 0.32), y: barY };
      const barRight = { x: lerp(top.x, right.x, 0.32), y: barY };
      const lenBar = Math.hypot(barRight.x - barLeft.x, barRight.y - barLeft.y);
      const totalLen = lenLeft + lenRight + lenBar;

      const prog = easeInOutCubic(pA);
      const drawLen = totalLen * prog;

      function drawSegment(a, b, visibleLen, alphaActive) {
        const segLen = Math.hypot(b.x - a.x, b.y - a.y);
        const t = clamp01(visibleLen / segLen);
        const x = lerp(a.x, b.x, t);
        const y = lerp(a.y, b.y, t);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(x, y);
        ctx.globalAlpha = alphaActive;
        ctx.stroke();
        // settle
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(x, y);
        ctx.globalAlpha = settleAlpha;
        ctx.stroke();
        return Math.max(0, visibleLen - segLen);
      }

      // Outer A
      ctx.strokeStyle = strokeBase;
      ctx.lineWidth = lineW;
      let remaining = drawLen;
      remaining = drawSegment(left, top, remaining, activeAlpha);
      remaining = drawSegment(top, right, remaining, activeAlpha);
      remaining = drawSegment(barLeft, barRight, remaining, activeAlpha);

      // Inner inset triangle for double-line look
      const leftIn = {
        x: lerp(left.x, top.x, inset / lenLeft),
        y: lerp(left.y, top.y, inset / lenLeft),
      };
      const rightIn = {
        x: lerp(right.x, top.x, inset / lenRight),
        y: lerp(right.y, top.y, inset / lenRight),
      };
      const topIn = {
        x: top.x,
        y: top.y + inset,
      };
      const barInset = lineW * 2;
      const barLeftIn = { x: barLeft.x + barInset, y: barY + barInset * 0.1 };
      const barRightIn = { x: barRight.x - barInset, y: barY + barInset * 0.1 };

      ctx.lineWidth = lineW; // same width per spec per line
      // Mirror the same progressive length for inner
      let remainingInner = drawLen * 0.92; // slight offset so it trails subtly
      remainingInner = drawSegment(leftIn, topIn, remainingInner, activeAlpha);
      remainingInner = drawSegment(topIn, rightIn, remainingInner, activeAlpha);
      remainingInner = drawSegment(barLeftIn, barRightIn, remainingInner, activeAlpha);

      ctx.globalAlpha = 1;
      ctx.restore();

      if (elapsed >= total && !completed) {
        completed = true;
        // small timeout to ensure final frame visible
        setTimeout(() => onComplete && onComplete(), 50);
      }

      if (!completed) {
        rafRef.current = requestAnimationFrame(draw);
      }
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [onComplete]);

  return (
    <canvas ref={canvasRef} className="block w-full h-screen" />
  );
}
