import React, { useRef, useEffect, useState, useCallback } from 'react';
import { VFXRenderer } from '../rendering/vfxRenderer';

interface CanvasRendererProps {
  width: number;
  height: number;
  onPaint: (x: number, y: number) => void;
  onHover?: (gridX: number, gridY: number, screenX: number, screenY: number) => void;
  pixelsRef: React.MutableRefObject<Uint32Array | null>;
  brushRadius: number;
  vfxRef?: React.MutableRefObject<VFXRenderer | null>;
}

// Bresenham's line interpolation to guarantee continuous drawing without gaps
function interpolatePoints(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let currX = x0;
  let currY = y0;

  let maxSteps = (dx + dy) * 2 + 10;
  while (maxSteps > 0) {
    maxSteps--;
    points.push({ x: currX, y: currY });
    if (currX === x1 && currY === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      currX += sx;
    }
    if (e2 < dx) {
      err += dx;
      currY += sy;
    }
  }
  return points;
}

export const CanvasRenderer: React.FC<CanvasRendererProps> = ({
  width,
  height,
  onPaint,
  onHover,
  pixelsRef,
  brushRadius,
  vfxRef,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const internalVfxRef = useRef<VFXRenderer | null>(null);

  // Initialize VFX Renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const vfx = new VFXRenderer(canvas, width, height);
    internalVfxRef.current = vfx;
    if (vfxRef) {
      vfxRef.current = vfx;
    }

    return () => {
      internalVfxRef.current = null;
      if (vfxRef) {
        vfxRef.current = null;
      }
    };
  }, [width, height, vfxRef]);

  // Combined Render loop: WebGL Bloom Shader + 2D Particle System + Fallback
  useEffect(() => {
    const canvas = canvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    if (!canvas) return;

    // Check if WebGL bloom is active on main canvas
    const vfx = internalVfxRef.current;
    const hasWebGL = vfx?.bloomRenderer?.getIsSupported();

    // 2D fallback context if WebGL is unavailable
    let ctx2d: CanvasRenderingContext2D | null = null;
    let imgData: ImageData | null = null;
    let buf32: Uint32Array | null = null;

    if (!hasWebGL) {
      ctx2d = canvas.getContext('2d', { alpha: true });
      if (ctx2d) {
        imgData = ctx2d.createImageData(width, height);
        buf32 = new Uint32Array(imgData.data.buffer);
      }
    }

    const overlayCtx = overlayCanvas ? overlayCanvas.getContext('2d') : null;

    const render = (time: number) => {
      const pixels = pixelsRef.current;
      if (pixels) {
        if (hasWebGL && vfx) {
          // Render with WebGL Bloom Shader
          vfx.render(pixels, overlayCtx, time);
        } else if (ctx2d && imgData && buf32) {
          // 2D Canvas Blit Fallback
          buf32.set(pixels);
          ctx2d.putImageData(imgData, 0, 0);

          // Update & Render 2D particles
          if (vfx && overlayCtx) {
            vfx.render(pixels, overlayCtx, time);
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [width, height, pixelsRef]);

  // Window-level mouseup/touchend to prevent stuck drawing state when mouse leaves canvas
  useEffect(() => {
    const handleGlobalUp = () => {
      setIsDrawing(false);
      lastPosRef.current = null;
    };

    window.addEventListener('mouseup', handleGlobalUp);
    window.addEventListener('touchend', handleGlobalUp);

    return () => {
      window.removeEventListener('mouseup', handleGlobalUp);
      window.removeEventListener('touchend', handleGlobalUp);
    };
  }, []);

  const getGridCoords = useCallback(
    (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();

      let clientX = 0;
      let clientY = 0;

      if ('touches' in e) {
        if (e.touches.length === 0) return null;
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      // Exact aspect-ratio aware letterbox / pillarbox offset calculation
      const canvasRatio = width / height;
      const elemRatio = rect.width / rect.height;

      let renderWidth = rect.width;
      let renderHeight = rect.height;
      let offsetX = 0;
      let offsetY = 0;

      if (elemRatio > canvasRatio + 0.001) {
        // Pillarboxed: horizontal letterboxing (empty bars on left and right)
        renderWidth = rect.height * canvasRatio;
        offsetX = (rect.width - renderWidth) / 2;
      } else if (elemRatio < canvasRatio - 0.001) {
        // Letterboxed: vertical letterboxing (empty bars on top and bottom)
        renderHeight = rect.width / canvasRatio;
        offsetY = (rect.height - renderHeight) / 2;
      }

      const relativeX = clientX - rect.left - offsetX;
      const relativeY = clientY - rect.top - offsetY;

      if (relativeX < 0 || relativeX >= renderWidth || relativeY < 0 || relativeY >= renderHeight) {
        return null;
      }

      const x = Math.min(width - 1, Math.max(0, Math.floor((relativeX / renderWidth) * width)));
      const y = Math.min(height - 1, Math.max(0, Math.floor((relativeY / renderHeight) * height)));

      return { x, y };
    },
    [width, height],
  );

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) {
      e.preventDefault();
    }
    setIsDrawing(true);
    const coords = getGridCoords(e);
    if (coords) {
      lastPosRef.current = coords;
      setCursorPos(coords);
      onPaint(coords.x, coords.y);
    }
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e && isDrawing) {
      e.preventDefault();
    }
    const coords = getGridCoords(e);
    if (coords) {
      setCursorPos(coords);

      let clientX = 0;
      let clientY = 0;
      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      onHover?.(coords.x, coords.y, clientX, clientY);

      if (isDrawing) {
        if (lastPosRef.current) {
          const pts = interpolatePoints(
            lastPosRef.current.x,
            lastPosRef.current.y,
            coords.x,
            coords.y,
          );
          for (let i = 1; i < pts.length; i++) {
            onPaint(pts[i].x, pts[i].y);
          }
        } else {
          onPaint(coords.x, coords.y);
        }
        lastPosRef.current = coords;
      }
    } else if (!isDrawing) {
      setCursorPos(null);
    }
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
    lastPosRef.current = null;
  };

  const handlePointerLeave = () => {
    if (!isDrawing) {
      setCursorPos(null);
    }
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden select-none touch-none bg-slate-950 p-2 sm:p-4">
      {/* Aspect-Ratio Preserving Stage Wrapper */}
      <div
        className="relative flex items-center justify-center shadow-2xl rounded-lg border border-slate-800 bg-black overflow-hidden"
        style={{
          aspectRatio: `${width} / ${height}`,
          maxWidth: '100%',
          maxHeight: '100%',
        }}
      >
        {/* Main Simulation Tank Canvas (WebGL Bloom / 2D fallback) */}
        <canvas
          ref={canvasRef}
          id="simulation-canvas"
          width={width}
          height={height}
          className="block w-full h-full cursor-crosshair rounded-lg"
          style={{ imageRendering: 'pixelated' }}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerLeave}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        />

        {/* Overlaid Particle System Canvas (Sparks, Smoke, Shockwaves) */}
        <canvas
          ref={overlayCanvasRef}
          id="vfx-particle-overlay"
          width={width}
          height={height}
          className="pointer-events-none absolute inset-0 w-full h-full rounded-lg"
        />

        {/* Exact Brush Indicator located INSIDE the stage wrapper */}
        {cursorPos && (
          <div
            className="pointer-events-none absolute border border-sky-400/80 rounded-full bg-sky-400/15"
            style={{
              width: `${((brushRadius * 2 + 1) / width) * 100}%`,
              height: `${((brushRadius * 2 + 1) / height) * 100}%`,
              left: `${((cursorPos.x + 0.5) / width) * 100}%`,
              top: `${((cursorPos.y + 0.5) / height) * 100}%`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        )}
      </div>
    </div>
  );
};
