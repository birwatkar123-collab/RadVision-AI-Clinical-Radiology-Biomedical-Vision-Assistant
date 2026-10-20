import React, { useState } from 'react';
import {
  Sparkles,
  Layers,
  Image as ImageIcon,
  RectangleHorizontal,
  Sliders,
  Send,
  Loader2,
  Check,
  Download,
  Info,
  Maximize2,
  BookOpen,
} from 'lucide-react';
import { soundFx } from '../utils/audioSynth';

interface AtlasReferenceLabProps {
  onLoadIntoWorkstation: (imageUrl: string, promptText: string) => void;
}

const ASPECT_RATIOS = [
  { label: '1:1', ratio: '1:1', description: 'Square (Standard)' },
  { label: '2:3', ratio: '2:3', description: 'Portrait (Spine/Bones)' },
  { label: '3:2', ratio: '3:2', description: 'Landscape (Panoramic)' },
  { label: '3:4', ratio: '3:4', description: 'Tall Thoracic' },
  { label: '4:3', ratio: '4:3', description: 'Standard PACS Display' },
  { label: '9:16', ratio: '9:16', description: 'Full Vertical' },
  { label: '16:9', ratio: '16:9', description: 'Wide Widescreen' },
  { label: '21:9', ratio: '21:9', description: 'Ultra-wide Multi-Slice' },
];

const RESOLUTIONS = [
  { label: '1K', size: '1K', desc: 'Standard 1024px' },
  { label: '2K', size: '2K', desc: 'High-Res 2048px' },
  { label: '4K', size: '4K', desc: 'Ultra-HD 4096px' },
];

const MODALITY_TYPES = [
  'Radiography (Chest X-Ray)',
  'Brain MRI T2 / FLAIR',
  'Abdominal Contrast CT',
  'Histopathology (H&E Stain)',
  'Dermoscopy Epiluminescence',
  'Ultrasound B-Mode Echocardiogram',
];

const QUICK_PRESETS = [
  {
    title: 'Normal PA Chest X-Ray Anatomy',
    modality: 'Radiography (Chest X-Ray)',
    prompt: 'Normal erect PA chest radiograph demonstrating sharp bilateral costophrenic angles, normal cardiothoracic ratio < 0.5, clear pulmonary vascular arborization, and intact thoracic cage.',
  },
  {
    title: 'Brain Ventricles & Basal Ganglia',
    modality: 'Brain MRI T2 / FLAIR',
    prompt: 'Axial T2 brain magnetic resonance image showing symmetric frontal horns of lateral ventricles, caudate head, putamen, and internal capsule with high tissue contrast.',
  },
  {
    title: 'Histology: Renal Glomerulus',
    modality: 'Histopathology (H&E Stain)',
    prompt: 'High power 40x hematoxylin and eosin (H&E) histology slide showing a normal renal glomerulus with intact Bowman capsule, capillary loops, and proximal convoluted tubules.',
  },
  {
    title: 'Dermoscopy: Pigment Network Reference',
    modality: 'Dermoscopy Epiluminescence',
    prompt: 'Dermoscopic magnified view of regular, delicate, reticular pigment network fading gradually at the periphery, typical of benign melanocytic compound nevus.',
  },
];

