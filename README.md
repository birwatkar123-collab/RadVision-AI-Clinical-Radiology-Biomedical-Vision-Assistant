# RadVision AI — Clinical Radiology & Biomedical Vision Assistant

> **Research & Educational Only** — Not a medical device. Not for clinical diagnosis or patient care. Review with a qualified clinician.

## Features
- 6-section structured radiology report with hedged language
- Quality guardrails + refusal for non-medical/unreadable inputs
- Deterministic safety disclaimer + [REQUIRES CLINICIAN REVIEW AND SIGN-OFF]
- PACS tools: window presets, calipers, ROI, PHI redaction, zoom/pan/rotate, touch support
- Atlas Reference Lab with 8 aspect ratios + 1K/2K/4K
- Gemini TTS dictation + HL7 FHIR R4-style preview
- RadQuest 60fps training game

## Setup
\\\ash
git clone https://github.com/birwatkar123-collab/RadVision-AI-Clinical-Radiology-Biomedical-Vision-Assistant.git
cd RadVision-AI-Clinical-Radiology-Biomedical-Vision-Assistant
npm install
cp .env.example .env  # set GEMINI_API_KEY
npm run dev        # http://localhost:3000
npm run build && npm start  # production
