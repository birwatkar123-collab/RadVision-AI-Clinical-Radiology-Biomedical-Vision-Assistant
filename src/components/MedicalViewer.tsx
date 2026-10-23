import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  Ruler,
  Square,
  ShieldCheck,
  Eye,
  RefreshCw,
  Sliders,
  Sparkles,
  Layers,
  Crosshair,
  Trash2,
} from 'lucide-react';
import { CaliperMeasurement, RoiBox, WindowPreset } from '../types/clinical';
import { soundFx } from '../utils/audioSynth';

interface MedicalViewerProps {
  imageUrl?: string | null;
  detectedBox?: number[] | null; // [ymin, xmin, ymax, xmax] 0-1000
  featureName?: string;
  onRoiChange?: (roi: RoiBox | null) => void;
  onImageDeidentified?: (newImageUrl: string) => void;
}

export const MedicalViewer: React.FC<MedicalViewerProps> = ({
  imageUrl,
  detectedBox,
  featureName,
  onRoiChange,
  onImageDeidentified,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasOverlayRef = useRef<HTMLCanvasElement>(null);

  // View state
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [rotation, setRotation] = useState<number>(0);
  const [windowPreset, setWindowPreset] = useState<WindowPreset>('normal');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Interactive Tools: 'pan' | 'caliper' | 'roi' | 'phi-mask'
  const [activeTool, setActiveTool] = useState<'pan' | 'caliper' | 'roi' | 'phi-mask'>('pan');

  // Caliper state
  const [caliperPoints, setCaliperPoints] = useState<CaliperMeasurement[]>([]);
  const [pendingCaliperStart, setPendingCaliperStart] = useState<{ x: number; y: number } | null>(null);

  // ROI state
  const [roiBox, setRoiBox] = useState<RoiBox | null>(null);
  const [isDrawingRoi, setIsDrawingRoi] = useState<boolean>(false);
  const [roiStart, setRoiStart] = useState<{ x: number; y: number } | null>(null);

  // PHI Masking state
  const [phiMasks, setPhiMasks] = useState<Array<{ x: number; y: number; w: number; h: number }>>([]);
  const [isDrawingMask, setIsDrawingMask] = useState<boolean>(false);
  const [maskStart, setMaskStart] = useState<{ x: number; y: number } | null>(null);

  // Show AI overlay
  const [showAiOverlay, setShowAiOverlay] = useState<boolean>(true);

  // Filter styles mapped from window preset
  const getFilterStyle = (): string => {
    switch (windowPreset) {
      case 'lung':
        return 'contrast(170%) brightness(115%) saturate(0%)';
      case 'bone':
        return 'contrast(240%) brightness(85%) saturate(0%)';
      case 'soft-tissue':
        return 'contrast(130%) brightness(100%) saturate(0%)';
      case 'brain':
        return 'contrast(190%) brightness(95%) saturate(0%)';
      case 'invert':
        return 'invert(100%) contrast(150%) brightness(95%) saturate(0%)';
      case 'normal':
      default:
        return 'none';
    }
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    setWindowPreset('normal');
    soundFx.playClick();
  };

  const handleZoom = (delta: number) => {
    setZoom((prev) => Math.min(Math.max(prev + delta, 0.7), 6));
    soundFx.playClick();
  };

  // Convert mouse event coordinates to normalized [0, 1000] space on image
  const getNormalizedCoords = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return { x: 0, y: 0, normX: 0, normY: 0 };
    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const normX = Math.max(0, Math.min(1000, Math.round((x / rect.width) * 1000)));
    const normY = Math.max(0, Math.min(1000, Math.round((y / rect.height) * 1000)));
    return { x, y, normX, normY };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool === 'pan') {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    } else if (activeTool === 'caliper') {
      const { normX, normY } = getNormalizedCoords(e);
      if (!pendingCaliperStart) {
        setPendingCaliperStart({ x: normX, y: normY });
        soundFx.playClick();
      } else {
        // Complete caliper line
        const dx = normX - pendingCaliperStart.x;
        const dy = normY - pendingCaliperStart.y;
        const distPx = Math.round(Math.sqrt(dx * dx + dy * dy));
        const distMm = Number((distPx * 0.28).toFixed(1)); // Approximate 0.28mm per unit calibration

        const newMeasurement: CaliperMeasurement = {
          id: Math.random().toString(36).substring(2, 9),
          x1: pendingCaliperStart.x,
          y1: pendingCaliperStart.y,
          x2: normX,
          y2: normY,
          distancePx: distPx,
          distanceMm: distMm,
        };
        setCaliperPoints((prev) => [...prev, newMeasurement]);
        setPendingCaliperStart(null);
        soundFx.playScanPing();
      }
    } else if (activeTool === 'roi') {
      const { normX, normY } = getNormalizedCoords(e);
      setIsDrawingRoi(true);
      setRoiStart({ x: normX, y: normY });
    } else if (activeTool === 'phi-mask') {
      const { normX, normY } = getNormalizedCoords(e);
      setIsDrawingMask(true);
      setMaskStart({ x: normX, y: normY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning && activeTool === 'pan') {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      });
    } else if (isDrawingRoi && roiStart) {
      const { normX, normY } = getNormalizedCoords(e);
      const newBox: RoiBox = {
        ymin: Math.min(roiStart.y, normY),
        xmin: Math.min(roiStart.x, normX),
        ymax: Math.max(roiStart.y, normY),
        xmax: Math.max(roiStart.x, normX),
      };
      setRoiBox(newBox);
    } else if (isDrawingMask && maskStart) {
      // Live preview handled visually; coords computed on mouse up
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning) {
      setIsPanning(false);
    }
    if (isDrawingRoi && roiStart) {
      setIsDrawingRoi(false);
      const { normX, normY } = getNormalizedCoords(e);
      if (Math.abs(normX - roiStart.x) > 20 && Math.abs(normY - roiStart.y) > 20) {
        const finalBox: RoiBox = {
          ymin: Math.min(roiStart.y, normY),
          xmin: Math.min(roiStart.x, normX),
          ymax: Math.max(roiStart.y, normY),
          xmax: Math.max(roiStart.x, normX),
        };
        setRoiBox(finalBox);
        onRoiChange?.(finalBox);
        soundFx.playScanPing();
      }
      setRoiStart(null);
    }
    if (isDrawingMask && maskStart) {
      setIsDrawingMask(false);
      const { normX, normY } = getNormalizedCoords(e);
      const w = Math.abs(normX - maskStart.x);
      const h = Math.abs(normY - maskStart.y);
      if (w > 10 && h > 10) {
        const newMask = {
          x: Math.min(maskStart.x, normX),
          y: Math.min(maskStart.y, normY),
          w,
          h,
        };
        const updated = [...phiMasks, newMask];
        setPhiMasks(updated);
        soundFx.playClick();
        applyDeidentification(updated);
      }
      setMaskStart(null);
    }
  };

  // Burn PHI masks into image data URL for true client-side zero-leakage privacy
  const applyDeidentification = useCallback((masks: Array<{ x: number; y: number; w: number; h: number }>) => {
    if (!imageRef.current) return;
    const canvas = document.createElement('canvas');
    const img = imageRef.current;
    canvas.width = img.naturalWidth || 800;
    canvas.height = img.naturalHeight || 800;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Apply black boxes / pixelated blur over masked areas
    ctx.fillStyle = '#0a0d14';
    masks.forEach((m) => {
      const rx = (m.x / 1000) * canvas.width;
      const ry = (m.y / 1000) * canvas.height;
      const rw = (m.w / 1000) * canvas.width;
      const rh = (m.h / 1000) * canvas.height;
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2;
      ctx.strokeRect(rx, ry, rw, rh);
    });

    const newUrl = canvas.toDataURL('image/png');
    onImageDeidentified?.(newUrl);
  }, [onImageDeidentified]);

  const clearRoi = () => {
    setRoiBox(null);
    onRoiChange?.(null);
    soundFx.playClick();
  };

  const clearCalipers = () => {
    setCaliperPoints([]);
    setPendingCaliperStart(null);
    soundFx.playClick();
  };

  const clearPhiMasks = () => {
    setPhiMasks([]);
    soundFx.playClick();
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
    soundFx.playClick();
  };

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (containerRef.current && containerRef.current.contains(e.target as Node)) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.15 : -0.15;
        setZoom((prev) => Math.min(Math.max(prev + delta, 0.7), 6));
      }
    };
    const el = containerRef.current;
    if (el) {
      el.addEventListener('wheel', handleWheel, { passive: false });
    }
    return () => {
      if (el) el.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col bg-slate-950 border border-slate-800 rounded-xl overflow-hidden select-none touch-none ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'h-[620px]'
      }`}
    >
      {/* Top Controls Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900/90 border-b border-slate-800 text-xs text-slate-300 z-20 backdrop-blur-md">
        {/* Tool Mode Tabs */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setActiveTool('pan');
              soundFx.playClick();
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
              activeTool === 'pan'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 font-medium'
                : 'hover:bg-slate-800 text-slate-400'
            }`}
            title="Pan and Zoom"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Pan/Inspect</span>
          </button>

          <button
            onClick={() => {
              setActiveTool('caliper');
              soundFx.playClick();
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
              activeTool === 'caliper'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 font-medium'
                : 'hover:bg-slate-800 text-slate-400'
            }`}
            title="Measure distance between 2 points in mm"
          >
            <Ruler className="w-3.5 h-3.5" />
            <span>Caliper</span>
            {caliperPoints.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-amber-500/30 text-amber-300 rounded text-[10px]">
                {caliperPoints.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTool('roi');
              soundFx.playClick();
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
              activeTool === 'roi'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-medium'
                : 'hover:bg-slate-800 text-slate-400'
            }`}
            title="Draw Region of Interest (ROI) for targeted AI analysis"
          >
            <Square className="w-3.5 h-3.5" />
            <span>Target ROI</span>
            {roiBox && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
            )}
          </button>

          <button
            onClick={() => {
              setActiveTool('phi-mask');
              soundFx.playClick();
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
              activeTool === 'phi-mask'
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40 font-medium'
                : 'hover:bg-slate-800 text-slate-400'
            }`}
            title="De-identification: Draw blackouts over sensitive patient names or MRN stamps"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>PHI Shield</span>
            {phiMasks.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-purple-500/30 text-purple-300 rounded text-[10px]">
                {phiMasks.length}
              </span>
            )}
          </button>
        </div>

        {/* Window Presets */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono mr-1">Window:</span>
          {(['normal', 'lung', 'bone', 'soft-tissue', 'brain', 'invert'] as WindowPreset[]).map((preset) => (
            <button
              key={preset}
              onClick={() => {
                setWindowPreset(preset);
                soundFx.playClick();
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-mono capitalize transition-colors ${
                windowPreset === preset
                  ? 'bg-slate-700 text-cyan-300 font-semibold border border-slate-600'
                  : 'hover:bg-slate-800/80 text-slate-400'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>

        {/* View Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleZoom(0.25)}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleZoom(-0.25)}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setRotation((r) => (r + 90) % 360);
              soundFx.playClick();
            }}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
            title="Rotate 90°"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={resetView}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
            title="Reset View (Zoom 100%)"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowAiOverlay((v) => !v)}
            className={`p-1.5 rounded transition-colors ${
              showAiOverlay ? 'text-cyan-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-800'
            }`}
            title="Toggle AI Anomaly Overlay"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Medical Viewport */}
      <div
        className={`relative flex-1 overflow-hidden flex items-center justify-center bg-black ${
          activeTool === 'pan' ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-crosshair'
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={(e) => {
          e.preventDefault();
          const touch = e.touches[0];
          if (!touch) return;
          const synthetic = { clientX: touch.clientX, clientY: touch.clientY } as unknown as React.MouseEvent<HTMLDivElement>;
          if (activeTool === 'pan') {
            setIsPanning(true);
            setStartPan({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
          } else if (activeTool === 'roi') {
            const { normX, normY } = getNormalizedCoords(synthetic);
            setIsDrawingRoi(true);
            setRoiStart({ x: normX, y: normY });
          } else if (activeTool === 'phi-mask') {
            const { normX, normY } = getNormalizedCoords(synthetic);
            setIsDrawingMask(true);
            setMaskStart({ x: normX, y: normY });
          }
        }}
        onTouchMove={(e) => {
          e.preventDefault();
          const touch = e.touches[0];
          if (!touch) return;
          if (isPanning && activeTool === 'pan') {
            setPan({ x: touch.clientX - startPan.x, y: touch.clientY - startPan.y });
          } else if (isDrawingRoi && roiStart) {
            const synthetic = { clientX: touch.clientX, clientY: touch.clientY } as unknown as React.MouseEvent<HTMLDivElement>;
            const { normX, normY } = getNormalizedCoords(synthetic);
            setRoiBox({
              ymin: Math.min(roiStart.y, normY),
              xmin: Math.min(roiStart.x, normX),
              ymax: Math.max(roiStart.y, normY),
              xmax: Math.max(roiStart.x, normX),
            });
          }
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          if (isPanning) setIsPanning(false);
          if (isDrawingRoi && roiStart) {
            setIsDrawingRoi(false);
            if (roiBox && Math.abs(roiBox.xmax - roiBox.xmin) > 20 && Math.abs(roiBox.ymax - roiBox.ymin) > 20) {
              onRoiChange?.(roiBox);
              soundFx.playScanPing();
            }
            setRoiStart(null);
          }
          if (isDrawingMask && maskStart) {
            setIsDrawingMask(false);
            if (roiBox) {
              // compute roughly from current roiBox not stored; skip complex touch for masks
            }
            setMaskStart(null);
          }
        }}
      >
        {/* Radiological Crosshair Guidelines Background */}
        <div className="absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px]" />

        {/* Viewport Transform Container */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
            transition: isPanning ? 'none' : 'transform 0.1s ease-out',
          }}
          className="relative max-w-full max-h-full flex items-center justify-center"
        >
          {imageUrl ? (
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Medical Scan Viewport"
              draggable={false}
              style={{ filter: getFilterStyle() }}
              className="max-h-[520px] max-w-[520px] object-contain rounded shadow-2xl pointer-events-none border border-slate-800/60"
            />
          ) : (
            <div className="w-[450px] h-[450px] flex items-center justify-center text-slate-600 font-mono text-xs border border-slate-800/60 rounded bg-slate-950">
              No Scan Loaded
            </div>
          )}

          {/* SVG Overlay for Calipers, ROI, and AI Detection */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 1000 1000"
            preserveAspectRatio="none"
          >
            {/* AI Detected Anomaly Bounding Box */}
            {showAiOverlay && detectedBox && detectedBox.length === 4 && (
              <g className="animate-pulse">
                <rect
                  x={detectedBox[1]}
                  y={detectedBox[0]}
                  width={Math.max(20, detectedBox[3] - detectedBox[1])}
                  height={Math.max(20, detectedBox[2] - detectedBox[0])}
                  fill="rgba(34, 211, 238, 0.12)"
                  stroke="#22d3ee"
                  strokeWidth="3"
                  strokeDasharray="6 3"
                  rx="6"
                />
                <rect
                  x={detectedBox[1]}
                  y={Math.max(0, detectedBox[0] - 28)}
                  width={Math.min(300, (featureName?.length || 10) * 12 + 20)}
                  height="24"
                  fill="#0891b2"
                  rx="4"
                />
                <text
                  x={detectedBox[1] + 8}
                  y={Math.max(16, detectedBox[0] - 11)}
                  fill="#ffffff"
                  fontSize="13"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  AI: {featureName || 'Candidate Anomaly'}
                </text>
              </g>
            )}

            {/* User Target ROI Box */}
            {roiBox && (
              <g>
                <rect
                  x={roiBox.xmin}
                  y={roiBox.ymin}
                  width={roiBox.xmax - roiBox.xmin}
                  height={roiBox.ymax - roiBox.ymin}
                  fill="rgba(16, 185, 129, 0.15)"
                  stroke="#10b981"
                  strokeWidth="3"
                  rx="4"
                />
                <text
                  x={roiBox.xmin + 6}
                  y={roiBox.ymin + 20}
                  fill="#10b981"
                  fontSize="14"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  TARGET ROI
                </text>
              </g>
            )}

            {/* Caliper Measurements */}
            {caliperPoints.map((item) => (
              <g key={item.id}>
                {/* Connecting Line */}
                <line
                  x1={item.x1}
                  y1={item.y1}
                  x2={item.x2}
                  y2={item.y2}
                  stroke="#f59e0b"
                  strokeWidth="3"
                />
                {/* End Point Ticks */}
                <circle cx={item.x1} cy={item.y1} r="5" fill="#f59e0b" />
                <circle cx={item.x2} cy={item.y2} r="5" fill="#f59e0b" />
                {/* Distance Badge */}
                <rect
                  x={(item.x1 + item.x2) / 2 - 38}
                  y={(item.y1 + item.y2) / 2 - 14}
                  width="76"
                  height="22"
                  fill="#78350f"
                  rx="4"
                  stroke="#f59e0b"
                  strokeWidth="1"
                />
                <text
                  x={(item.x1 + item.x2) / 2}
                  y={(item.y1 + item.y2) / 2 + 2}
                  fill="#fef3c7"
                  fontSize="12"
                  fontWeight="bold"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {item.distanceMm} mm
                </text>
              </g>
            ))}

            {/* Caliper Pending Line */}
            {pendingCaliperStart && (
              <circle cx={pendingCaliperStart.x} cy={pendingCaliperStart.y} r="6" fill="#f59e0b" className="animate-ping" />
            )}

            {/* PHI Mask Overlays */}
            {phiMasks.map((mask, idx) => (
              <g key={idx}>
                <rect
                  x={mask.x}
                  y={mask.y}
                  width={mask.w}
                  height={mask.h}
                  fill="#020617"
                  stroke="#a855f7"
                  strokeWidth="2"
                  rx="3"
                />
                <text
                  x={mask.x + 4}
                  y={mask.y + 16}
                  fill="#c084fc"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  PHI REDACTED
                </text>
              </g>
            ))}
          </svg>
        </div>

        {/* HUD Perimeter Overlay Details */}
        <div className="absolute top-3 left-3 pointer-events-none text-slate-400 font-mono text-[11px] space-y-1 bg-slate-950/70 p-2 rounded backdrop-blur border border-slate-800/80">
          <div className="flex items-center gap-1.5 text-cyan-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>RADVISION PACS v4.2</span>
          </div>
          <div>ZOOM: <span className="text-white font-bold">{Math.round(zoom * 100)}%</span></div>
          <div>ROT: <span className="text-white">{rotation}°</span></div>
          <div>WIN: <span className="text-cyan-300 uppercase">{windowPreset}</span></div>
        </div>

        {/* Radiological Orientation Markers */}
        <div className="absolute top-3 right-4 pointer-events-none font-bold text-lg font-mono text-cyan-500/80">
          R
        </div>
        <div className="absolute bottom-10 left-4 pointer-events-none font-bold text-lg font-mono text-cyan-500/80">
          L
        </div>

        {/* Bottom HUD Tool status bar */}
        <div className="absolute bottom-2 inset-x-3 flex items-center justify-between text-[11px] text-slate-400 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 backdrop-blur">
          <div className="flex items-center gap-3">
            <span>
              Tool:{' '}
              <strong className="text-white uppercase font-mono">
                {activeTool === 'pan' && 'Pan & Inspect (Click & Drag)'}
                {activeTool === 'caliper' && (pendingCaliperStart ? 'Click second point to measure' : 'Click first point')}
                {activeTool === 'roi' && 'Drag rectangle to bound target region'}
                {activeTool === 'phi-mask' && 'Drag box over patient label to redact PHI'}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {roiBox && (
              <button
                onClick={clearRoi}
                className="flex items-center gap-1 px-2 py-0.5 bg-emerald-950 text-emerald-400 rounded hover:bg-emerald-900 border border-emerald-800"
              >
                <Trash2 className="w-3 h-3" /> Clear ROI
              </button>
            )}
            {caliperPoints.length > 0 && (
              <button
                onClick={clearCalipers}
                className="flex items-center gap-1 px-2 py-0.5 bg-amber-950 text-amber-400 rounded hover:bg-amber-900 border border-amber-800"
              >
                <Trash2 className="w-3 h-3" /> Clear Calipers
              </button>
            )}
            {phiMasks.length > 0 && (
              <button
                onClick={clearPhiMasks}
                className="flex items-center gap-1 px-2 py-0.5 bg-purple-950 text-purple-400 rounded hover:bg-purple-900 border border-purple-800"
              >
                <Trash2 className="w-3 h-3" /> Reset PHI Masks
              </button>
            )}
            <span className="text-slate-500 text-[10px]">Mouse Wheel / Touch: Zoom/Pan</span>
          </div>
        </div>
      </div>
    </div>
  );
};
