import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X, Check, ZoomIn, ZoomOut, RotateCw, Move, ArrowUp, ArrowDown,
  ArrowLeft, ArrowRight, RefreshCw, Sparkles, Eye, Scissors
} from 'lucide-react';

export const AvatarCropModal = ({ isOpen, imageSrc, onClose, onSave }) => {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [imgNaturalSize, setImgNaturalSize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const posStartRef = useRef({ x: 0, y: 0 });

  const VIEWPORT_SIZE = 240; // Rozmiar okręgu kadrowania w pikselach
  const OUTPUT_SIZE = 360;   // Rozmiar wygenerowanego pliku PNG/JPEG

  // Ładowanie wymiarów oryginalnego obrazka
  useEffect(() => {
    if (!imageSrc || !isOpen) return;
    const img = new Image();
    img.onload = () => {
      setImgNaturalSize({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
      setZoom(1);
      setPosition({ x: 0, y: 0 });
      setRotation(0);
    };
    img.src = imageSrc;
  }, [imageSrc, isOpen]);

  // Obliczenie skali bazowej (cover okręgu)
  const baseScale = React.useMemo(() => {
    if (!imgNaturalSize.width || !imgNaturalSize.height) return 1;
    const scaleX = VIEWPORT_SIZE / imgNaturalSize.width;
    const scaleY = VIEWPORT_SIZE / imgNaturalSize.height;
    return Math.max(scaleX, scaleY);
  }, [imgNaturalSize]);

  // Obsługa przeciągania myszą
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    posStartRef.current = { ...position };
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPosition({
      x: posStartRef.current.x + dx,
      y: posStartRef.current.y + dy
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Obsługa dotyku na telefonach
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      posStartRef.current = { ...position };
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStartRef.current.x;
    const dy = e.touches[0].clientY - dragStartRef.current.y;
    setPosition({
      x: posStartRef.current.x + dx,
      y: posStartRef.current.y + dy
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Obsługa zoomowania kółkiem myszy
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.0015;
    setZoom(prev => Math.min(4, Math.max(0.7, +(prev + delta).toFixed(2))));
  };

  // Przyciski kierunkowe do precyzyjnego przesuwania
  const nudge = (dx, dy) => {
    setPosition(prev => ({ x: prev.x + dx, y: prev.y + dy }));
  };

  const handleReset = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  };

  // Zatwierdzenie i generowanie ostatecznego skadrowanego zdjęcia
  const handleConfirmCrop = () => {
    if (!imageSrc) return;
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const R = OUTPUT_SIZE / VIEWPORT_SIZE;
      const center = OUTPUT_SIZE / 2;

      ctx.save();
      // Przesuń do środka wyjściowego canvasu + przesunięcie użytkownika
      ctx.translate(center + position.x * R, center + position.y * R);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom, zoom);

      const drawW = imgNaturalSize.width * baseScale * R;
      const drawH = imgNaturalSize.height * baseScale * R;

      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.90);
      onSave(croppedDataUrl);
      onClose();
    };
    img.src = imageSrc;
  };

  if (!isOpen || !imageSrc) return null;

  const previewW = imgNaturalSize.width * baseScale;
  const previewH = imgNaturalSize.height * baseScale;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[60] flex items-center justify-center p-3 sm:p-4 animate-fade-in select-none">
      <div className="bg-dark-800 border border-dark-600 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Nagłówek modala */}
        <div className="px-5 py-3.5 border-b border-dark-750 flex items-center justify-between bg-dark-900/60">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-brand-500/20 text-brand-400 rounded-lg">
              <Scissors size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-none">
                Dostosuj kadr i pozycję zdjęcia
              </h3>
              <p className="text-[11px] text-dark-400 mt-0.5">
                Przeciągnij zdjęcie myszką lub palcem i ustaw powiększenie
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-dark-400 hover:text-white rounded-lg hover:bg-dark-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Główny obszar edycji kadrowania */}
        <div className="p-4 sm:p-6 flex flex-col items-center overflow-y-auto scrollbar-thin space-y-5">
          {/* Obszar roboczy z okręgiem kadrowania */}
          <div className="relative flex items-center justify-center">
            {/* Viewport z maską */}
            <div
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onWheel={handleWheel}
              className={`relative overflow-hidden rounded-full cursor-grab active:cursor-grabbing border-4 border-brand-500 shadow-2xl ring-4 ring-black/40 ${
                isDragging ? 'cursor-grabbing' : ''
              }`}
              style={{
                width: `${VIEWPORT_SIZE}px`,
                height: `${VIEWPORT_SIZE}px`,
                backgroundColor: '#111214'
              }}
            >
              {/* Warstwa obrazu */}
              <div
                className="absolute origin-center transition-transform duration-75 ease-out pointer-events-none"
                style={{
                  top: '50%',
                  left: '50%',
                  width: `${previewW}px`,
                  height: `${previewH}px`,
                  transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`
                }}
              >
                <img
                  src={imageSrc}
                  alt="Avatar preview"
                  className="w-full h-full object-fill pointer-events-none select-none max-w-none"
                  draggable={false}
                />
              </div>

              {/* Siatka pomocnicza i celownik kadrowania */}
              <div className="absolute inset-0 pointer-events-none border border-white/20 rounded-full flex items-center justify-center">
                <div className="w-full h-[1px] bg-white/15" />
                <div className="h-full w-[1px] bg-white/15 absolute" />
                <div className="w-2.5 h-2.5 rounded-full border border-white/40 absolute" />
              </div>
            </div>

            {/* Przyciski szybkiego przesuwania (Krzyżak) z boku */}
            <div className="hidden sm:flex flex-col items-center ml-4 space-y-1 bg-dark-900/80 p-2 rounded-xl border border-dark-700">
              <button
                type="button"
                onClick={() => nudge(0, -15)}
                className="p-1.5 text-dark-300 hover:text-white hover:bg-dark-750 rounded-lg transition-colors"
                title="Przesuń w górę"
              >
                <ArrowUp size={16} />
              </button>
              <div className="flex space-x-1">
                <button
                  type="button"
                  onClick={() => nudge(-15, 0)}
                  className="p-1.5 text-dark-300 hover:text-white hover:bg-dark-750 rounded-lg transition-colors"
                  title="Przesuń w lewo"
                >
                  <ArrowLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="p-1.5 text-brand-400 hover:text-white hover:bg-brand-500 rounded-lg transition-colors"
                  title="Wyśrodkuj i resetuj"
                >
                  <RefreshCw size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => nudge(15, 0)}
                  className="p-1.5 text-dark-300 hover:text-white hover:bg-dark-750 rounded-lg transition-colors"
                  title="Przesuń w prawo"
                >
                  <ArrowRight size={16} />
                </button>
              </div>
              <button
                type="button"
                onClick={() => nudge(0, 15)}
                className="p-1.5 text-dark-300 hover:text-white hover:bg-dark-750 rounded-lg transition-colors"
                title="Przesuń w dół"
              >
                <ArrowDown size={16} />
              </button>
            </div>
          </div>

          {/* Kontrolki powiększenia (Zoom Slider) */}
          <div className="w-full max-w-xs space-y-2 bg-dark-900/60 p-3 rounded-xl border border-dark-700/60">
            <div className="flex items-center justify-between text-xs font-semibold text-dark-300">
              <span className="flex items-center space-x-1.5">
                <ZoomIn size={14} className="text-brand-400" />
                <span>Powiększenie (Skala)</span>
              </span>
              <span className="text-white font-mono text-[11px] bg-dark-800 px-2 py-0.5 rounded border border-dark-700">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setZoom(prev => Math.max(0.7, +(prev - 0.15).toFixed(2)))}
                className="p-1 text-dark-400 hover:text-white hover:bg-dark-750 rounded"
                title="Oddal"
              >
                <ZoomOut size={16} />
              </button>

              <input
                type="range"
                min="0.7"
                max="3.5"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-brand-500 h-1.5 bg-dark-700 rounded-lg cursor-pointer"
              />

              <button
                type="button"
                onClick={() => setZoom(prev => Math.min(3.5, +(prev + 0.15).toFixed(2)))}
                className="p-1 text-dark-400 hover:text-white hover:bg-dark-750 rounded"
                title="Przybliż"
              >
                <ZoomIn size={16} />
              </button>

              <button
                type="button"
                onClick={() => setRotation(prev => (prev + 90) % 360)}
                className="p-1.5 text-dark-400 hover:text-brand-400 hover:bg-dark-750 rounded transition-colors ml-1"
                title="Obróć o 90°"
              >
                <RotateCw size={15} />
              </button>
            </div>
          </div>

          {/* Podgląd na żywo w małych rozmiarach */}
          <div className="w-full flex items-center justify-around bg-dark-900/40 p-2.5 rounded-xl border border-dark-750">
            <div className="text-[11px] font-bold text-dark-400 uppercase tracking-wider flex items-center space-x-1">
              <Eye size={13} className="text-brand-400" />
              <span>Podgląd:</span>
            </div>

            {/* Podgląd duży (Profil) */}
            <div className="flex flex-col items-center">
              <div
                className="rounded-full overflow-hidden border-2 border-brand-500 shadow-md relative"
                style={{ width: '48px', height: '48px', backgroundColor: '#111214' }}
              >
                <div
                  className="absolute origin-center"
                  style={{
                    top: '50%',
                    left: '50%',
                    width: `${previewW * (48 / VIEWPORT_SIZE)}px`,
                    height: `${previewH * (48 / VIEWPORT_SIZE)}px`,
                    transform: `translate(-50%, -50%) translate(${position.x * (48 / VIEWPORT_SIZE)}px, ${position.y * (48 / VIEWPORT_SIZE)}px) scale(${zoom}) rotate(${rotation}deg)`
                  }}
                >
                  <img src={imageSrc} alt="" className="w-full h-full object-fill pointer-events-none max-w-none" />
                </div>
              </div>
              <span className="text-[9px] text-dark-400 mt-1">Profil</span>
            </div>

            {/* Podgląd średni (Kanał głosowy) */}
            <div className="flex flex-col items-center">
              <div
                className="rounded-full overflow-hidden border-2 border-emerald-500 shadow-md relative"
                style={{ width: '36px', height: '36px', backgroundColor: '#111214' }}
              >
                <div
                  className="absolute origin-center"
                  style={{
                    top: '50%',
                    left: '50%',
                    width: `${previewW * (36 / VIEWPORT_SIZE)}px`,
                    height: `${previewH * (36 / VIEWPORT_SIZE)}px`,
                    transform: `translate(-50%, -50%) translate(${position.x * (36 / VIEWPORT_SIZE)}px, ${position.y * (36 / VIEWPORT_SIZE)}px) scale(${zoom}) rotate(${rotation}deg)`
                  }}
                >
                  <img src={imageSrc} alt="" className="w-full h-full object-fill pointer-events-none max-w-none" />
                </div>
              </div>
              <span className="text-[9px] text-dark-400 mt-1">Głos</span>
            </div>

            {/* Podgląd mały (Czat) */}
            <div className="flex flex-col items-center">
              <div
                className="rounded-full overflow-hidden border border-dark-500 shadow-md relative"
                style={{ width: '26px', height: '26px', backgroundColor: '#111214' }}
              >
                <div
                  className="absolute origin-center"
                  style={{
                    top: '50%',
                    left: '50%',
                    width: `${previewW * (26 / VIEWPORT_SIZE)}px`,
                    height: `${previewH * (26 / VIEWPORT_SIZE)}px`,
                    transform: `translate(-50%, -50%) translate(${position.x * (26 / VIEWPORT_SIZE)}px, ${position.y * (26 / VIEWPORT_SIZE)}px) scale(${zoom}) rotate(${rotation}deg)`
                  }}
                >
                  <img src={imageSrc} alt="" className="w-full h-full object-fill pointer-events-none max-w-none" />
                </div>
              </div>
              <span className="text-[9px] text-dark-400 mt-1">Czat</span>
            </div>
          </div>
        </div>

        {/* Pasek przycisków akcji na dole */}
        <div className="px-5 py-3.5 border-t border-dark-750 bg-dark-900/80 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-dark-300 hover:text-white hover:bg-dark-750 rounded-xl transition-colors cursor-pointer"
          >
            Anuluj
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-2 text-xs font-semibold text-dark-400 hover:text-white hover:bg-dark-750 rounded-xl transition-colors flex items-center space-x-1 cursor-pointer"
            >
              <RefreshCw size={13} />
              <span className="hidden sm:inline">Resetuj kadr</span>
            </button>

            <button
              type="button"
              onClick={handleConfirmCrop}
              className="px-5 py-2 bg-gradient-to-r from-brand-500 to-indigo-600 hover:from-brand-600 hover:to-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-brand-500/25 flex items-center space-x-1.5 cursor-pointer"
            >
              <Check size={16} />
              <span>Zastosuj i zapisz kadr</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
