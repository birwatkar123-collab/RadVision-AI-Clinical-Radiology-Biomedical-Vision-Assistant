export interface PrimaryStructureItem {
  anatomicalRegion: string;
  status: 'Normal' | 'Unremarkable' | 'Indeterminate' | 'Abnormal';
  findings: string;
}

export interface KeyObservationFeature {
  name?: string;
  location?: string;
  size?: string;
  marginCharacteristics?: string;
  densitySignalIntensity?: string;
  description: string;
  normalizedBoundingBox?: number[]; // [ymin, xmin, ymax, xmax] 0-1000
}

export interface DifferentialPattern {
  patternName: string;
  likelihood: 'High' | 'Moderate' | 'Low' | 'Consideration';
  rationale: string;
}

export interface ClinicalReport {
  isMedicalImage: boolean;
  qualityAcceptable: boolean;
  section1_technicalAssessment: {
    modalityAndProjection: string;
    imageQualityAndLimitations: string;
    exposureStatus?: string;
    patientPositioning?: string;
  };
  section2_systematicFindings: {
    primaryStructures: PrimaryStructureItem[];
    secondaryAndOsseousFeatures: string;
  };
  section3_keyObservations: {
    feature1: KeyObservationFeature;
    feature2: KeyObservationFeature;
  };
  section4_impressionDifferential: {
    clinicalSynthesis: string;
    differentialPatterns: DifferentialPattern[];
  };
  section5_clinicalFollowUp: {
    suggestedNextSteps: string[];
  };
  section6_mandatorySafetyDisclaimer: string;
  formattedMarkdownReport: string;
}

export interface SampleCase {
  id: string;
  title: string;
  modality: string;
  projection: string;
  clinicalHistory: string;
  category: 'Thoracic' | 'Neuro' | 'Abdominal' | 'Dermatology' | 'Control';
  groundTruthHint: string;
  targetAnomalyBox?: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 0-1000
  generateDataUrl: () => string;
}

export interface CaliperMeasurement {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  distancePx: number;
  distanceMm: number;
}

export interface RoiBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export type WindowPreset = 'normal' | 'lung' | 'bone' | 'soft-tissue' | 'brain' | 'invert';
