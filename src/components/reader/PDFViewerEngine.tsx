'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { motion } from 'framer-motion';
import { Annotation, Note } from '@/types';
import { AnnotationCanvas } from './AnnotationCanvas';
import { SelectionMenu, SelectionState } from './SelectionMenu';
import { Loader2, AlertCircle } from 'lucide-react';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

interface PDFViewerEngineProps {
  documentId: string;
  fileUrl: string;
  initialPage?: number;
  zoom: number;
  rotation: number;
  isTwoPage: boolean;
  activeAnnotationTool: 'none' | 'highlight' | 'pen' | 'eraser';
  annotations: Annotation[];
  notes: Note[];
  onPageChange: (page: number, total: number) => void;
  onAddAnnotation: (annotation: Omit<Annotation, 'id' | 'created_at' | 'updated_at'>) => void;
  onDeleteAnnotation: (id: string) => void;
  onUserActivity: () => void;
  onOpenAIWithSelection: (text: string, pageNumber: number, mode?: string) => void;
  onAddNoteFromSelection: (text: string, pageNumber: number) => void;
  onMakeFlashcardFromSelection: (text: string, pageNumber: number) => void;
  onMakeMCQFromSelection: (text: string, pageNumber: number) => void;
  currentPage: number;
}

export const PDFViewerEngine: React.FC<PDFViewerEngineProps> = ({
  documentId,
  fileUrl,
  initialPage = 1,
  zoom,
  rotation,
  isTwoPage,
  activeAnnotationTool,
  annotations,
  notes,
  onPageChange,
  onAddAnnotation,
  onDeleteAnnotation,
  onUserActivity,
  onOpenAIWithSelection,
  onAddNoteFromSelection,
  onMakeFlashcardFromSelection,
  onMakeMCQFromSelection,
  currentPage,
}) => {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<SelectionState | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const pageCanvasRef1 = useRef<HTMLCanvasElement>(null);
  const pageCanvasRef2 = useRef<HTMLCanvasElement>(null);
  const textLayerRef1 = useRef<HTMLDivElement>(null);
  const textLayerRef2 = useRef<HTMLDivElement>(null);
  const renderTaskRef1 = useRef<any>(null);
  const renderTaskRef2 = useRef<any>(null);

  const [pageDimensions1, setPageDimensions1] = useState({ width: 0, height: 0 });
  const [pageDimensions2, setPageDimensions2] = useState({ width: 0, height: 0 });

  // Page turn animation direction (1 for forward, -1 for backward)
  const [direction, setDirection] = useState<number>(1);
  const prevPageRef = useRef<number>(currentPage);

  useEffect(() => {
    if (currentPage > prevPageRef.current) {
      setDirection(1);
    } else if (currentPage < prevPageRef.current) {
      setDirection(-1);
    }
    prevPageRef.current = currentPage;
  }, [currentPage]);

  // Load PDF document
  useEffect(() => {
    let cancelled = false;
    async function loadPdf() {
      try {
        setLoading(true);
        setError(null);
        const loadingTask = pdfjsLib.getDocument(fileUrl);
        const doc = await loadingTask.promise;
        if (!cancelled) {
          setPdfDoc(doc);
          setTotalPages(doc.numPages);
          onPageChange(Math.min(initialPage, doc.numPages), doc.numPages);
        }
      } catch (err: any) {
        console.error('PDF load error:', err);
        if (!cancelled) {
          setError(err.message || 'Failed to load PDF document.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadPdf();
    return () => {
      cancelled = true;
    };
  }, [fileUrl]);

  // Extract page text in background for indexing if needed (cached & progressive)
  useEffect(() => {
    if (!pdfDoc) return;
    let cancelled = false;

    async function extractAndIndex() {
      try {
        // Check if document already has indexed pages
        const checkRes = await fetch(`/api/documents/${documentId}`);
        const checkData = await checkRes.json();
        if (checkData.success && checkData.document?.pages?.length >= pdfDoc.numPages) {
          return;
        }

        const startIndex = (checkData.document?.pages?.length || 0) + 1;
        const totalToExtract = Math.min(pdfDoc.numPages, 100);

        if (startIndex > totalToExtract) return;

        for (let batchStart = startIndex; batchStart <= totalToExtract; batchStart += 15) {
          if (cancelled) break;
          const batchEnd = Math.min(totalToExtract, batchStart + 14);
          const pagesData = [];

          for (let i = batchStart; i <= batchEnd; i++) {
            if (cancelled) break;
            const page = await pdfDoc.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
              .map((item: any) => item.str)
              .join(' ');
            pagesData.push({ pageNumber: i, text: pageText });
          }

          if (pagesData.length > 0 && !cancelled) {
            await fetch(`/api/documents/${documentId}/index-pages`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ pages: pagesData, totalPages: pdfDoc.numPages }),
            });
          }
        }
      } catch (err) {
        console.error('Indexing background error:', err);
      }
    }

    extractAndIndex();
    return () => {
      cancelled = true;
    };
  }, [pdfDoc, documentId]);

  // Render a specific page to canvas and build text selection layer
  const renderPage = useCallback(
    async (
      pageNum: number,
      canvas: HTMLCanvasElement | null,
      textLayerDiv: HTMLDivElement | null,
      setDimensions: (dim: { width: number; height: number }) => void
    ) => {
      if (!pdfDoc || !canvas || pageNum < 1 || pageNum > pdfDoc.numPages) return;

      const isPage1 = canvas === pageCanvasRef1.current;
      if (isPage1 && renderTaskRef1.current) {
        try { renderTaskRef1.current.cancel(); } catch {}
        renderTaskRef1.current = null;
      } else if (!isPage1 && renderTaskRef2.current) {
        try { renderTaskRef2.current.cancel(); } catch {}
        renderTaskRef2.current = null;
      }

      try {
        const page = await pdfDoc.getPage(pageNum);
        // Honor document's native page.rotate + user manual rotation
        const effectiveRotation = ((page.rotate || 0) + rotation) % 360;
        const unscaledViewport = page.getViewport({ scale: 1, rotation: effectiveRotation });
        
        // Auto scale to fit container width and height comfortably while respecting zoom
        const containerWidth = containerRef.current?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1200);
        const containerHeight = containerRef.current?.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 800);

        const availableWidth = isTwoPage ? (containerWidth - 64) / 2 : containerWidth - 48;
        const availableHeight = containerHeight - 140;

        const widthScale = availableWidth / unscaledViewport.width;
        const heightScale = availableHeight / unscaledViewport.height;

        // Base scale fits the page within available height/width so it's fully visible and upright
        const baseScale = Math.min(widthScale, heightScale);
        const scale = Math.max(0.35, baseScale * zoom);

        const viewport = page.getViewport({ scale, rotation: effectiveRotation });

        const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        setDimensions({ width: Math.floor(viewport.width), height: Math.floor(viewport.height) });

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };
        const renderTask = page.render(renderContext);
        if (isPage1) renderTaskRef1.current = renderTask;
        else renderTaskRef2.current = renderTask;

        await renderTask.promise;

        // Render TextLayer for native selection
        if (textLayerDiv) {
          textLayerDiv.innerHTML = '';
          textLayerDiv.style.width = `${Math.floor(viewport.width)}px`;
          textLayerDiv.style.height = `${Math.floor(viewport.height)}px`;

          const textContent = await page.getTextContent();
          try {
            const textLayer = new pdfjsLib.TextLayer({
              textContentSource: textContent,
              container: textLayerDiv,
              viewport: viewport,
            });
            await textLayer.render();
          } catch (tlErr) {
            for (const item of textContent.items as any[]) {
              const span = document.createElement('span');
              span.textContent = item.str + ' ';
              span.className = 'text-transparent selection:bg-neutral-900/20 dark:selection:bg-white/30';
              span.style.position = 'absolute';

              const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
              const fontHeight = Math.sqrt(tx[2] * tx[2] + tx[3] * tx[3]);
              span.style.fontSize = `${fontHeight}px`;
              span.style.left = `${tx[4]}px`;
              span.style.top = `${tx[5] - fontHeight}px`;

              textLayerDiv.appendChild(span);
            }
          }
        }
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error(`Error rendering page ${pageNum}:`, err);
        }
      }
    },
    [pdfDoc, zoom, rotation, isTwoPage]
  );

  // Trigger page rendering on state change
  useEffect(() => {
    if (!pdfDoc) return;

    // Page 1
    renderPage(currentPage, pageCanvasRef1.current, textLayerRef1.current, setPageDimensions1);

    // Page 2 (if two-page spread enabled)
    if (isTwoPage && currentPage + 1 <= pdfDoc.numPages) {
      renderPage(
        currentPage + 1,
        pageCanvasRef2.current,
        textLayerRef2.current,
        setPageDimensions2
      );
    }
  }, [pdfDoc, currentPage, zoom, rotation, isTwoPage, renderPage]);

  // Resize observer to re-scale and fit PDF smoothly when window or sidebar changes layout width
  useEffect(() => {
    if (!containerRef.current || !pdfDoc) return;
    let timeoutId: NodeJS.Timeout;
    const observer = new ResizeObserver(() => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        renderPage(currentPage, pageCanvasRef1.current, textLayerRef1.current, setPageDimensions1);
        if (isTwoPage && currentPage + 1 <= pdfDoc.numPages) {
          renderPage(
            currentPage + 1,
            pageCanvasRef2.current,
            textLayerRef2.current,
            setPageDimensions2
          );
        }
      }, 100);
    });

    observer.observe(containerRef.current);
    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [pdfDoc, currentPage, isTwoPage, renderPage]);

  // Helper to apply highlight from DOM range with multi-line/multi-rect support
  const applyHighlightFromRange = (range: Range, pageNum: number, text: string) => {
    const isPage2 = isTwoPage && pageNum === currentPage + 1;
    const targetDims = isPage2 ? pageDimensions2 : pageDimensions1;
    const targetCanvas = isPage2 ? pageCanvasRef2.current : pageCanvasRef1.current;
    const pageContainer = targetCanvas?.getBoundingClientRect();

    if (!pageContainer || targetDims.width <= 0 || targetDims.height <= 0) return;

    // Extract client rects for multi-line precision
    const clientRects = Array.from(range.getClientRects());
    const normalizedRects = clientRects
      .filter((r) => r.width > 0.5 && r.height > 0.5)
      .map((r) => ({
        x: Math.max(0, (r.left - pageContainer.left) / targetDims.width),
        y: Math.max(0, (r.top - pageContainer.top) / targetDims.height),
        width: Math.min(1, r.width / targetDims.width),
        height: Math.min(1, r.height / targetDims.height),
      }));

    const bounding = range.getBoundingClientRect();
    const normalizedBounding = {
      x: Math.max(0, (bounding.left - pageContainer.left) / targetDims.width),
      y: Math.max(0, (bounding.top - pageContainer.top) / targetDims.height),
      width: Math.min(1, bounding.width / targetDims.width),
      height: Math.min(1, bounding.height / targetDims.height),
    };

    onAddAnnotation({
      document_id: documentId,
      user_id: 'demo-user-id',
      page_number: pageNum,
      type: 'highlight',
      coordinates: {
        x: normalizedBounding.x,
        y: normalizedBounding.y,
        width: normalizedBounding.width,
        height: normalizedBounding.height,
        rects: normalizedRects.length > 0 ? normalizedRects : undefined,
      },
      color: 'rgba(245, 205, 71, 0.35)',
      content: text,
    });
  };

  // Handle native text selection
  const handleMouseUp = () => {
    onUserActivity();
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      setSelection(null);
      return;
    }

    const text = sel.toString().trim();
    if (text.length > 0) {
      const range = sel.getRangeAt(0);

      // Determine which page was selected (supports two-page spread)
      let pageNum = currentPage;
      if (isTwoPage && textLayerRef2.current && range.commonAncestorContainer) {
        if (textLayerRef2.current.contains(range.commonAncestorContainer)) {
          pageNum = currentPage + 1;
        }
      }

      const isPage2 = isTwoPage && pageNum === currentPage + 1;
      const targetDims = isPage2 ? pageDimensions2 : pageDimensions1;
      const targetCanvas = isPage2 ? pageCanvasRef2.current : pageCanvasRef1.current;
      const pageContainer = targetCanvas?.getBoundingClientRect();

      let normalizedRects: Array<{ x: number; y: number; width: number; height: number }> | undefined = undefined;
      if (pageContainer && targetDims.width > 0 && targetDims.height > 0) {
        const clientRects = Array.from(range.getClientRects());
        normalizedRects = clientRects
          .filter((r) => r.width > 0.5 && r.height > 0.5)
          .map((r) => ({
            x: Math.max(0, (r.left - pageContainer.left) / targetDims.width),
            y: Math.max(0, (r.top - pageContainer.top) / targetDims.height),
            width: Math.min(1, r.width / targetDims.width),
            height: Math.min(1, r.height / targetDims.height),
          }));
      }

      const rect = range.getBoundingClientRect();
      setSelection({
        text,
        pageNumber: pageNum,
        rect: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        },
        rects: normalizedRects,
      });
    }
  };

  const handleHighlightSelection = () => {
    if (!selection) return;

    const isPage2 = isTwoPage && selection.pageNumber === currentPage + 1;
    const targetDims = isPage2 ? pageDimensions2 : pageDimensions1;
    const targetCanvas = isPage2 ? pageCanvasRef2.current : pageCanvasRef1.current;
    const pageContainer = targetCanvas?.getBoundingClientRect();

    if (pageContainer && targetDims.width > 0 && targetDims.height > 0) {
      const normalizedX = (selection.rect.left - pageContainer.left) / targetDims.width;
      const normalizedY = (selection.rect.top - pageContainer.top) / targetDims.height;
      const normalizedW = selection.rect.width / targetDims.width;
      const normalizedH = selection.rect.height / targetDims.height;

      onAddAnnotation({
        document_id: documentId,
        user_id: 'demo-user-id',
        page_number: selection.pageNumber,
        type: 'highlight',
        coordinates: {
          x: Math.max(0, normalizedX),
          y: Math.max(0, normalizedY),
          width: Math.min(1, normalizedW),
          height: Math.min(1, normalizedH),
          rects: selection.rects && selection.rects.length > 0 ? selection.rects : undefined,
        },
        color: 'rgba(245, 205, 71, 0.4)',
        content: selection.text,
      });
    }

    window.getSelection()?.removeAllRanges();
    setSelection(null);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={onUserActivity}
      onTouchStart={onUserActivity}
      onMouseUp={handleMouseUp}
      className="relative flex-1 h-screen overflow-auto bg-[#EFEFED] dark:bg-[#070707] flex items-center justify-center p-4 md:p-8 select-auto"
    >
      {loading && (
        <div className="flex flex-col items-center gap-3 text-neutral-500 text-xs">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span>Opening PDF document...</span>
        </div>
      )}

      {error && (
        <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs max-w-md text-center space-y-2">
          <AlertCircle className="w-6 h-6 mx-auto" />
          <p className="font-semibold">Unable to display document</p>
          <p>{error}</p>
        </div>
      )}

      {/* PDF Pages Spread Container with Apple Books 3D Page Turn Animation */}
      {!loading && !error && (
        <div style={{ perspective: '1600px' }} className="my-auto pt-16 pb-20 select-auto">
          <motion.div
            key={isTwoPage ? Math.floor(currentPage / 2) : currentPage}
            initial={{
              rotateY: direction > 0 ? 16 : -16,
              opacity: 0.7,
              x: direction > 0 ? 25 : -25,
              scale: 0.985,
            }}
            animate={{
              rotateY: 0,
              opacity: 1,
              x: 0,
              scale: 1,
            }}
            transition={{
              type: 'spring',
              stiffness: 280,
              damping: 26,
              mass: 0.8,
            }}
            style={{
              transformStyle: 'preserve-3d',
              transformOrigin: direction > 0 ? 'left center' : 'right center',
            }}
            className="flex flex-col lg:flex-row items-center justify-center gap-0 shadow-2xl"
          >
            {/* Page 1 (Left Page in Two-Page Spread or Single Page) */}
            <div
              className={`relative bg-white overflow-hidden border border-black/10 dark:border-white/10 ${
                isTwoPage && currentPage + 1 <= totalPages
                  ? 'rounded-l-sm rounded-r-none border-r-0 shadow-[inset_-16px_0_20px_-8px_rgba(0,0,0,0.14)]'
                  : 'rounded-sm shadow-2xl'
              }`}
              style={{
                width: pageDimensions1.width ? `${pageDimensions1.width}px` : 'auto',
                height: pageDimensions1.height ? `${pageDimensions1.height}px` : 'auto',
              }}
            >
              {/* Canvas layer */}
              <canvas ref={pageCanvasRef1} className="block" />

              {/* Native Text selection layer */}
              <div
                ref={textLayerRef1}
                className="textLayer absolute inset-0 z-10 select-text overflow-hidden pointer-events-auto leading-normal"
              />

              {/* Subtle inner spine shadow when in two-page spread */}
              {isTwoPage && currentPage + 1 <= totalPages && (
                <div className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none bg-gradient-to-l from-black/[0.08] to-transparent z-15" />
              )}

              {/* Non-destructive annotation overlay */}
              <AnnotationCanvas
                pageNumber={currentPage}
                width={pageDimensions1.width}
                height={pageDimensions1.height}
                activeTool={activeAnnotationTool}
                annotations={annotations}
                onAddAnnotation={onAddAnnotation}
                onDeleteAnnotation={onDeleteAnnotation}
                documentId={documentId}
              />
            </div>

            {/* Page 2 (Right Page in Two-Page Spread) */}
            {isTwoPage && currentPage + 1 <= totalPages && (
              <div
                className="relative bg-white overflow-hidden rounded-r-sm rounded-l-none border border-black/10 dark:border-white/10 border-l-0 shadow-[inset_16px_0_20px_-8px_rgba(0,0,0,0.14)]"
                style={{
                  width: pageDimensions2.width ? `${pageDimensions2.width}px` : 'auto',
                  height: pageDimensions2.height ? `${pageDimensions2.height}px` : 'auto',
                }}
              >
                {/* Canvas layer */}
                <canvas ref={pageCanvasRef2} className="block" />

                {/* Text layer */}
                <div
                  ref={textLayerRef2}
                  className="textLayer absolute inset-0 z-10 select-text overflow-hidden pointer-events-auto leading-normal"
                />

                {/* Subtle inner spine shadow for right page */}
                <div className="absolute left-0 top-0 bottom-0 w-8 pointer-events-none bg-gradient-to-r from-black/[0.08] to-transparent z-15" />

                {/* Annotation overlay */}
                <AnnotationCanvas
                  pageNumber={currentPage + 1}
                  width={pageDimensions2.width}
                  height={pageDimensions2.height}
                  activeTool={activeAnnotationTool}
                  annotations={annotations}
                  onAddAnnotation={onAddAnnotation}
                  onDeleteAnnotation={onDeleteAnnotation}
                  documentId={documentId}
                />
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Floating Glass Selection Menu */}
      <SelectionMenu
        selection={selection}
        onExplain={(mode) => {
          if (selection) {
            onOpenAIWithSelection(selection.text, selection.pageNumber, mode);
            setSelection(null);
          }
        }}
        onMakeFlashcard={() => {
          if (selection) {
            onMakeFlashcardFromSelection(selection.text, selection.pageNumber);
            setSelection(null);
          }
        }}
        onMakeMCQ={() => {
          if (selection) {
            onMakeMCQFromSelection(selection.text, selection.pageNumber);
            setSelection(null);
          }
        }}
        onSummarize={() => {
          if (selection) {
            onOpenAIWithSelection(`Summarize: "${selection.text}"`, selection.pageNumber);
            setSelection(null);
          }
        }}
        onAddNote={() => {
          if (selection) {
            onAddNoteFromSelection(selection.text, selection.pageNumber);
            setSelection(null);
          }
        }}
        onHighlight={handleHighlightSelection}
        onAskCustomAI={() => {
          if (selection) {
            onOpenAIWithSelection(selection.text, selection.pageNumber);
            setSelection(null);
          }
        }}
        onClose={() => setSelection(null)}
      />
    </div>
  );
};