export const AtlasReferenceLab: React.FC<AtlasReferenceLabProps> = ({ onLoadIntoWorkstation }) => {
  const [prompt, setPrompt] = useState<string>(QUICK_PRESETS[0].prompt);
  const [selectedModality, setSelectedModality] = useState<string>(QUICK_PRESETS[0].modality);
  const [aspectRatio, setAspectRatio] = useState<string>('1:1');
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('2K');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [generationMeta, setGenerationMeta] = useState<{ ratio: string; size: string; model: string } | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setErrorMsg(null);
    soundFx.playScanPing();

    try {
      const response = await fetch('/api/generate-reference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          aspectRatio,
          imageSize,
          modalityType: selectedModality,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate reference image');
      }

      setGeneratedImage(data.imageUrl);
      setGenerationMeta({
        ratio: data.aspectRatio,
        size: data.imageSize,
        model: data.modelUsed,
      });
      soundFx.playSuccessChime();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Generation failed. Please try again.');
      soundFx.playBuzzer();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendToWorkstation = () => {
    if (!generatedImage) return;
    soundFx.playScanPing();
    onLoadIntoWorkstation(generatedImage, `Synthetic Educational Reference: ${prompt}`);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-6 max-w-5xl mx-auto shadow-2xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Biomedical Imaging Atlas & Reference Generator</span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">
            Synthetic Anatomical & Teaching Reference Lab
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Generate high-fidelity radiological references with aspect ratio and 1K / 2K / 4K resolution controls.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-slate-950 text-cyan-300 border border-cyan-800/80">
            Model: gemini-3-pro-image-preview / nano-banana-2.1
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Config Panel (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Quick Presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span>Teaching & Educational Presets:</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setPrompt(p.prompt);
                    setSelectedModality(p.modality);
                    soundFx.playClick();
                  }}
                  className="p-2.5 text-left rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs transition-colors"
                >
                  <strong className="block text-slate-200 font-medium truncate">{p.title}</strong>
                  <span className="text-[10px] text-cyan-400 block mt-0.5">{p.modality}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Modality Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Target Modality:
            </label>
            <select
              value={selectedModality}
              onChange={(e) => setSelectedModality(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              {MODALITY_TYPES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Prompt Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Anatomical Specification / Prompt:
            </label>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe anatomical structures, contrast phase, projection, or pathological comparison..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 leading-relaxed font-sans"
            />
          </div>

          {/* Aspect Ratio Selector (Mandatory Affordance) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>Aspect Ratio (8 Formats):</span>
              </label>
              <span className="text-[11px] font-mono text-cyan-400 font-semibold">{aspectRatio}</span>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
              {ASPECT_RATIOS.map((r) => (
                <button
                  key={r.ratio}
                  onClick={() => {
                    setAspectRatio(r.ratio);
                    soundFx.playClick();
                  }}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-mono transition-all ${
                    aspectRatio === r.ratio
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 font-bold shadow-lg shadow-cyan-950'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                  title={r.description}
                >
                  <span className="text-xs">{r.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Image Size / Resolution (Mandatory Affordance: 1K, 2K, 4K) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Image Resolution (1K, 2K, 4K):</span>
              </label>
              <span className="text-[11px] font-mono text-cyan-400 font-semibold">{imageSize}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {RESOLUTIONS.map((res) => (
                <button
                  key={res.size}
                  onClick={() => {
                    setImageSize(res.size as any);
                    soundFx.playClick();
                  }}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    imageSize === res.size
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 font-bold shadow-md shadow-cyan-950'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <div className="text-sm font-bold font-mono">{res.label}</div>
                  <div className="text-[10px] text-slate-400 font-normal">{res.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-900/30 transition-all disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Synthesizing Biomedical Reference ({imageSize} / {aspectRatio})...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate High-Quality Medical Reference</span>
              </>
            )}
          </button>

          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg text-xs">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Right Preview Panel (5 cols) */}
        <div className="lg:col-span-5 flex flex-col">
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Generated Reference Scan:
          </label>
          <div className="flex-1 min-h-[380px] bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center p-3 relative overflow-hidden">
            {generatedImage ? (
              <div className="relative group w-full h-full flex items-center justify-center">
                <img
                  src={generatedImage}
                  alt="Generated Reference Scan"
                  className="max-h-[360px] max-w-full object-contain rounded-lg shadow-xl"
                />
                {generationMeta && (
                  <div className="absolute top-2 left-2 bg-slate-950/80 px-2 py-1 rounded text-[10px] font-mono text-cyan-400 border border-slate-800 backdrop-blur">
                    {generationMeta.size} · {generationMeta.ratio}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center p-6 text-slate-500">
                <ImageIcon className="w-12 h-12 mx-auto stroke-1 mb-2 text-slate-600" />
                <p className="text-xs">No reference image generated yet.</p>
                <p className="text-[11px] text-slate-600 mt-1">
                  Select an educational preset and click Generate to create a comparative anatomical visual.
                </p>
              </div>
            )}
          </div>

          {/* Load to Workstation CTA */}
          {generatedImage && (
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleSendToWorkstation}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs shadow-lg shadow-emerald-950 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Load Into Primary Workstation for AI Analysis</span>
              </button>
              <a
                href={generatedImage}
                download="radvision-reference-atlas.png"
                className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs"
                title="Download PNG"
              >
                <Download className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
