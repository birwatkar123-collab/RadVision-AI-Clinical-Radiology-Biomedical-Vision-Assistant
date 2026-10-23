import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Middleware for parsing JSON with generous size limit for base64 medical imaging
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const ALLOWED_ANALYSIS_MODELS = new Set(['gemini-3.8-flash', 'gemini-2.5-flash']);
const ALLOWED_IMAGE_GENERATION_MODELS = new Set(['gemini-3.1-flash-lite-image', 'gemini-2.5-flash-image']);
const ALLOWED_TTS_MODELS = new Set(['gemini-3.8-flash-lite-tts', 'gemini-2.5-flash-preview-tts']);
const ALLOWED_ASPECT_RATIOS = new Set(['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9']);
const ALLOWED_IMAGE_SIZES = new Set(['1K', '2K', '4K']);
const ALLOWED_TTS_VOICES = new Set(['Kore', 'Puck', 'Charon', 'Fenrir', 'Aoede']);

// Server-side initialization of Gemini client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const err: any = new Error('GEMINI_API_KEY is not configured in environment variables');
    err.statusCode = 503;
    throw err;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// API: Biomedical Vision Analysis & Structured Radiological Report
app.post('/api/analyze-image', async (req, res) => {
  try {
    const {
      imageBase64,
      mimeType = 'image/png',
      modalityHint = '',
      clinicalContext = '',
      roi = null, // [ymin, xmin, ymax, xmax] if specified
      model = 'gemini-3.8-flash',
    } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64 in request body' });
    }

    const selectedModel = typeof model === 'string' && ALLOWED_ANALYSIS_MODELS.has(model) ? model : 'gemini-3.8-flash';

    // Clean data URL prefix if present
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

    const ai = getGeminiClient();

    const systemInstruction = `You are RadVision AI, an expert clinical research assistant and biomedical vision workstation. You must adhere strictly to the following operational, safety, and formatting constraints.

### CORE OBJECTIVE
Analyze uploaded medical imaging scans (e.g., Chest X-rays, CTs, MRIs, Ultrasounds, Histopathology, Dermatology photos) and generate structured, professional observational reports for research and educational purposes only.

### 1. INPUT VALIDATION & HALLUCINATION GUARDRAILS
- Evaluate input image quality first. If the image is non-medical, severely cropped, corrupted, or inadequate for diagnosis, output a structured refusal in your assessment: set isMedicalImage=false and qualityAcceptable=false. Do NOT fabricate, guess, or assume abnormal findings on clear normal images or invalid inputs.
- Restrict output strictly to the provided JSON schema.

### 2. HEDGED CLINICAL PHRASING
- Always use probabilistic clinical phrasing (e.g., "findings are suggestive of", "features are consistent with", "findings raise suspicion for").
- NEVER state unhedged absolute diagnoses (e.g., write "features are consistent with left lower lobe pneumonia", NOT "the patient has pneumonia").

### 3. MANDATORY 6-SECTION REPORT STRUCTURE
Format all clinical evaluations strictly into these 6 sections:
1. Technical & Modality Assessment
2. Systematic Anatomical Findings
3. Key Observations & Highlighted Anomalies
4. Impression & Differential Considerations (1-3 prioritized)
5. Recommended Clinical Follow-up
6. Mandatory Safety Disclaimer

### 4. EHR / FHIR PAYLOAD GENERATION AWARENESS
- When findings are structured, they must be representable as a valid HL7 FHIR R4 DiagnosticReport and Observation resources with appropriate coding concepts (LOINC/SNOMED CT) where applicable.

### 5. AGENTIC WORKFLOWS & HUMAN-IN-THE-LOOP (HITL)
- All proposed actions (order drafting, follow-up recommendations, patient summaries) are DRAFTS.
- Explicitly flag every actionable recommendation with: [REQUIRES CLINICIAN REVIEW AND SIGN-OFF].

### OPERATIONAL CONSTRAINTS
1. **Hedged Language:** Never declare a definitive diagnosis. Use probabilistic phrasing.
2. **Quality Failure Handling:** If an uploaded image is non-medical, severely degraded, cropped, or unreadable, state this clearly in Section 1 and refuse to speculate on abnormal findings. Indicate in Section 4 that visual data is insufficient for clinical evaluation.
3. **Objective Medical Vocabulary:** Use precise clinical terminology (e.g., *radiolucent*, *hyperdense*, *ground-glass opacity*, *pleural effusion*, *atelectasis*, *consolidation*, *circumscribed*, *spiculated*, *signal attenuation*) rather than non-clinical terms.
4. **Privacy and Security:** Avoid disclosing or inferring identifying patient details.
5. **Deterministic Disclaimer:** The Mandatory Safety Disclaimer in section6_mandatorySafetyDisclaimer MUST be the exact research and demonstration disclaimer provided.`;

    const userPrompt = `Systematic Clinical Analysis Request:
Modality/Exam hint: ${modalityHint || 'Auto-detect from image'}
Patient Clinical Context/Reason for Exam: ${clinicalContext || 'Routine diagnostic/educational evaluation'}
${roi ? `User Designated Region of Interest (ROI Normalized Box): [ymin: ${roi.ymin}, xmin: ${roi.xmin}, ymax: ${roi.ymax}, xmax: ${roi.xmax}] - Please pay special attention to this region.` : ''}

MANDATORY REQUIREMENTS:
- If non-medical/unreadable -> isMedicalImage=false, qualityAcceptable=false. Do NOT list differential diagnoses. In section4_impressionDifferential.clinicalSynthesis state visual data is insufficient. In section5_clinicalFollowUp.suggestedNextSteps include ONLY guidance that no clinical conclusions can be drawn [REQUIRES CLINICIAN REVIEW AND SIGN-OFF].
- For medical images, use strictly hedged phrasing (suggestive of/consistent with/raises suspicion for). NEVER use absolute diagnoses.
- Flag EVERY actionable recommendation in section5_clinicalFollowUp with [REQUIRES CLINICIAN REVIEW AND SIGN-OFF].
- section6_mandatorySafetyDisclaimer MUST be EXACTLY: "⚠️ RESEARCH & DEMONSTRATION DISCLAIMER: This visual assessment is automatically generated by an experimental AI system for research, testing, and educational purposes only. It is NOT a clinical diagnosis, official radiology report, or replacement for professional medical advice. All visual findings must be independently reviewed and confirmed by a board-certified radiologist or licensed healthcare professional."
- Provide both rich structured assessment and exact section headers in formattedMarkdownReport.

Analyze this biomedical visual scan adhering strictly to the 6 mandatory sections and all operational constraints.`;

    // Request structured JSON schema for UI display + formatted markdown report
    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: cleanBase64,
            },
          },
          {
            text: userPrompt,
          },
        ],
      },
      config: {
        systemInstruction,
        temperature: 0.2, // Low temperature for clinical objectivity and stability
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isMedicalImage: {
              type: Type.BOOLEAN,
              description: 'Whether the uploaded image is a valid biomedical or medical scan',
            },
            qualityAcceptable: {
              type: Type.BOOLEAN,
              description: 'Whether image quality is adequate for radiological observation',
            },
            section1_technicalAssessment: {
              type: Type.OBJECT,
              properties: {
                modalityAndProjection: { type: Type.STRING },
                imageQualityAndLimitations: { type: Type.STRING },
                exposureStatus: { type: Type.STRING, description: 'Optimal, Overexposed, Underexposed, or N/A' },
                patientPositioning: { type: Type.STRING },
              },
              required: ['modalityAndProjection', 'imageQualityAndLimitations'],
            },
            section2_systematicFindings: {
              type: Type.OBJECT,
              properties: {
                primaryStructures: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      anatomicalRegion: { type: Type.STRING },
                      status: { type: Type.STRING, description: 'Normal, Unremarkable, Indeterminate, or Abnormal' },
                      findings: { type: Type.STRING },
                    },
                    required: ['anatomicalRegion', 'status', 'findings'],
                  },
                },
                secondaryAndOsseousFeatures: {
                  type: Type.STRING,
                  description: 'Assessment of bones, soft tissues, foreign bodies, lines, or pacemakers',
                },
              },
              required: ['primaryStructures', 'secondaryAndOsseousFeatures'],
            },
            section3_keyObservations: {
              type: Type.OBJECT,
              properties: {
                feature1: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    location: { type: Type.STRING },
                    size: { type: Type.STRING },
                    marginCharacteristics: { type: Type.STRING },
                    densitySignalIntensity: { type: Type.STRING },
                    description: { type: Type.STRING },
                    normalizedBoundingBox: {
                      type: Type.ARRAY,
                      items: { type: Type.NUMBER },
                      description: '[ymin, xmin, ymax, xmax] in 0-1000 scale if localized, or empty if diffuse/none',
                    },
                  },
                  required: ['name', 'location', 'marginCharacteristics', 'densitySignalIntensity', 'description'],
                },
                feature2: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    location: { type: Type.STRING },
                    size: { type: Type.STRING },
                    marginCharacteristics: { type: Type.STRING },
                    densitySignalIntensity: { type: Type.STRING },
                    description: { type: Type.STRING },
                  },
                  required: ['description'],
                },
              },
              required: ['feature1', 'feature2'],
            },
            section4_impressionDifferential: {
              type: Type.OBJECT,
              properties: {
                clinicalSynthesis: {
                  type: Type.STRING,
                  description: 'Concise summary of visual findings using hedged clinical phrasing',
                },
                differentialPatterns: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      patternName: { type: Type.STRING },
                      likelihood: { type: Type.STRING, description: 'High, Moderate, Low, or Consideration' },
                      rationale: { type: Type.STRING },
                    },
                    required: ['patternName', 'likelihood', 'rationale'],
                  },
                },
              },
              required: ['clinicalSynthesis', 'differentialPatterns'],
            },
            section5_clinicalFollowUp: {
              type: Type.OBJECT,
              properties: {
                suggestedNextSteps: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Recommended clinical follow-ups, additional views, or laboratory correlations',
                },
              },
              required: ['suggestedNextSteps'],
            },
            section6_mandatorySafetyDisclaimer: {
              type: Type.STRING,
              description: 'Must be the exact mandatory research and demonstration disclaimer',
            },
            formattedMarkdownReport: {
              type: Type.STRING,
              description: 'The complete verbatim report with the 6 mandatory H3 section headers',
            },
          },
          required: [
            'isMedicalImage',
            'qualityAcceptable',
            'section1_technicalAssessment',
            'section2_systematicFindings',
            'section3_keyObservations',
            'section4_impressionDifferential',
            'section5_clinicalFollowUp',
            'section6_mandatorySafetyDisclaimer',
            'formattedMarkdownReport',
          ],
        },
      },
    });

    let parsedJson: any = {};
    try {
      parsedJson = JSON.parse(response.text || '{}');
    } catch (parseErr: any) {
      console.error('Error parsing model JSON:', parseErr);
      return res.status(502).json({ error: 'Model returned malformed structured output' });
    }
    return res.json({ success: true, data: parsedJson });
  } catch (error: any) {
    console.error('Error analyzing image:', error);
    const status = error?.statusCode || 500;
    if (status === 503 || error?.message?.includes('GEMINI_API_KEY')) {
      return res.status(503).json({ error: 'GEMINI_API_KEY is not configured in environment variables' });
    }
    const msg = typeof error?.message === 'string' ? error.message : 'An error occurred during biomedical vision analysis';
    return res.status(status).json({ error: msg });
  }
});

