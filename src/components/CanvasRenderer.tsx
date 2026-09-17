import React, { useRef, useEffect, useState, useCallback } from 'react';

interface CanvasRendererProps {
  width: number;
  height: number;
  onPaint: (x: number, y: number) => void;
  onHover?: (gridX: number, gridY: number, screenX: number, screenY: number) => void;
  pixelsRef: React.MutableRefObject<Uint32Array | null>;
  brushRadius: number;
}

export const CanvasRenderer: React.FC<CanvasRendererProps> = ({
  width,
  height,
  onPaint,
  onHover,
  pixelsRef,
  brushRadius,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Render loop directly blitting pixels to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let imgData = ctx.createImageData(width, height);
    let buf32 = new Uint32Array(imgData.data.buffer);

    const render = () => {
      if (pixelsRef.current) {
        if (imgData.width !== width || imgData.height !== height) {
          imgData = ctx.createImageData(width, height);
          buf32 = new Uint32Array(imgData.data.buffer);
        }
        buf32.set(pixelsRef.current);
        ctx.putImageData(imgData, 0, 0);
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
