import React, { useState } from 'react';
import {
  FileText,
  Volume2,
  Copy,
  Check,
  Printer,
  AlertTriangle,
  Activity,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Download,
  Info,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  Code2,
} from 'lucide-react';
import { ClinicalReport } from '../types/clinical';
import { soundFx } from '../utils/audioSynth';

interface StructuredReportViewProps {
  report: ClinicalReport;
  onReadAloud?: () => void;
  isPlayingAudio?: boolean;
}

export const StructuredReportView: React.FC<StructuredReportViewProps> = ({
  report,
  onReadAloud,
  isPlayingAudio = false,
}) => {
  const [activeTab, setActiveTab] = useState<'interactive' | 'verbatim' | 'fhir'>('interactive');
  const [copied, setCopied] = useState<boolean>(false);

  const copyToClipboard = () => {
    soundFx.playClick();
    const textToCopy =
      activeTab === 'fhir'
        ? JSON.stringify(report, null, 2)
        : report.formattedMarkdownReport;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const printReport = () => {
    soundFx.playClick();
    window.print();
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'abnormal':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'indeterminate':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'normal':
      case 'unremarkable':
      default:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
  };

  const getLikelihoodBadge = (likelihood: string) => {
    switch (likelihood?.toLowerCase()) {
      case 'high':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'moderate':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      default:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Header bar with controls */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-cyan-500/10 text-cyan-400 rounded-lg border border-cyan-500/20">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              Observational Clinical Report
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-800/80">
                AI Vision Protocol v1.0
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Systematic 6-Section Diagnostic & Anomaly Breakdown
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {onReadAloud && (
            <button
              onClick={onReadAloud}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-colors ${
                isPlayingAudio
                  ? 'bg-cyan-500 text-slate-950 font-medium animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
              title="Dictate findings via Speech Synthesis"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>{isPlayingAudio ? 'Dictating...' : 'Read Aloud'}</span>
            </button>
          )}

          <button
            onClick={copyToClipboard}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            title="Copy Report"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            onClick={printReport}
            className="p-1.5 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            title="Print or Export PDF"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/60 px-4 text-xs font-medium">
        <button
          onClick={() => {
            setActiveTab('interactive');
            soundFx.playClick();
          }}
          className={`py-2 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'interactive'
              ? 'border-cyan-400 text-cyan-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          Structured Findings
        </button>
        <button
          onClick={() => {
            setActiveTab('verbatim');
            soundFx.playClick();
          }}
          className={`py-2 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'verbatim'
              ? 'border-cyan-400 text-cyan-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Verbatim Report (6 Sections)
        </button>
        <button
          onClick={() => {
            setActiveTab('fhir');
            soundFx.playClick();
          }}
          className={`py-2 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'fhir'
              ? 'border-cyan-400 text-cyan-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          HL7 / FHIR JSON
        </button>
      </div>

      {/* Scrollable Report Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-slate-200 text-sm">
        {/* Quality Failure / Non-Medical Guardrail Alert */}
        {(!report.isMedicalImage || !report.qualityAcceptable) && (
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-200 text-xs flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block text-amber-300">
                Operational Constraint Triggered: Image Quality / Non-Medical Input
              </strong>
              <p className="mt-1 text-slate-300 leading-relaxed">
                The visual input was classified as non-biomedical or possessing severe diagnostic limitations.
                Per radiological research protocol, automated clinical anomaly speculation is strictly prohibited.
              </p>
            </div>
          </div>
        )}

        {/* TAB 1: INTERACTIVE STRUCTURED CARDS */}
        {activeTab === 'interactive' && (
          <>
            {/* SECTION 1: Technical & Modality Assessment */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  1. Technical & Modality Assessment
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {report.section1_technicalAssessment.exposureStatus || 'Adequate Exposure'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mt-2">
                <div className="p-2.5 rounded bg-slate-900 border border-slate-800/80">
                  <span className="text-slate-400 block text-[11px] mb-0.5">Modality & Projection:</span>
                  <strong className="text-white font-medium">
                    {report.section1_technicalAssessment.modalityAndProjection}
                  </strong>
                </div>
                <div className="p-2.5 rounded bg-slate-900 border border-slate-800/80">
                  <span className="text-slate-400 block text-[11px] mb-0.5">Image Quality & Limitations:</span>
                  <span className="text-slate-300">
                    {report.section1_technicalAssessment.imageQualityAndLimitations}
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION 2: Systematic Anatomical Findings */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5 space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                2. Systematic Anatomical Findings
              </h3>

              <div className="space-y-1.5">
                {report.section2_systematicFindings.primaryStructures?.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-2 rounded bg-slate-900/90 border border-slate-800/80 text-xs gap-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">{item.anatomicalRegion}</span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.2 rounded border ${getStatusColor(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <span className="text-slate-400 text-xs">{item.findings}</span>
                  </div>
                ))}
              </div>

              <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800/60 text-xs">
                <span className="text-slate-400 font-medium block mb-1">
                  Secondary & Osseous Features:
                </span>
                <p className="text-slate-300 leading-relaxed">
                  {report.section2_systematicFindings.secondaryAndOsseousFeatures}
                </p>
              </div>
            </div>

            {/* SECTION 3: Key Observations & Highlighted Anomalies */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 font-mono flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                3. Key Observations & Highlighted Anomalies
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Feature 1 */}
                <div className="p-3 rounded-lg bg-slate-900 border border-amber-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300">Feature 1: Primary Target</span>
                    {report.section3_keyObservations.feature1.size && (
                      <span className="font-mono text-[10px] bg-amber-950 text-amber-400 px-1.5 py-0.5 rounded border border-amber-800">
                        {report.section3_keyObservations.feature1.size}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 text-slate-300">
                    <div>
                      <span className="text-slate-500">Location: </span>
                      <strong className="text-slate-200">
                        {report.section3_keyObservations.feature1.location || 'N/A'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Margins: </span>
                      <span>{report.section3_keyObservations.feature1.marginCharacteristics || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Density/Signal: </span>
                      <span>{report.section3_keyObservations.feature1.densitySignalIntensity || 'N/A'}</span>
                    </div>
                    <p className="text-xs text-slate-300 pt-1 leading-relaxed border-t border-slate-800 mt-1">
                      {report.section3_keyObservations.feature1.description}
                    </p>
                  </div>
                </div>

                {/* Feature 2 */}
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                  <span className="font-bold text-slate-300">Feature 2: Secondary / Diffuse</span>
                  <div className="space-y-1 text-slate-300">
                    {report.section3_keyObservations.feature2.location && (
                      <div>
                        <span className="text-slate-500">Location: </span>
                        <span>{report.section3_keyObservations.feature2.location}</span>
                      </div>
                    )}
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {report.section3_keyObservations.feature2.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 4: Impression & Differential Considerations */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                4. Impression & Differential Considerations
              </h3>

              {/* Hedged clinical synthesis */}
              <div className="p-3 rounded-lg bg-cyan-950/20 border border-cyan-800/40 text-xs">
                <span className="text-cyan-400 font-semibold block mb-1">Clinical Synthesis (Probabilistic):</span>
                <p className="text-slate-200 leading-relaxed italic">
                  "{report.section4_impressionDifferential.clinicalSynthesis}"
                </p>
              </div>

              {/* Differential Considerations */}
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-2">
                  Differential Patterns (Research Evaluation):
                </span>
                <div className="space-y-2">
                  {report.section4_impressionDifferential.differentialPatterns?.map((diff, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-start justify-between gap-2 text-xs"
                    >
                      <div className="space-y-0.5">
                        <strong className="text-slate-100 font-semibold">{diff.patternName}</strong>
                        <p className="text-slate-400 text-[11px] leading-relaxed">{diff.rationale}</p>
                      </div>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border shrink-0 ${getLikelihoodBadge(
                          diff.likelihood
                        )}`}
                      >
                        {diff.likelihood}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* SECTION 5: Recommended Clinical Follow-up */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                5. Recommended Clinical Follow-up
              </h3>

              <ul className="space-y-1.5 text-xs">
                {report.section5_clinicalFollowUp.suggestedNextSteps?.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-slate-300">
                    <ArrowRight className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* SECTION 6: Mandatory Safety Disclaimer */}
            <div className="bg-red-950/20 border border-red-800/40 rounded-lg p-3.5 text-xs text-red-200/90 space-y-1">
              <div className="flex items-center gap-2 text-red-400 font-bold uppercase tracking-wide text-[11px]">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>6. Mandatory Research & Safety Disclaimer</span>
              </div>
              <p className="leading-relaxed text-[11px] text-slate-300">
                {report.section6_mandatorySafetyDisclaimer ||
                  '⚠️ RESEARCH & DEMONSTRATION DISCLAIMER: This visual assessment is automatically generated by an experimental AI system for research, testing, and educational purposes only. It is NOT a clinical diagnosis, official radiology report, or replacement for professional medical advice. All visual findings must be independently reviewed and confirmed by a board-certified radiologist or licensed healthcare professional.'}
              </p>
            </div>
          </>
        )}

        {/* TAB 2: VERBATIM MARKDOWN REPORT */}
        {activeTab === 'verbatim' && (
          <div className="space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between text-slate-400 pb-1 border-b border-slate-800">
              <span>Verbatim Radiological Output (Strict 6 Section Template)</span>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
              >
                <Copy className="w-3.5 h-3.5" /> Copy Text
              </button>
            </div>
            <pre className="p-4 bg-slate-950 rounded-lg border border-slate-800 whitespace-pre-wrap leading-relaxed text-slate-300 select-text overflow-x-auto">
              {report.formattedMarkdownReport}
            </pre>
          </div>
        )}

        {/* TAB 3: HL7 FHIR JSON */}
        {activeTab === 'fhir' && (
          <div className="space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between text-slate-400 pb-1 border-b border-slate-800">
              <span>HL7 FHIR DiagnosticReport Resource Payload</span>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
              >
                <Copy className="w-3.5 h-3.5" /> Copy JSON
              </button>
            </div>
            <pre className="p-4 bg-slate-950 rounded-lg border border-slate-800 whitespace-pre-wrap leading-relaxed text-cyan-300 select-text overflow-x-auto text-[11px]">
              {JSON.stringify(
                {
                  resourceType: 'DiagnosticReport',
                  id: 'radvision-report-' + Date.now(),
                  status: 'preliminary',
                  category: [{ coding: [{ system: 'http://loinc.org', code: 'LP29684-5', display: 'Radiology' }] }],
                  code: { text: report.section1_technicalAssessment.modalityAndProjection },
                  conclusion: report.section4_impressionDifferential.clinicalSynthesis,
                  conclusionCode: report.section4_impressionDifferential.differentialPatterns.map((p) => ({
                    text: p.patternName,
                    likelihood: p.likelihood,
                  })),
                  extension: [
                    {
                      url: 'http://hl7.org/fhir/StructureDefinition/radiology-systematic-findings',
                      valueString: JSON.stringify(report.section2_systematicFindings),
                    },
                    {
                      url: 'http://hl7.org/fhir/StructureDefinition/safety-disclaimer',
                      valueString: report.section6_mandatorySafetyDisclaimer,
                    },
                  ],
                },
                null,
                2
              )}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
