import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Layers,
  Sparkles,
  Gamepad2,
  Upload,
  FileCheck,
  ShieldCheck,
  Stethoscope,
  Info,
  AlertCircle,
  Loader2,
  ChevronRight,
  BookOpen,
  Volume2,
  HelpCircle,
  FolderOpen,
  Download,
} from 'lucide-react';
import { ClinicalReport, RoiBox, SampleCase } from './types/clinical';
import { SAMPLE_CASES } from './utils/sampleCases';
import { MedicalViewer } from './components/MedicalViewer';
import { StructuredReportView } from './components/StructuredReportView';
import { AtlasReferenceLab } from './components/AtlasReferenceLab';
import { RadQuestGame } from './components/RadQuestGame';
import { soundFx } from './utils/audioSynth';

export default function App() {
  // Navigation Mode
  const [activeTab, setActiveTab] = useState<'workstation' | 'atlas' | 'game'>('workstation');

  // Active Image & Case State
  const [currentImage, setCurrentImage] = useState<string>(() => {
    return typeof window !== 'undefined' && SAMPLE_CASES.length > 0 ? SAMPLE_CASES[0].generateDataUrl() : '';
  });
  const [currentCase, setCurrentCase] = useState<SampleCase | null>(() => SAMPLE_CASES[0] || null);
  const [clinicalContext, setClinicalContext] = useState<string>(() => SAMPLE_CASES[0]?.clinicalHistory || '');
  const [modalityHint, setModalityHint] = useState<string>(
    () => (SAMPLE_CASES[0] ? `${SAMPLE_CASES[0].modality} - ${SAMPLE_CASES[0].projection}` : '')
  );
  const [activeRoi, setActiveRoi] = useState<RoiBox | null>(null);

  // Analysis & Report State
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [report, setReport] = useState<ClinicalReport | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [analysisStep, setAnalysisStep] = useState<string>('');

  // Audio Speech state
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // File Upload input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fallback to ensure first sample case image is initialized on client mount
  useEffect(() => {
    if (!currentImage && SAMPLE_CASES.length > 0) {
      loadCase(SAMPLE_CASES[0]);
    }
  }, []);

  const loadCase = (caseItem: SampleCase) => {
    soundFx.playClick();
    setCurrentCase(caseItem);
    const dataUrl = caseItem.generateDataUrl();
    setCurrentImage(dataUrl);
    setClinicalContext(caseItem.clinicalHistory);
    setModalityHint(`${caseItem.modality} - ${caseItem.projection}`);
    setActiveRoi(null);
    setReport(null);
    setErrorMessage(null);
  };

  const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    soundFx.playClick();
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setCurrentImage(event.target.result);
        setCurrentCase(null);
        setClinicalContext('');
        setModalityHint('Auto-detect from scan');
        setActiveRoi(null);
        setReport(null);
        setErrorMessage(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const runAnalysis = async () => {
    if (!currentImage) return;

    setIsAnalyzing(true);
    setErrorMessage(null);
    soundFx.playScanPing();

    const steps = [
      'Initializing vision model & de-identification tensors...',
      'Assessing modality, projection & exposure parameters...',
      'Evaluating anatomical contours & systematic structures...',
      'Localizing focal anomalies & signal intensities...',
      'Formulating probabilistic differential patterns...',
      'Synthesizing structured 6-section observational report...',
    ];

    let stepIdx = 0;
    setAnalysisStep(steps[0]);
    const stepInterval = setInterval(() => {
      stepIdx = (stepIdx + 1) % steps.length;
      setAnalysisStep(steps[stepIdx]);
    }, 1200);

    try {
      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: currentImage,
          modalityHint,
          clinicalContext,
          roi: activeRoi,
          model: 'gemini-3.8-flash',
        }),
      });

      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Failed to complete biomedical analysis');
      }

      setReport(json.data);
      soundFx.playSuccessChime();
    } catch (err: any) {
      console.error('Analysis error:', err);
      setErrorMessage(err.message || 'Analysis failed. Please check network or image quality.');
      soundFx.playBuzzer();
    } finally {
      clearInterval(stepInterval);
      setIsAnalyzing(false);
      setAnalysisStep('');
    }
  };

  const handleReadAloud = async () => {
    if (!report) return;

    if (isPlayingAudio && audioRef.current) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
      return;
    }

    // Prepare concise clinical dictation script
    const textToRead = `Radiological observation report. 
Modality: ${report.section1_technicalAssessment.modalityAndProjection}. 
Impression: ${report.section4_impressionDifferential.clinicalSynthesis}. 
Primary observations: ${report.section3_keyObservations.feature1.description}. 
Recommended follow up: ${report.section5_clinicalFollowUp.suggestedNextSteps.join('. ')}.`;

    setIsPlayingAudio(true);
    soundFx.playClick();

    try {
      const res = await fetch('/api/generate-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToRead }),
      });

      const data = await res.json();
      if (data.success && data.audioBase64) {
        if (!audioRef.current) {
          audioRef.current = new Audio();
        }
        audioRef.current.src = data.audioBase64;
        audioRef.current.onended = () => setIsPlayingAudio(false);
        audioRef.current.onerror = () => setIsPlayingAudio(false);
        await audioRef.current.play();
      } else {
        // Fallback to Web Speech API
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(textToRead);
          utterance.rate = 1.0;
          utterance.onend = () => setIsPlayingAudio(false);
          utterance.onerror = () => setIsPlayingAudio(false);
          window.speechSynthesis.speak(utterance);
        } else {
          setIsPlayingAudio(false);
        }
      }
    } catch (err) {
      console.warn('TTS error, falling back to Web Speech:', err);
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(textToRead);
        utterance.onend = () => setIsPlayingAudio(false);
        window.speechSynthesis.speak(utterance);
      } else {
        setIsPlayingAudio(false);
      }
    }
  };

  const handleLoadAtlasImage = (imageUrl: string, promptText: string) => {
    setCurrentImage(imageUrl);
    setCurrentCase(null);
    setClinicalContext(promptText);
    setModalityHint('Synthetic Educational Reference');
    setActiveRoi(null);
    setReport(null);
    setActiveTab('workstation');
    soundFx.playSuccessChime();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* TOP CLINICAL NAVIGATION BAR */}
      <header className="sticky top-0 z-30 bg-slate-950/90 border-b border-slate-800/90 backdrop-blur-md px-4 py-2.5 flex items-center justify-between">
        {/* Brand Lockup */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-900/30">
            <Activity className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-white font-mono flex items-center gap-1.5">
                RADVISION <span className="text-cyan-400">AI</span>
              </h1>
              <span className="hidden sm:inline px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800/70">
                CLINICAL VISION ENGINE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Biomedical Observation & Systematic Radiology Assistant
            </p>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => {
              setActiveTab('workstation');
              soundFx.playClick();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'workstation'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Workstation</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('atlas');
              soundFx.playClick();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'atlas'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Generate high-res educational reference images with aspect ratio and 1K-4K resolution controls"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Atlas Reference Lab</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('game');
              soundFx.playScanPing();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'game'
                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-bold shadow-md shadow-cyan-950'
                : 'text-cyan-400 hover:text-cyan-300 font-medium'
            }`}
            title="Launch interactive 60fps radiology training game"
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>RadQuest Game</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Download Repo ZIP button */}
          <a
            href="/api/download-zip"
            download="radvision-ai.zip"
            onClick={() => soundFx.playClick()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-cyan-400 rounded-lg border border-slate-800 text-xs font-mono transition-colors shadow-sm"
            title="Download full project repository as ZIP archive"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Download ZIP</span>
          </a>

          {/* Privacy / Confidentiality Notice */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-amber-950/40 text-amber-300 rounded-lg border border-amber-800/50 text-xs font-mono" title="Review and redact PHI before uploading. Images may be sent to the configured Gemini API.">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>PHI: VERIFY BEFORE UPLOAD · REDACT SENSITIVE MARKERS</span>
          </div>
        </div>
      </header>

      {/* FULL-VIEWPORT GAME SHELL OVERLAY (WHEN GAME ACTIVE) */}
      {activeTab === 'game' && <RadQuestGame onExit={() => setActiveTab('workstation')} />}

      {/* ATLAST REFERENCE GENERATOR VIEW */}
      {activeTab === 'atlas' && (
        <main className="flex-1 p-4 lg:p-6 max-w-7xl mx-auto w-full">
          <AtlasReferenceLab onLoadIntoWorkstation={handleLoadAtlasImage} />
        </main>
      )}

      {/* PRIMARY CLINICAL WORKSTATION VIEW */}
      {activeTab === 'workstation' && (
        <main className="flex-1 flex flex-col p-3 lg:p-4 gap-4 max-w-[1720px] mx-auto w-full">
          {/* SAMPLE CASES PRELOAD BAR & UPLOAD ACTION */}
          <section className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
              <span className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
                <FolderOpen className="w-3.5 h-3.5 text-cyan-400" /> Cases:
              </span>
              {SAMPLE_CASES.map((sc) => (
                <button
                  key={sc.id}
                  onClick={() => loadCase(sc)}
                  className={`px-2.5 py-1 rounded-lg text-xs whitespace-nowrap transition-all font-medium ${
                    currentCase?.id === sc.id
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/80 shadow-md shadow-cyan-950'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800 hover:bg-slate-800'
                  }`}
                  title={`${sc.modality} - ${sc.clinicalHistory}`}
                >
                  {sc.title.split(':')[1] || sc.title}
                </button>
              ))}
            </div>

            {/* Custom Upload Button */}
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleCustomUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors shadow-sm"
              >
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                <span>Upload Scan / DICOM Preview</span>
              </button>
            </div>
          </section>

          {/* TWO-PANEL WORKSTATION SPLIT (VIEWER vs REPORT) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
            {/* LEFT: MEDICAL VIEWER & CONTEXT PANEL (7 cols) */}
            <div className="lg:col-span-7 flex flex-col space-y-3">
              {/* PACS DICOM Viewer Component */}
              <MedicalViewer
                imageUrl={currentImage}
                detectedBox={report?.section3_keyObservations?.feature1?.normalizedBoundingBox}
                featureName={report?.section3_keyObservations?.feature1?.name}
                onRoiChange={(roi) => setActiveRoi(roi)}
                onImageDeidentified={(newUrl) => setCurrentImage(newUrl)}
              />

              {/* Case Context & Clinical Inputs Bar */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Modality / Projection Hint:
                    </label>
                    <input
                      type="text"
                      value={modalityHint}
                      onChange={(e) => setModalityHint(e.target.value)}
                      placeholder="e.g., Chest X-Ray PA Erect, Brain T2 Axial, Dermoscopy"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Target Region of Interest (ROI):
                    </label>
                    <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-400">
                      <span>
                        {activeRoi
                          ? `[${activeRoi.ymin}, ${activeRoi.xmin}, ${activeRoi.ymax}, ${activeRoi.xmax}]`
                          : 'Full Image Field'}
                      </span>
                      {activeRoi && (
                        <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                          Targeted
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Patient Clinical Context & Indication for Exam:
                  </label>
                  <textarea
                    rows={2}
                    value={clinicalContext}
                    onChange={(e) => setClinicalContext(e.target.value)}
                    placeholder="Provide relevant clinical history, presenting symptoms, prior interventions, or laboratory markers..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 leading-relaxed font-sans"
                  />
                </div>

                {/* Primary Action Button */}
                <button
                  onClick={runAnalysis}
                  disabled={isAnalyzing || !currentImage}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm tracking-wide shadow-lg shadow-cyan-950 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span className="font-mono text-xs">{analysisStep || 'Analyzing visual scan...'}</span>
                    </>
                  ) : (
                    <>
                      <Stethoscope className="w-4 h-4 stroke-[2.5]" />
                      <span>EVALUATE MEDICAL SCAN & GENERATE 6-SECTION REPORT</span>
                    </>
                  )}
                </button>

                {errorMessage && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: STRUCTURED REPORT VIEWER (5 cols) */}
            <div className="lg:col-span-5 flex flex-col min-h-[620px]">
              {report ? (
                <StructuredReportView
                  report={report}
                  onReadAloud={handleReadAloud}
                  isPlayingAudio={isPlayingAudio}
                />
              ) : (
                <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-cyan-400 shadow-inner">
                    <FileCheck className="w-8 h-8" />
                  </div>
                  <div className="max-w-sm space-y-1">
                    <h3 className="text-base font-semibold text-slate-100">
                      Awaiting Visual Analysis
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Select a pre-loaded clinical case or upload an imaging scan. Click{' '}
                      <strong className="text-cyan-400 font-semibold">Evaluate Medical Scan</strong> to generate
                      the standardized 6-section observational report.
                    </p>
                  </div>

                  <div className="w-full max-w-xs p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 text-left space-y-1.5 font-mono">
                    <div className="text-cyan-400 font-bold uppercase tracking-wider text-[10px]">
                      Mandatory Reporting Sections:
                    </div>
                    <div>1. Technical & Modality Assessment</div>
                    <div>2. Systematic Anatomical Findings</div>
                    <div>3. Key Observations & Anomalies</div>
                    <div>4. Impression & Differentials</div>
                    <div>5. Recommended Follow-up</div>
                    <div>6. Mandatory Safety Disclaimer</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      )}

      {/* FOOTER BAR */}
      <footer className="mt-auto px-4 py-3 bg-slate-950 border-t border-slate-900 text-slate-500 text-[11px] flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span>RadVision AI Clinical Research Workstation</span>
          <span>·</span>
          <span>Educational & Observational Assistant</span>
          <span>·</span>
          <span className="text-cyan-500">Multimodal Gemini 3.8</span>
        </div>
        <div>
          <span>Strict Hedged Language & Operational Safety Protocol Enforced</span>
        </div>
      </footer>
    </div>
  );
}
