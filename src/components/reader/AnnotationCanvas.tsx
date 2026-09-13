'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Annotation, AnnotationCoordinates } from '@/types';

interface AnnotationCanvasProps {
  pageNumber: number;
  width: number;
  height: number;
  activeTool: 'none' | 'highlight' | 'pen' | 'eraser';
  annotations: Annotation[];
  onAddAnnotation: (annotation: Omit<Annotation, 'id' | 'created_at' | 'updated_at'>) => void;
  onDeleteAnnotation: (id: string) => void;
  documentId: string;
}

export const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({
  pageNumber,
  width,
  height,
  activeTool,
  annotations,
  onAddAnnotation,
  onDeleteAnnotation,
  documentId,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Array<{ x: number; y: number }>>([]);

  const [isPointerDown, setIsPointerDown] = useState(false);

  const pageAnnotations = annotations.filter((a) => a.page_number === pageNumber);

  // Redraw persistent annotations whenever dimensions or annotations change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    for (const anno of pageAnnotations) {
      const coords: AnnotationCoordinates =
        typeof anno.coordinates === 'string'
          ? JSON.parse(anno.coordinates)
          : anno.coordinates;

      if (anno.type === 'highlight') {
        ctx.fillStyle = anno.color || 'rgba(245, 205, 71, 0.35)';
        if (coords.rects && coords.rects.length > 0) {
          for (const r of coords.rects) {
            ctx.fillRect(
              r.x * width,
              r.y * height,
              r.width * width,
              r.height * height
            );
          }
        } else if (coords.width && coords.height) {
          ctx.fillRect(
            coords.x * width,
            coords.y * height,
            coords.width * width,
            coords.height * height
          );
        } else if (coords.points && coords.points.length > 1) {
          ctx.save();
          ctx.strokeStyle = anno.color || 'rgba(245, 205, 71, 0.4)';
          ctx.lineWidth = 16;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          const start = coords.points[0];
          ctx.moveTo(start.x * width, start.y * height);
          for (let i = 1; i < coords.points.length; i++) {
            const pt = coords.points[i];
            ctx.lineTo(pt.x * width, pt.y * height);
          }
          ctx.stroke();
          ctx.restore();
        }
      } else if (anno.type === 'ink' && coords.points && coords.points.length > 1) {
        ctx.strokeStyle = anno.color || '#111111';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        const start = coords.points[0];
        ctx.moveTo(start.x * width, start.y * height);
        for (let i = 1; i < coords.points.length; i++) {
          const pt = coords.points[i];
          ctx.lineTo(pt.x * width, pt.y * height);
        }
        ctx.stroke();
      }
    }
  }, [width, height, pageAnnotations]);

  const eraseAt = (x: number, y: number) => {
    for (const anno of pageAnnotations) {
      const coords: AnnotationCoordinates =
        typeof anno.coordinates === 'string' ? JSON.parse(anno.coordinates) : anno.coordinates;
      if (coords.points) {
        const hit = coords.points.some(
          (p) => Math.hypot(p.x - x, p.y - y) < 0.04
        );
        if (hit) {
          onDeleteAnnotation(anno.id);
          break;
        }
      } else if (coords.rects && coords.rects.length > 0) {
        const hit = coords.rects.some(
          (r) =>
            x >= r.x - 0.015 &&
            x <= r.x + r.width + 0.015 &&
            y >= r.y - 0.015 &&
            y <= r.y + r.height + 0.015
        );
        if (hit) {
          onDeleteAnnotation(anno.id);
          break;
        }
      } else if (coords.width && coords.height) {
        const hit =
          x >= coords.x - 0.015 &&
          x <= coords.x + coords.width + 0.015 &&
          y >= coords.y - 0.015 &&
          y <= coords.y + coords.height + 0.015;
        if (hit) {
          onDeleteAnnotation(anno.id);
          break;
        }
      }
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeTool !== 'pen' && activeTool !== 'eraser' && activeTool !== 'highlight') return;
    setIsPointerDown(true);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / width;
    const y = (e.clientY - rect.top) / height;

    if (activeTool === 'pen' || activeTool === 'highlight') {
      setIsDrawing(true);
      setCurrentStroke([{ x, y }]);
    } else if (activeTool === 'eraser') {
      eraseAt(x, y);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / width;
    const y = (e.clientY - rect.top) / height;

    if (activeTool === 'eraser' && isPointerDown) {
      eraseAt(x, y);
      return;
    }

    if (!isDrawing || (activeTool !== 'pen' && activeTool !== 'highlight')) return;

    // For highlighter, provide gentle horizontal snapping if dragging across text
    let newY = y;
    if (activeTool === 'highlight' && currentStroke.length > 0) {
      const startY = currentStroke[0].y;
      if (Math.abs(y - startY) < 0.012) {
        newY = startY;
      }
    }

    const updated = [...currentStroke, { x, y: newY }];
    setCurrentStroke(updated);

    // Live draw current stroke
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    if (activeTool === 'highlight') {
      ctx.strokeStyle = 'rgba(245, 205, 71, 0.45)';
      ctx.lineWidth = 18;
    } else {
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 2.5;
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const prev = currentStroke[currentStroke.length - 1];
    if (prev) {
      ctx.moveTo(prev.x * width, prev.y * height);
      ctx.lineTo(x * width, newY * height);
      ctx.stroke();
    }
    ctx.restore();
  };

  const handlePointerUp = () => {
    setIsPointerDown(false);
    if (!isDrawing || (activeTool !== 'pen' && activeTool !== 'highlight') || currentStroke.length < 2) {
      setIsDrawing(false);
      setCurrentStroke([]);
      return;
    }

    if (activeTool === 'highlight') {
      onAddAnnotation({
        document_id: documentId,
        user_id: 'demo-user-id',
        page_number: pageNumber,
        type: 'highlight',
        coordinates: { x: 0, y: 0, points: currentStroke },
        color: 'rgba(245, 205, 71, 0.45)',
        content: null,
      });
    } else if (activeTool === 'pen') {
      onAddAnnotation({
        document_id: documentId,
        user_id: 'demo-user-id',
        page_number: pageNumber,
        type: 'ink',
        coordinates: { x: 0, y: 0, points: currentStroke },
        color: '#111111',
        content: null,
      });
    }

    setIsDrawing(false);
    setCurrentStroke([]);
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className={`absolute inset-0 z-20 touch-none ${
        activeTool === 'pen' || activeTool === 'highlight'
          ? 'cursor-crosshair'
          : activeTool === 'eraser'
          ? 'cursor-pointer'
          : 'pointer-events-none'
      }`}
      style={{ width: `${width}px`, height: `${height}px` }}
    />
  );
};
