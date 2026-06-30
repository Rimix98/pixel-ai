"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import {
  MousePointer2,
  Square,
  Circle,
  Type,
  Minus,
  Pencil,
  Eraser,
  Image as ImageIcon,
  Undo2,
  Redo2,
  Download,
  Trash2,
  Palette,
  Send,
  Sparkles,
} from "lucide-react";

type Tool = "select" | "rect" | "circle" | "line" | "text" | "pencil" | "eraser" | "image";

interface DesignElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  x2?: number;
  y2?: number;
  text?: string;
  points?: { x: number; y: number }[];
  fill: string;
  stroke: string;
  strokeWidth: number;
  fontSize?: number;
  src?: string;
  imageEl?: HTMLImageElement;
}

export default function DesignPage() {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [tool, setTool] = useState<Tool>("select");
  const [fill, setFill] = useState("#c47a5a");
  const [stroke, setStroke] = useState("#1a1a2e");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [elements, setElements] = useState<DesignElement[]>([]);
  const [undone, setUndone] = useState<DesignElement[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [start, setStart] = useState({ x: 0, y: 0 });
  const [current, setCurrent] = useState({ x: 0, y: 0 });
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState<"fill" | "stroke" | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [imagePrompt, setImagePrompt] = useState("");
  const [generatingImage, setGeneratingImage] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imagePlacePos, setImagePlacePos] = useState({ x: 100, y: 100 });

  const tier = user?.subscription_tier || "free";
  const hasAccess = tier === "pro" || tier === "max";

  const COLORS = [
    "#ffffff", "#000000", "#c47a5a", "#1a1a2e", "#ef4444", "#f97316",
    "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280",
    "#fef3c7", "#dbeafe", "#dcfce7", "#fce7f3", "#e0e7ff", "#f3e8ff",
  ];

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const drawElement = (el: DesignElement) => {
      ctx.fillStyle = el.fill;
      ctx.strokeStyle = el.stroke;
      ctx.lineWidth = el.strokeWidth;

      switch (el.type) {
        case "rect":
          ctx.beginPath();
          ctx.rect(el.x, el.y, el.width || 0, el.height || 0);
          if (el.fill !== "transparent") ctx.fill();
          ctx.stroke();
          break;
        case "circle":
          ctx.beginPath();
          const rx = (el.width || 0) / 2;
          const ry = (el.height || 0) / 2;
          ctx.ellipse(el.x + rx, el.y + ry, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2);
          if (el.fill !== "transparent") ctx.fill();
          ctx.stroke();
          break;
        case "line":
          ctx.beginPath();
          ctx.moveTo(el.x, el.y);
          ctx.lineTo(el.x2 || el.x, el.y2 || el.y);
          ctx.stroke();
          break;
        case "text":
          ctx.font = `${el.fontSize || 16}px sans-serif`;
          ctx.fillStyle = el.fill;
          ctx.fillText(el.text || "", el.x, el.y);
          break;
        case "pencil":
          if (el.points && el.points.length > 1) {
            ctx.beginPath();
            ctx.moveTo(el.points[0].x, el.points[0].y);
            for (let i = 1; i < el.points.length; i++) {
              ctx.lineTo(el.points[i].x, el.points[i].y);
            }
            ctx.stroke();
          }
          break;
        case "eraser":
          if (el.points && el.points.length > 1) {
            ctx.save();
            ctx.globalCompositeOperation = "destination-out";
            ctx.beginPath();
            ctx.moveTo(el.points[0].x, el.points[0].y);
            for (let i = 1; i < el.points.length; i++) {
              ctx.lineTo(el.points[i].x, el.points[i].y);
            }
            ctx.lineWidth = 20;
            ctx.stroke();
            ctx.restore();
          }
          break;
        case "image":
          if (el.imageEl) {
            ctx.drawImage(el.imageEl, el.x, el.y, el.width || 200, el.height || 200);
          } else if (el.src) {
            const img = new Image();
            img.src = el.src;
            img.onload = () => {
              el.imageEl = img;
              drawCanvas();
            };
          }
          break;
      }
    };

    elements.forEach(drawElement);

    if (drawing) {
      const temp: DesignElement = {
        id: "temp",
        type: tool === "pencil" || tool === "eraser" ? tool : tool,
        x: Math.min(start.x, current.x),
        y: Math.min(start.y, current.y),
        width: Math.abs(current.x - start.x),
        height: Math.abs(current.y - start.y),
        x2: current.x,
        y2: current.y,
        fill: tool === "eraser" ? "transparent" : fill,
        stroke,
        strokeWidth,
        points: tool === "pencil" || tool === "eraser" ? [{ x: start.x, y: start.y }, { x: current.x, y: current.y }] : undefined,
      };
      drawElement(temp);
    }
  }, [elements, drawing, start, current, tool, fill, stroke, strokeWidth]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  useEffect(() => {
    const handleResize = () => drawCanvas();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [drawCanvas]);

  const getPos = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getPos(e);

    if (tool === "image") {
      setImagePlacePos(pos);
      setShowImageModal(true);
      return;
    }

    setStart(pos);
    setCurrent(pos);
    setDrawing(true);

    if (tool === "pencil" || tool === "eraser") {
      const el: DesignElement = {
        id: crypto.randomUUID(),
        type: tool,
        x: pos.x,
        y: pos.y,
        fill: "transparent",
        stroke: tool === "eraser" ? "transparent" : stroke,
        strokeWidth: tool === "eraser" ? 20 : strokeWidth,
        points: [pos],
      };
      setElements((prev) => [...prev, el]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drawing) return;
    const pos = getPos(e);
    setCurrent(pos);

    if (tool === "pencil" || tool === "eraser") {
      setElements((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && (last.type === "pencil" || last.type === "eraser")) {
          last.points = [...(last.points || []), pos];
        }
        return updated;
      });
    }
  };

  const handleMouseUp = () => {
    if (!drawing) return;
    setDrawing(false);

    if (tool !== "pencil" && tool !== "eraser") {
      const el: DesignElement = {
        id: crypto.randomUUID(),
        type: tool,
        x: Math.min(start.x, current.x),
        y: Math.min(start.y, current.y),
        width: Math.abs(current.x - start.x),
        height: Math.abs(current.y - start.y),
        x2: current.x,
        y2: current.y,
        fill: tool === "line" ? "transparent" : fill,
        stroke,
        strokeWidth,
        text: tool === "text" ? "Текст" : undefined,
        fontSize: tool === "text" ? 24 : undefined,
      };
      setElements((prev) => [...prev, el]);
      setUndone([]);
    } else {
      setUndone([]);
    }
  };

  const undo = () => {
    if (elements.length === 0) return;
    const last = elements[elements.length - 1];
    setElements((prev) => prev.slice(0, -1));
    setUndone((prev) => [...prev, last]);
  };

  const redo = () => {
    if (undone.length === 0) return;
    const last = undone[undone.length - 1];
    setUndone((prev) => prev.slice(0, -1));
    setElements((prev) => [...prev, last]);
  };

  const clearCanvas = () => {
    setElements([]);
    setUndone([]);
  };

  const exportCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "pixel-design.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const generateImage = async () => {
    if (!imagePrompt.trim()) return;
    setGeneratingImage(true);

    try {
      const res = await fetch(`/api/design/generate-image?prompt=${encodeURIComponent(imagePrompt)}&width=512&height=512`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          const el: DesignElement = {
            id: crypto.randomUUID(),
            type: "image",
            x: imagePlacePos.x,
            y: imagePlacePos.y,
            width: 300,
            height: 300,
            src: url,
            imageEl: img,
            fill: "transparent",
            stroke: "transparent",
            strokeWidth: 0,
          };
          setElements((prev) => [...prev, el]);
          setUndone([]);
          setShowImageModal(false);
          setImagePrompt("");
          setGeneratingImage(false);
        };
        img.src = url;
        return;
      }
    } catch {}

    setGeneratingImage(false);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: `Создай HTML/CSS код для дизайн-макета по описанию: ${prompt}. Верни только HTML код без объяснений. Используй современный дизайн, скруглённые углы, тени.` }],
          conversationId: crypto.randomUUID(),
        }),
      });

      if (res.ok) {
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let content = "";

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            for (const line of chunk.split("\n")) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6).trim();
                if (data === "[DONE]") break;
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.content) content += parsed.content;
                } catch {}
              }
            }
          }
        }

        if (content) {
          const cleanHtml = content.replace(/```html\n?/g, "").replace(/```\n?/g, "").trim();
          const lines = cleanHtml.split("\n");
          const newElements: DesignElement[] = [];
          let yOffset = 40;

          lines.forEach((line) => {
            const trimmed = line.trim();
            if (!trimmed) { yOffset += 10; return; }
            if (trimmed.startsWith("<h") || trimmed.startsWith("<div") || trimmed.startsWith("<p") || trimmed.startsWith("<span") || trimmed.startsWith("<button")) {
              const text = trimmed.replace(/<[^>]+>/g, "").trim();
              if (text) {
                const isHeading = trimmed.startsWith("<h");
                newElements.push({
                  id: crypto.randomUUID(),
                  type: "text",
                  x: 40,
                  y: yOffset,
                  text,
                  fill: "#1a1a2e",
                  stroke: "transparent",
                  strokeWidth: 0,
                  fontSize: isHeading ? 28 : 16,
                });
                yOffset += isHeading ? 40 : 28;
              }
            }
          });

          if (newElements.length > 0) {
            setElements((prev) => [...prev, ...newElements]);
          }
        }
      }
    } catch {}

    setGenerating(false);
    setPrompt("");
  };

  if (!hasAccess) {
    return (
      <div className="flex flex-col h-full bg-[var(--bg-main)]">
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <div className="w-20 h-20 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] flex items-center justify-center mb-6">
            <Sparkles size={40} className="text-[var(--accent)]" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-3">
            Pixel Design
          </h1>
          <p className="text-sm text-[var(--text-secondary)] max-w-md mb-6">
            Создавайте интерактивные прототипы, вайрфреймы и макеты с помощью AI.
            Доступно для тарифов Pro и Max.
          </p>
          <Link
            href="/pricing"
            className="px-5 py-2.5 rounded-xl bg-[var(--accent)] text-[var(--text-on-primary)] text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors"
          >
            Обновить тариф
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--bg-surface)]">
        <div className="flex items-center gap-1">
          {[
            { icon: MousePointer2, id: "select" as Tool },
            { icon: Square, id: "rect" as Tool },
            { icon: Circle, id: "circle" as Tool },
            { icon: Minus, id: "line" as Tool },
            { icon: Type, id: "text" as Tool },
            { icon: Pencil, id: "pencil" as Tool },
            { icon: Eraser, id: "eraser" as Tool },
            { icon: ImageIcon, id: "image" as Tool },
          ].map(({ icon: Icon, id: t }) => (
            <button
              key={t}
              onClick={() => setTool(t)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                tool === t ? "bg-[var(--accent)]/15 text-[var(--accent)]" : "text-[var(--text-secondary)] hover:bg-[var(--border)]"
              }`}
              title={t}
            >
              <Icon size={16} />
            </button>
          ))}

          <div className="w-px h-6 bg-[var(--border)] mx-1" />

          <div className="relative">
            <button
              onClick={() => setShowColorPicker(showColorPicker === "fill" ? null : "fill")}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--border)] transition-colors cursor-pointer"
              title="Заливка"
            >
              <div className="w-5 h-5 rounded border border-[var(--border)]" style={{ backgroundColor: fill }} />
            </button>
            {showColorPicker === "fill" && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowColorPicker(null)} />
                <div className="absolute top-full left-0 mt-1 p-3 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl shadow-lg z-50">
                  <div className="grid grid-cols-6 gap-1.5">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => { setFill(c); setShowColorPicker(null); }}
                        className="w-7 h-7 rounded-lg border border-[var(--border)] hover:scale-110 transition-transform cursor-pointer"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <label className="flex items-center gap-2 mt-2 text-xs text-[var(--text-muted)]">
                    <input type="color" value={fill} onChange={(e) => setFill(e.target.value)} className="w-5 h-5 cursor-pointer" />
                    Свой цвет
                  </label>
                </div>
              </>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setShowColorPicker(showColorPicker === "stroke" ? null : "stroke")}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--border)] transition-colors cursor-pointer"
              title="Обводка"
            >
              <div className="w-5 h-5 rounded border-2" style={{ borderColor: stroke, backgroundColor: "transparent" }} />
            </button>
            {showColorPicker === "stroke" && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowColorPicker(null)} />
                <div className="absolute top-full left-0 mt-1 p-3 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl shadow-lg z-50">
                  <div className="grid grid-cols-6 gap-1.5">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => { setStroke(c); setShowColorPicker(null); }}
                        className="w-7 h-7 rounded-lg border border-[var(--border)] hover:scale-110 transition-transform cursor-pointer"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <label className="flex items-center gap-2 mt-2 text-xs text-[var(--text-muted)]">
                    <input type="color" value={stroke} onChange={(e) => setStroke(e.target.value)} className="w-5 h-5 cursor-pointer" />
                    Свой цвет
                  </label>
                </div>
              </>
            )}
          </div>

          <input
            type="range"
            min={1}
            max={10}
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            className="w-16 h-1 accent-[var(--accent)]"
            title={`Толщина: ${strokeWidth}px`}
          />
        </div>

        <div className="flex items-center gap-1">
          <button onClick={undo} disabled={elements.length === 0} className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--border)] transition-colors cursor-pointer disabled:opacity-30" title="Отменить">
            <Undo2 size={16} />
          </button>
          <button onClick={redo} disabled={undone.length === 0} className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--border)] transition-colors cursor-pointer disabled:opacity-30" title="Повторить">
            <Redo2 size={16} />
          </button>
          <button onClick={clearCanvas} className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--border)] transition-colors cursor-pointer" title="Очистить">
            <Trash2 size={16} />
          </button>
          <button onClick={exportCanvas} className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--border)] transition-colors cursor-pointer" title="Экспорт PNG">
            <Download size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden" ref={containerRef}>
        <canvas
          ref={canvasRef}
          className="absolute inset-0 cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>

      <div className="px-4 py-3 border-t border-[var(--bg-surface)]">
        <div className="flex items-center gap-2 max-w-3xl mx-auto">
          <Sparkles size={16} className="text-[var(--accent)] flex-shrink-0" />
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
            placeholder="Опишите что хотите создать..."
            className="flex-1 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent)] transition-colors"
            disabled={generating}
          />
          <button
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--text-on-primary)] hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 cursor-pointer"
          >
            {generating ? (
              <div className="w-4 h-4 border-2 border-[var(--text-on-primary)] border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
      </div>

      {showImageModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => { setShowImageModal(false); setImagePrompt(""); }} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4" onClick={(e) => e.stopPropagation()}>
            <div className="w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl shadow-2xl p-6">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Генерация изображения</h3>
              <p className="text-sm text-[var(--text-secondary)] mb-4">Опишите изображение для генерации через AI</p>

              <input
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); generateImage(); } }}
                placeholder="Например: космический закат с горами"
                autoFocus
                disabled={generatingImage}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent)] transition-colors mb-4"
              />

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setShowImageModal(false); setImagePrompt(""); }}
                  className="px-4 py-2.5 rounded-xl text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  onClick={generateImage}
                  disabled={!imagePrompt.trim() || generatingImage}
                  className="px-5 py-2.5 rounded-xl bg-[var(--accent)] text-[var(--text-on-primary)] text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {generatingImage ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[var(--text-on-primary)] border-t-transparent rounded-full animate-spin" />
                      Генерация...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      Генерировать
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs text-[var(--text-muted)] mt-3">
                Powered by Pollinations.ai (Flux модель)
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
