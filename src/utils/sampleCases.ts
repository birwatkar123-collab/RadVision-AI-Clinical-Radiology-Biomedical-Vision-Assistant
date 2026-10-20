import { SampleCase } from '../types/clinical';

// Procedurally generate realistic clinical imaging simulations to ensure zero broken assets
function createChestXrayCanvas(type: 'consolidation' | 'pneumothorax' | 'normal'): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 700;
  canvas.height = 700;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background - dark thorax radiographic film
  ctx.fillStyle = '#06070a';
  ctx.fillRect(0, 0, 700, 700);

  // Soft tissue outline
  const softGrad = ctx.createRadialGradient(350, 360, 80, 350, 360, 340);
  softGrad.addColorStop(0, '#1c1f26');
  softGrad.addColorStop(0.7, '#14171e');
  softGrad.addColorStop(1, '#090a0d');
  ctx.fillStyle = softGrad;
  ctx.beginPath();
  ctx.ellipse(350, 380, 270, 300, 0, 0, Math.PI * 2);
  ctx.fill();

  // Bilateral Lung fields (dark radiolucent zones)
  const drawLungField = (isRight: boolean) => {
    ctx.save();
    ctx.beginPath();
    const cx = isRight ? 245 : 455;
    const grad = ctx.createRadialGradient(cx, 340, 30, cx, 340, 160);
    grad.addColorStop(0, '#0a0d14');
    grad.addColorStop(0.7, '#10141f');
    grad.addColorStop(1, '#1b202c');
    ctx.fillStyle = grad;

    if (isRight) {
      // Right lung: Apex at 150, base at 520
      ctx.moveTo(310, 140);
      ctx.quadraticCurveTo(220, 120, 170, 220);
      ctx.quadraticCurveTo(140, 340, 145, 520); // lateral chest wall
      ctx.quadraticCurveTo(240, 560, 315, 480); // hemidiaphragm
      ctx.quadraticCurveTo(320, 350, 310, 140); // mediastinal border
    } else {
      // Left lung
      ctx.moveTo(390, 140);
      ctx.quadraticCurveTo(480, 120, 530, 220);
      ctx.quadraticCurveTo(560, 340, 555, 530); // lateral chest wall
      ctx.quadraticCurveTo(460, 570, 385, 490); // hemidiaphragm
      ctx.quadraticCurveTo(380, 350, 390, 140); // mediastinal border
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  drawLungField(true);
  drawLungField(false);

  // Mediastinum & Cardiac silhouette
  ctx.save();
  ctx.fillStyle = '#424855';
  ctx.beginPath();
  // Trachea & Superior Mediastinum
  ctx.rect(340, 100, 20, 160);
  ctx.fill();

  // Aortic Knob & Heart
  ctx.beginPath();
  ctx.moveTo(340, 260);
  ctx.quadraticCurveTo(390, 270, 375, 300); // aortic knob
  ctx.quadraticCurveTo(430, 420, 370, 490); // left cardiac apex (CTR)
  ctx.quadraticCurveTo(320, 495, 300, 450); // inferior margin
  ctx.quadraticCurveTo(290, 370, 320, 320); // right atrium margin
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Diaphragms
  ctx.fillStyle = '#3a3f4c';
  // Right hemidiaphragm
  ctx.beginPath();
  ctx.ellipse(230, 520, 100, 40, -0.05, 0, Math.PI);
  ctx.fill();
  // Left hemidiaphragm
  ctx.beginPath();
  ctx.ellipse(470, 530, 95, 40, 0.05, 0, Math.PI);
  ctx.fill();

  // Ribs (Bony osseous structures)
  ctx.strokeStyle = 'rgba(120, 130, 150, 0.28)';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const y = 190 + i * 44;
    // Right posterior rib
    ctx.beginPath();
    ctx.moveTo(330, y);
    ctx.quadraticCurveTo(240, y + 15, 150, y + 40);
    ctx.stroke();

    // Left posterior rib
    ctx.beginPath();
    ctx.moveTo(370, y);
    ctx.quadraticCurveTo(460, y + 15, 550, y + 40);
    ctx.stroke();
  }

  // Clavicles
  ctx.strokeStyle = 'rgba(170, 185, 210, 0.5)';
  ctx.lineWidth = 12;
  // Right clavicle
  ctx.beginPath();
  ctx.moveTo(335, 175);
  ctx.quadraticCurveTo(240, 160, 160, 185);
  ctx.stroke();
  // Left clavicle
  ctx.beginPath();
  ctx.moveTo(365, 175);
  ctx.quadraticCurveTo(460, 160, 540, 185);
  ctx.stroke();

  // Bronchovascular pulmonary markings
  ctx.strokeStyle = 'rgba(150, 160, 180, 0.18)';
  ctx.lineWidth = 2.5;
  const drawVessels = (startX: number, startY: number, dir: number) => {
    for (let j = 0; j < 12; j++) {
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      const angle = (j - 6) * 0.25;
      const len = 70 + (j % 4) * 20;
      ctx.lineTo(startX + Math.cos(angle) * len * dir, startY + Math.sin(angle) * len);
      ctx.stroke();
    }
  };
  drawVessels(300, 340, -1); // Right hilum
  if (type !== 'pneumothorax') {
    drawVessels(400, 330, 1); // Left hilum
  }

  // Type specific pathology additions
  if (type === 'consolidation') {
    // Dense alveolar infiltration / consolidation in right mid-lower zone
    const consolGrad = ctx.createRadialGradient(235, 410, 10, 235, 410, 75);
    consolGrad.addColorStop(0, 'rgba(230, 235, 245, 0.85)');
    consolGrad.addColorStop(0.5, 'rgba(200, 210, 225, 0.55)');
    consolGrad.addColorStop(0.8, 'rgba(150, 165, 185, 0.25)');
    consolGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = consolGrad;
    ctx.beginPath();
    ctx.ellipse(235, 410, 70, 55, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Air bronchograms inside consolidation
    ctx.strokeStyle = 'rgba(15, 20, 28, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(250, 390);
    ctx.lineTo(230, 420);
    ctx.lineTo(210, 435);
    ctx.moveTo(230, 420);
    ctx.lineTo(235, 440);
    ctx.stroke();
  } else if (type === 'pneumothorax') {
    // Hyperlucent left pleural space with visible lung pleural line
    ctx.fillStyle = '#030406'; // Jet black deep lucency
    ctx.beginPath();
    ctx.moveTo(500, 180);
    ctx.lineTo(550, 260);
    ctx.lineTo(555, 460);
    ctx.lineTo(480, 420);
    ctx.closePath();
    ctx.fill();

    // Visceral pleural line (thin crisp margin)
    ctx.strokeStyle = 'rgba(240, 245, 255, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(495, 180);
    ctx.quadraticCurveTo(480, 300, 475, 425);
    ctx.stroke();

    // Collapsed left lung stump
    const stumpGrad = ctx.createRadialGradient(420, 330, 10, 420, 330, 55);
    stumpGrad.addColorStop(0, 'rgba(140, 150, 170, 0.7)');
    stumpGrad.addColorStop(1, 'rgba(30, 35, 45, 0.2)');
    ctx.fillStyle = stumpGrad;
    ctx.beginPath();
    ctx.ellipse(435, 340, 45, 80, 0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  // Radiopaque Lead Marker "R" & Orientation
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.font = 'bold 24px monospace';
  ctx.fillText('R', 70, 90);
  ctx.font = '12px sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fillText('DE-IDENTIFIED RESEARCH SCAN', 70, 110);
  ctx.fillText('PA ERECT 120kVp 4mAs', 70, 126);

  return canvas.toDataURL('image/png');
}

// Procedural Brain MRI Axial T2/FLAIR simulation
function createBrainMriCanvas(): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 650;
  canvas.height = 650;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#050608';
  ctx.fillRect(0, 0, 650, 650);

  // Calvarium / Skull outline
  ctx.strokeStyle = 'rgba(210, 220, 235, 0.7)';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.ellipse(325, 325, 240, 275, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Subcutaneous scalp
  ctx.strokeStyle = 'rgba(90, 100, 120, 0.4)';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.ellipse(325, 325, 250, 285, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Brain Parenchyma (T2/FLAIR Gray & White matter)
  const brainGrad = ctx.createRadialGradient(325, 325, 30, 325, 325, 230);
  brainGrad.addColorStop(0, '#3b4352');
  brainGrad.addColorStop(0.8, '#4a5364');
  brainGrad.addColorStop(1, '#2c323f');
  ctx.fillStyle = brainGrad;
  ctx.beginPath();
  ctx.ellipse(325, 325, 230, 265, 0, 0, Math.PI * 2);
  ctx.fill();

  // Interhemispheric fissure
  ctx.strokeStyle = '#12151c';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(325, 70);
  ctx.lineTo(325, 580);
  ctx.stroke();

  // Lateral Ventricles (dark on FLAIR/CSF attenuated)
  ctx.fillStyle = '#10131a';
  // Left ventricle (radiological right)
  ctx.beginPath();
  ctx.ellipse(290, 315, 22, 65, 0.1, 0, Math.PI * 2);
  ctx.fill();
  // Right ventricle (radiological left)
  ctx.beginPath();
  ctx.ellipse(360, 315, 22, 65, -0.1, 0, Math.PI * 2);
  ctx.fill();

  // Cortical sulcal folds
  ctx.strokeStyle = '#1d222d';
  ctx.lineWidth = 2;
  for (let a = 0; a < Math.PI * 2; a += 0.2) {
    const rx = 325 + Math.cos(a) * 220;
    const ry = 325 + Math.sin(a) * 255;
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.lineTo(rx - Math.cos(a) * 35, ry - Math.sin(a) * 35);
    ctx.stroke();
  }

  // Hyperintense focal demyelinating plaque (T2/FLAIR White Matter Lesion in periventricular region)
  const lesionGrad = ctx.createRadialGradient(255, 275, 2, 255, 275, 22);
  lesionGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  lesionGrad.addColorStop(0.6, 'rgba(230, 240, 255, 0.75)');
  lesionGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = lesionGrad;
  ctx.beginPath();
  ctx.ellipse(255, 275, 20, 16, 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Subtle second satellite lesion
  const lesion2 = ctx.createRadialGradient(385, 370, 2, 385, 370, 14);
  lesion2.addColorStop(0, 'rgba(250, 255, 255, 0.85)');
  lesion2.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = lesion2;
  ctx.beginPath();
  ctx.arc(385, 370, 14, 0, Math.PI * 2);
  ctx.fill();

  // MRI Metadata labels
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '14px monospace';
  ctx.fillText('AXIAL T2-FLAIR', 40, 45);
  ctx.fillText('TR: 9000ms  TE: 110ms', 40, 65);
  ctx.fillText('FOV: 220mm  Slice: 4.0mm', 40, 85);

  return canvas.toDataURL('image/png');
}

// Procedural Abdominal CT simulation
function createAbdominalCtCanvas(): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 650;
  canvas.height = 650;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#080a0f';
  ctx.fillRect(0, 0, 650, 650);

  // Abdominal body wall outline
  ctx.fillStyle = '#222733';
  ctx.beginPath();
  ctx.ellipse(325, 340, 260, 210, 0, 0, Math.PI * 2);
  ctx.fill();

  // Subcutaneous fat
  ctx.strokeStyle = '#121620';
  ctx.lineWidth = 18;
  ctx.stroke();

  // Lumbar Spine & Ribs (Dense Bone - high Hounsfield Units)
  ctx.fillStyle = '#e5ebf5';
  // Vertebral body
  ctx.beginPath();
  ctx.arc(325, 430, 34, 0, Math.PI * 2);
  ctx.fill();
  // Spinal canal (radiolucent center)
  ctx.fillStyle = '#080a0f';
  ctx.beginPath();
  ctx.arc(325, 430, 14, 0, Math.PI * 2);
  ctx.fill();

  // Aorta & IVC anterior to spine
  ctx.fillStyle = '#e03030'; // with contrast: hyperdense
  ctx.fillStyle = '#c5d0e2';
  ctx.beginPath();
  ctx.arc(310, 385, 15, 0, Math.PI * 2); // Aorta
  ctx.fill();
  ctx.beginPath();
  ctx.arc(345, 385, 14, 0, Math.PI * 2); // IVC
  ctx.fill();

  // Liver (Large parenchymal organ on radiological right / canvas left)
  ctx.fillStyle = '#4c5566';
  ctx.beginPath();
  ctx.moveTo(140, 310);
  ctx.quadraticCurveTo(200, 210, 330, 220);
  ctx.quadraticCurveTo(340, 330, 290, 370);
  ctx.quadraticCurveTo(170, 380, 140, 310);
  ctx.closePath();
  ctx.fill();

  // Spleen (left upper quadrant)
  ctx.fillStyle = '#454e5e';
  ctx.beginPath();
  ctx.ellipse(490, 290, 45, 60, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Left Kidney
  ctx.fillStyle = '#525b6c';
  ctx.beginPath();
  ctx.ellipse(450, 420, 38, 52, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Right Kidney with an exophytic cystic/hypoattenuating lesion
  ctx.beginPath();
  ctx.ellipse(200, 415, 42, 54, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Hypoattenuating focal renal lesion
  const lesionGrad = ctx.createRadialGradient(185, 430, 3, 185, 430, 20);
  lesionGrad.addColorStop(0, '#1a1f29');
  lesionGrad.addColorStop(0.8, '#262d3a');
  lesionGrad.addColorStop(1, '#4c5566');
  ctx.fillStyle = lesionGrad;
  ctx.beginPath();
  ctx.arc(185, 430, 20, 0, Math.PI * 2);
  ctx.fill();

  // CT Scale & Orientation
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '14px monospace';
  ctx.fillText('PORTAL VENOUS PHASE CT', 40, 45);
  ctx.fillText('WL: 40  WW: 350 (Soft Tissue)', 40, 65);
  ctx.fillText('120 kV  Effective mAs: 210', 40, 85);

  return canvas.toDataURL('image/png');
}

// Procedural Dermoscopy Melanocytic Lesion simulation
function createDermoscopyCanvas(): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 650;
  canvas.height = 650;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background skin tone
  const skinGrad = ctx.createRadialGradient(325, 325, 100, 325, 325, 325);
  skinGrad.addColorStop(0, '#dfb79e');
  skinGrad.addColorStop(1, '#c59d84');
  ctx.fillStyle = skinGrad;
  ctx.fillRect(0, 0, 650, 650);

  // Dermatoscope contact plate vignetting
  const lensGrad = ctx.createRadialGradient(325, 325, 250, 325, 325, 325);
  lensGrad.addColorStop(0, 'rgba(0,0,0,0)');
  lensGrad.addColorStop(1, 'rgba(0,0,0,0.85)');
  ctx.fillStyle = lensGrad;
  ctx.fillRect(0, 0, 650, 650);

  // Asymmetric pigmented lesion (ABCD criteria for melanoma evaluation)
  ctx.save();
  ctx.translate(325, 325);
  ctx.beginPath();
  // Irregular jagged perimeter
  const points = 36;
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const baseR = 130 + (i % 3 === 0 ? 30 : -15) + Math.sin(angle * 3) * 25;
    const x = Math.cos(angle) * baseR;
    const y = Math.sin(angle) * (baseR * 0.85);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();

  // Multi-color pigment variegation (tan, dark brown, slate-blue veil)
  const pigmentGrad = ctx.createRadialGradient(-30, -20, 20, 10, 10, 160);
  pigmentGrad.addColorStop(0, '#1c120c'); // Jet black/dark brown core
  pigmentGrad.addColorStop(0.4, '#3d2516');
  pigmentGrad.addColorStop(0.7, '#6b432a');
  pigmentGrad.addColorStop(1, '#946345');
  ctx.fillStyle = pigmentGrad;
  ctx.fill();

  // Blue-white veil in quadrant
  const veilGrad = ctx.createRadialGradient(-40, 20, 5, -40, 20, 45);
  veilGrad.addColorStop(0, 'rgba(120, 145, 180, 0.7)');
  veilGrad.addColorStop(1, 'rgba(120, 145, 180, 0)');
  ctx.fillStyle = veilGrad;
  ctx.beginPath();
  ctx.arc(-40, 20, 45, 0, Math.PI * 2);
  ctx.fill();

  // Atypical pigment network / streaks
  ctx.strokeStyle = '#23150d';
  ctx.lineWidth = 1.5;
  for (let s = 0; s < 18; s++) {
    const a = (s / 18) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 90, Math.sin(a) * 80);
    ctx.lineTo(Math.cos(a) * 140, Math.sin(a) * 125);
    ctx.stroke();
  }
  ctx.restore();

  // Dermatoscope mm scale bar overlay
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(80, 580);
  ctx.lineTo(240, 580);
  ctx.stroke();
  for (let tick = 0; tick <= 8; tick++) {
    const tx = 80 + tick * 20;
    ctx.beginPath();
    ctx.moveTo(tx, 572);
    ctx.lineTo(tx, 588);
    ctx.stroke();
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = '12px monospace';
  ctx.fillText('0    2    4    6    8 mm', 76, 608);

  return canvas.toDataURL('image/png');
}

// Procedural Non-Medical Control image (Coffee mug) to test Quality Failure Handling gracefully!
function createCoffeeCupControlCanvas(): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 650;
  canvas.height = 650;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Wooden desk surface
  ctx.fillStyle = '#8a5a36';
  ctx.fillRect(0, 0, 650, 650);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  for (let l = 0; l < 650; l += 40) {
    ctx.fillRect(0, l, 650, 2);
  }

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(360, 420, 160, 70, 0.1, 0, Math.PI * 2);
  ctx.fill();

  // Ceramic Mug
  const mugGrad = ctx.createLinearGradient(200, 200, 460, 400);
  mugGrad.addColorStop(0, '#f8fafc');
  mugGrad.addColorStop(0.7, '#cbd5e1');
  mugGrad.addColorStop(1, '#94a3b8');
  ctx.fillStyle = mugGrad;
  ctx.beginPath();
  ctx.roundRect(240, 230, 180, 190, [10, 10, 40, 40]);
  ctx.fill();

  // Handle
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 22;
  ctx.beginPath();
  ctx.arc(430, 310, 50, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();

  // Top rim & coffee
  ctx.fillStyle = '#64748b';
  ctx.beginPath();
  ctx.ellipse(330, 230, 90, 30, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#3e2723'; // Espresso dark roast
  ctx.beginPath();
  ctx.ellipse(330, 232, 80, 24, 0, 0, Math.PI * 2);
  ctx.fill();

  // Text label on mug
  ctx.fillStyle = '#0284c7';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('MORNING COFFEE', 248, 330);
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('(NON-MEDICAL TEST CONTROL)', 230, 355);

  return canvas.toDataURL('image/png');
}

export const SAMPLE_CASES: SampleCase[] = [
  {
    id: 'case-cxr-consolidation',
    title: 'Chest X-Ray: Right Mid/Lower Lobe Opacity',
    modality: 'Radiography (X-Ray)',
    projection: 'Posteroanterior (PA) Erect',
    clinicalHistory: '64-year-old male presenting with acute 4-day productive cough, fever of 38.9°C, and pleuritic right-sided chest discomfort.',
    category: 'Thoracic',
    groundTruthHint: 'Air-space opacity consistent with consolidation in the right middle/lower zone with patent air bronchograms.',
    targetAnomalyBox: [450, 220, 680, 450],
    generateDataUrl: () => createChestXrayCanvas('consolidation'),
  },
  {
    id: 'case-cxr-pneumothorax',
    title: 'Chest X-Ray: Tension Pneumothorax Pattern',
    modality: 'Radiography (X-Ray)',
    projection: 'Posteroanterior (PA) Upright',
    clinicalHistory: '28-year-old tall athletic male with sudden severe dyspnea and sharp left pleuritic pain while resting.',
    category: 'Thoracic',
    groundTruthHint: 'Pronounced hyperlucency of the left hemithorax with peripheral absence of vascular markings and distinct visceral pleural line.',
    targetAnomalyBox: [220, 680, 650, 850],
    generateDataUrl: () => createChestXrayCanvas('pneumothorax'),
  },
  {
    id: 'case-cxr-normal',
    title: 'Chest X-Ray: Unremarkable Baseline',
    modality: 'Radiography (X-Ray)',
    projection: 'Posteroanterior (PA) Erect',
    clinicalHistory: '45-year-old female undergoing routine pre-operative cardiothoracic clearance for elective orthopedic procedure.',
    category: 'Thoracic',
    groundTruthHint: 'Clear bilateral lung fields without focal consolidation, pneumothorax, or pleural effusion; normal cardiothoracic silhouette.',
    generateDataUrl: () => createChestXrayCanvas('normal'),
  },
  {
    id: 'case-brain-mri',
    title: 'Brain MRI: T2/FLAIR White Matter Lesion',
    modality: 'Magnetic Resonance Imaging (MRI)',
    projection: 'Axial T2-FLAIR',
    clinicalHistory: '34-year-old female presenting with subacute optic neuritis, transient paresthesias of the right upper extremity, and gait ataxia.',
    category: 'Neuro',
    groundTruthHint: 'Periventricular hyperintense oval focus along the callososeptal interface consistent with demyelinating plaque pattern (Dawson finger appearance).',
    targetAnomalyBox: [350, 320, 480, 450],
    generateDataUrl: () => createBrainMriCanvas(),
  },
  {
    id: 'case-abdominal-ct',
    title: 'Abdominal CT: Renal Parenchymal Mass',
    modality: 'Computed Tomography (CT)',
    projection: 'Axial Contrast-Enhanced (Portal Venous)',
    clinicalHistory: '58-year-old male undergoing workup for painless gross hematuria and dull right flank fullness.',
    category: 'Abdominal',
    groundTruthHint: 'Hypoattenuating exophytic lesion originating from the posterior cortex of the right kidney.',
    targetAnomalyBox: [580, 220, 750, 360],
    generateDataUrl: () => createAbdominalCtCanvas(),
  },
  {
    id: 'case-dermoscopy',
    title: 'Dermoscopy: Atypical Melanocytic Lesion',
    modality: 'Dermoscopy (Epiluminescence Microscopy)',
    projection: 'Contact Polarized Surface',
    clinicalHistory: '42-year-old male with an evolving pigmented macule on the upper thoracic back noting color changes and border irregularity.',
    category: 'Dermatology',
    groundTruthHint: 'Asymmetric lesion displaying color variegation (brown, black, blue-white veil) and atypical peripheral pigment network/streaks.',
    targetAnomalyBox: [360, 360, 640, 640],
    generateDataUrl: () => createDermoscopyCanvas(),
  },
  {
    id: 'case-control-coffee',
    title: 'Non-Medical Test Control: Coffee Mug',
    modality: 'Visible Light Photography (Non-Medical)',
    projection: 'Desktop Tabletop Perspective',
    clinicalHistory: 'Control test image: intentionally uploaded non-medical photograph to rigorously assess Quality Failure Handling and refusal to fabricate diagnostic findings.',
    category: 'Control',
    groundTruthHint: 'Non-biomedical object. Must trigger Quality Failure handling in Section 1 and refuse to speculate on clinical anomalies.',
    generateDataUrl: () => createCoffeeCupControlCanvas(),
  },
];
