interface Question {
  id: string;
  text: string;
  type: string;
  axis: string;
  direction: number;
  weight: number;
}

interface ArchetypeData {
  name: string;
  tagline: string;
  icon: string;
  description: string;
  axes: Record<string, [number, number]>;
}

interface QuizData {
  questions: Question[];
  archetypes: Record<string, ArchetypeData>;
  lenses: Record<string, { name: string; icon: string; vignettes: Record<string, string> }>;
}

declare global {
  interface Window {
    __QUIZ_DATA__: QuizData;
    __QUIZ_RESULT__: { archetypeKey: string; scores: Record<string, number> } | null;
  }
}

const data = window.__QUIZ_DATA__;
const questions = data.questions;

let currentIndex = 0;
const answers: number[] = new Array(questions.length).fill(50);

const introEl = document.getElementById('intro')!;
const quizEl = document.getElementById('quiz')!;
const resultsEl = document.getElementById('results')!;
const startBtn = document.getElementById('start-btn')!;
const prevBtn = document.getElementById('prev-btn') as HTMLButtonElement;
const nextBtn = document.getElementById('next-btn')!;
const slider = document.getElementById('slider') as HTMLInputElement;
const questionText = document.getElementById('question-text')!;
const progressText = document.getElementById('progress-text')!;
const progressPct = document.getElementById('progress-pct')!;
const progressBar = document.getElementById('progress-bar')!;

function showSection(section: 'intro' | 'quiz' | 'results') {
  introEl.classList.toggle('hidden', section !== 'intro');
  quizEl.classList.toggle('hidden', section !== 'quiz');
  resultsEl.classList.toggle('hidden', section !== 'results');
  window.scrollTo({ top: 0 });
}

function renderQuestion() {
  const q = questions[currentIndex];
  questionText.textContent = q.text;
  slider.value = String(answers[currentIndex]);
  progressText.textContent = `Question ${currentIndex + 1} of ${questions.length}`;
  const pct = Math.round(((currentIndex) / questions.length) * 100);
  progressPct.textContent = `${pct}%`;
  progressBar.style.width = `${pct}%`;
  prevBtn.disabled = currentIndex === 0;
  prevBtn.style.opacity = currentIndex === 0 ? '0.4' : '1';
  nextBtn.textContent = currentIndex === questions.length - 1 ? 'See Results' : 'Next';
}

function computeScores(): Record<string, number> {
  const axisTotals: Record<string, { sum: number; count: number }> = {};

  questions.forEach((q, i) => {
    if (!axisTotals[q.axis]) axisTotals[q.axis] = { sum: 0, count: 0 };
    // Normalize 0-100 slider to 0-1
    let normalized = answers[i] / 100;
    // If direction is -1, invert the score
    if (q.direction === -1) normalized = 1 - normalized;
    axisTotals[q.axis].sum += normalized * q.weight;
    axisTotals[q.axis].count += q.weight;
  });

  const scores: Record<string, number> = {};
  for (const [axis, { sum, count }] of Object.entries(axisTotals)) {
    scores[axis] = sum / count;
  }
  return scores;
}

function findArchetype(scores: Record<string, number>): string {
  let bestKey = 'centrist';
  let bestScore = -Infinity;

  for (const [key, archetype] of Object.entries(data.archetypes)) {
    let fitness = 0;
    for (const [axis, [low, high]] of Object.entries(archetype.axes)) {
      const val = scores[axis] ?? 0.5;
      const mid = (low + high) / 2;
      const range = (high - low) / 2;
      // How well does the score fit this archetype's range?
      if (val >= low && val <= high) {
        // Inside range: higher fitness the closer to center
        fitness += 1 - Math.abs(val - mid) / (range || 0.5);
      } else {
        // Outside range: penalty proportional to distance
        const dist = val < low ? low - val : val - high;
        fitness -= dist * 2;
      }
    }
    if (fitness > bestScore) {
      bestScore = fitness;
      bestKey = key;
    }
  }

  return bestKey;
}

function showResults() {
  const scores = computeScores();
  const archetypeKey = findArchetype(scores);
  window.__QUIZ_RESULT__ = { archetypeKey, scores };

  const archetype = data.archetypes[archetypeKey];
  document.getElementById('result-icon')!.textContent = archetype.icon;
  document.getElementById('result-name')!.textContent = archetype.name;
  document.getElementById('result-tagline')!.textContent = `"${archetype.tagline}"`;
  document.getElementById('result-description')!.textContent = archetype.description;

  drawRadar(scores);
  renderLensButtons(archetypeKey);
  showSection('results');
}