// API: Generate Synthetic Anatomical Reference / Atlas Imaging
// Affordances: aspect ratio (1:1, 2:3, 3:2, 3:4, 4:3, 9:16, 16:9, 21:9) and image size (1K, 2K, 4K)
app.post('/api/generate-reference', async (req, res) => {
  try {
    const {
      prompt,
      aspectRatio = '1:1',
      imageSize = '1K',
      modalityType = 'X-Ray',
      model: requestedModel,
    } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const ai = getGeminiClient();

    const validRatio = typeof aspectRatio === 'string' && ALLOWED_ASPECT_RATIOS.has(aspectRatio) ? aspectRatio : '1:1';
    const validImageSize = typeof imageSize === 'string' && ALLOWED_IMAGE_SIZES.has(imageSize) ? imageSize : '1K';
    const selectedImageModel =
      typeof requestedModel === 'string' && ALLOWED_IMAGE_GENERATION_MODELS.has(requestedModel)
        ? requestedModel
        : 'gemini-3.1-flash-lite-image';

    // Map aspect ratios to supported formats for flash-lite-image (subset)
    const supportedByFlashLite = ['1:1', '3:4', '4:3', '9:16', '16:9'];
    const ratioForConfig = supportedByFlashLite.includes(validRatio) ? validRatio : '1:1';

    const fullPrompt = `Medical educational visual atlas reference: High resolution ${modalityType} illustration. ${prompt.trim()}. Clear anatomical landmarks, professional biomedical scientific render, realistic radiological contrast and attenuation, labeled or educational clarity, no artifacts.`;

    let generatedImageUrl = '';
    let usedModel = selectedImageModel;

    // Attempt generation
    try {
      const response = await ai.models.generateContent({
        model: selectedImageModel,
        contents: {
          parts: [{ text: fullPrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: ratioForConfig as any,
            ...(validImageSize ? ({ imageSize: validImageSize } as any) : {}),
          },
        },
      });

      const candidates = response.candidates;
      if (candidates && candidates[0]?.content?.parts) {
        for (const part of candidates[0].content.parts) {
          if (part.inlineData) {
            generatedImageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
            break;
          }
        }
      }
    } catch (modelErr: any) {
      console.warn('Initial image generation attempt with flash-lite-image fallback:', modelErr.message);
      // Fallback or re-throw
      throw modelErr;
    }

    if (!generatedImageUrl) {
      return res.status(500).json({ error: 'No image data returned from generator' });
    }

    return res.json({
      success: true,
      imageUrl: generatedImageUrl,
      aspectRatio: validRatio,
      imageSize: validImageSize,
      modelUsed: usedModel,
    });
  } catch (error: any) {
    console.error('Error generating reference image:', error);
    const status = error?.statusCode || 500;
    if (status === 503 || error?.message?.includes('GEMINI_API_KEY')) {
      return res.status(503).json({ error: 'GEMINI_API_KEY is not configured in environment variables' });
    }
    const msg = typeof error?.message === 'string' ? error.message : 'Failed to generate reference image';
    return res.status(status).json({ error: msg });
  }
});

// API: Audio Dictation / Speech for Hands-Free Radiology Workflow
app.post('/api/generate-speech', async (req, res) => {
  try {
    const { text, voice = 'Kore', model: requestedModel } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required for speech synthesis' });
    }

    const selectedTtsModel =
      typeof requestedModel === 'string' && ALLOWED_TTS_MODELS.has(requestedModel) ? requestedModel : 'gemini-3.8-flash-lite-tts';
    const selectedVoice =
      typeof voice === 'string' && ALLOWED_TTS_VOICES.has(voice) ? voice : 'Kore';

    const ai = getGeminiClient();
    const cleanText = text.slice(0, 1500); // Reasonable clip length

    const response = await ai.models.generateContent({
      model: selectedTtsModel,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: cleanText,
              speechMetadata: {
                style: 'Professional, articulate radiologist dictation reading clinical report findings clearly and steadily',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: selectedVoice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.status(500).json({ error: 'No audio returned from speech synthesis' });
    }

    return res.json({
      success: true,
      audioBase64: `data:audio/wav;base64,${base64Audio}`,
    });
  } catch (error: any) {
    console.error('TTS error:', error);
    const status = error?.statusCode || 500;
    if (status === 503 || error?.message?.includes('GEMINI_API_KEY')) {
      return res.status(503).json({ error: 'GEMINI_API_KEY is not configured in environment variables' });
    }
    const msg = typeof error?.message === 'string' ? error.message : 'TTS synthesis failed';
    return res.status(status).json({ error: msg });
  }
});

// API: Download complete repository zip
app.get('/api/download-zip', (_req, res) => {
  const zipPath = path.resolve(__dirname, 'radvision-ai.zip');
  if (fs.existsSync(zipPath)) {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="radvision-ai.zip"');
    res.sendFile(zipPath);
  } else {
    res.status(404).json({ error: 'Zip file not found' });
  }
});

// Configure Vite or Static Serve
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`RadVision AI clinical workstation running on http://localhost:${port}`);
  });
}

startServer();
