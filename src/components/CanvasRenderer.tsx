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

      const scaleX = width / rect.width;
      const scaleY = height / rect.height;

      const x = Math.floor((clientX - rect.left) * scaleX);
      const y = Math.floor((clientY - rect.top) * scaleY);

      if (x < 0 || x >= width || y < 0 || y >= height) return null;
      return { x, y };
    },
    [width, height],
  );

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const coords = getGridCoords(e);
    if (coords) {
      setCursorPos(coords);
      onPaint(coords.x, coords.y);
    }
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
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
        onPaint(coords.x, coords.y);
      }
    }
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
  };

  const handlePointerLeave = () => {
    setIsDrawing(false);
    setCursorPos(null);
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden select-none touch-none bg-slate-950">
      {/* Main Simulation Tank Canvas (WebGL Bloom / 2D fallback) */}
      <canvas
        ref={canvasRef}
        id="simulation-canvas"
        width={width}
        height={height}
        className="w-full h-full max-w-full max-h-full object-contain cursor-crosshair rounded-lg shadow-2xl border border-slate-800"
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
        className="pointer-events-none absolute w-full h-full max-w-full max-h-full object-contain rounded-lg"
      />

      {/* Brush Indicator */}
      {cursorPos && (
        <div
          className="pointer-events-none absolute border border-sky-400/60 rounded-full bg-sky-400/10 transition-transform duration-75"
          style={{
            width: `${Math.max(12, brushRadius * 6)}px`,
            height: `${Math.max(12, brushRadius * 6)}px`,
            left: `${(cursorPos.x / width) * 100}%`,
            top: `${(cursorPos.y / height) * 100}%`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      )}
    </div>
  );
};
