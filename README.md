# RadVision AI — Clinical Radiology & Biomedical Vision Assistant

Expert AI clinical research assistant and biomedical vision analysis workstation for structured radiological observation, anomaly detection, teaching simulation, and synthetic clinical imaging.

## Features
- **Mandatory 6-Section Clinical Reporting:**
  1. Technical & Modality Assessment
  2. Systematic Anatomical Findings
  3. Key Observations & Highlighted Anomalies
  4. Impression & Differential Considerations
  5. Recommended Clinical Follow-up
  6. Mandatory Safety Disclaimer
- **Hedged Probabilistic Clinical Vocabulary:** Probabilistic phrasing without unhedged diagnoses.
- **Quality Failure Handling:** Detection and refusal of non-medical or unreadable inputs.
- **PACS Imaging Tools:**
  - Windowing/Leveling presets: Lung, Bone, Soft Tissue, Brain, Invert, Normal.
  - Interactive Caliper Measurement in millimeters.
  - Region of Interest (ROI) bounding box selector.
  - Client-side PHI de-identification redaction brush.
- **Educational Atlas Reference Generator:**
  - Generates synthetic references with 8 aspect ratios (`1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `9:16`, `16:9`, `21:9`) and resolution affordances (`1K`, `2K`, `4K`).
- **RadQuest Clinical Challenge Game:**
  - 60fps residency training simulation with procedural Web Audio synthesis, camera shake, hitstop, and multiplier streaks.

## Getting Started

### Prerequisites
- Node.js 20+ or 22+
- Gemini API key

### Installation
```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env and insert your GEMINI_API_KEY="your-api-key"

# 3. Start development server
npm run dev
```

Visit `http://localhost:3000` to use the application.

### Production Build & Run
```bash
npm run build
npm start
```