function drawRadar(scores: Record<string, number>) {
  const canvas = document.getElementById('radar-canvas') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = 320 * dpr;
  canvas.height = 320 * dpr;
  ctx.scale(dpr, dpr);

  const cx = 160, cy = 160, radius = 120;
  const axes = ['economic', 'social', 'authority', 'nationalism', 'pragmatism'];
  const labels = ['Economic', 'Social', 'Authority', 'Nationalism', 'Pragmatism'];
  const n = axes.length;

  ctx.clearRect(0, 0, 320, 320);

  // Draw grid rings
  for (let ring = 1; ring <= 4; ring++) {
    const r = (radius / 4) * ring;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(42, 46, 61, 0.8)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Draw axis lines
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    ctx.strokeStyle = 'rgba(42, 46, 61, 0.8)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Draw data polygon
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const idx = i % n;
    const angle = (Math.PI * 2 * idx) / n - Math.PI / 2;
    const val = scores[axes[idx]] ?? 0.5;
    const r = val * radius;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(201, 73, 59, 0.25)';
  ctx.fill();
  ctx.strokeStyle = '#c9493b';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw data points
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const val = scores[axes[i]] ?? 0.5;
    const r = val * radius;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#c9493b';
    ctx.fill();
  }

  // Draw labels
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = '#9a978f';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const labelR = radius + 18;
    const x = cx + Math.cos(angle) * labelR;
    const y = cy + Math.sin(angle) * labelR;
    ctx.fillText(labels[i], x, y);
  }
}

function renderLensButtons(archetypeKey: string) {
  const container = document.getElementById('lens-buttons')!;
  container.innerHTML = '';

  for (const [lensKey, lens] of Object.entries(data.lenses)) {
    const btn = document.createElement('button');
    btn.className = 'px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer';
    btn.style.backgroundColor = 'var(--color-surface)';
    btn.style.border = '1px solid var(--color-border)';
    btn.style.color = 'var(--color-text-muted)';
    btn.textContent = `${lens.icon} ${lens.name}`;
    btn.dataset.lens = lensKey;

    btn.addEventListener('click', () => {
      // Deactivate all
      container.querySelectorAll('button').forEach((b) => {
        (b as HTMLElement).style.backgroundColor = 'var(--color-surface)';
        (b as HTMLElement).style.borderColor = 'var(--color-border)';
        (b as HTMLElement).style.color = 'var(--color-text-muted)';
      });

      // Check if clicking same lens (toggle off)
      const vignetteEl = document.getElementById('lens-vignette')!;
      if (vignetteEl.dataset.activeLens === lensKey) {
        vignetteEl.classList.add('hidden');
        vignetteEl.dataset.activeLens = '';
        return;
      }

      // Activate this one
      btn.style.backgroundColor = 'var(--color-accent)';
      btn.style.borderColor = 'var(--color-accent)';
      btn.style.color = 'white';

      const vignette = lens.vignettes[archetypeKey];
      document.getElementById('lens-label')!.textContent = lens.name;
      document.getElementById('lens-text')!.textContent = vignette || 'No vignette available.';
      vignetteEl.classList.remove('hidden');
      vignetteEl.dataset.activeLens = lensKey;
      vignetteEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    container.appendChild(btn);
  }
}

// Event listeners
startBtn.addEventListener('click', () => {
  showSection('quiz');
  renderQuestion();
});

slider.addEventListener('input', () => {
  answers[currentIndex] = parseInt(slider.value);
});

prevBtn.addEventListener('click', () => {
  if (currentIndex > 0) {
    currentIndex--;
    renderQuestion();
  }
});

nextBtn.addEventListener('click', () => {
  answers[currentIndex] = parseInt(slider.value);
  if (currentIndex < questions.length - 1) {
    currentIndex++;
    renderQuestion();
  } else {
    showResults();
  }
});

document.getElementById('retake-btn')!.addEventListener('click', () => {
  currentIndex = 0;
  answers.fill(50);
  window.__QUIZ_RESULT__ = null;
  document.getElementById('lens-vignette')!.classList.add('hidden');
  showSection('intro');
});

export {};
