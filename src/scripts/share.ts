function generateMemeImage(): HTMLCanvasElement | null {
  const result = window.__QUIZ_RESULT__;
  if (!result) return null;

  const data = window.__QUIZ_DATA__;
  const archetype = data.archetypes[result.archetypeKey];
  if (!archetype) return null;

  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = '#0f1117';
  ctx.fillRect(0, 0, 1200, 630);

  // Subtle border
  ctx.strokeStyle = '#2a2e3d';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 1198, 628);

  // Draw radar watermark (subtle, bottom-right)
  drawMiniRadar(ctx, result.scores, 960, 400, 160);

  // Icon
  ctx.font = '72px serif';
  ctx.textAlign = 'left';
  ctx.fillText(archetype.icon, 60, 160);

  // Archetype name
  ctx.font = 'bold 56px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#e8e6e1';
  ctx.textAlign = 'left';
  ctx.fillText(archetype.name, 60, 250);

  // Tagline
  ctx.font = 'italic 28px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#c9493b';
  ctx.fillText(`"${archetype.tagline}"`, 60, 300);

  // Active lens vignette if any
  const vignetteEl = document.getElementById('lens-vignette')!;
  const activeLens = vignetteEl.dataset.activeLens;
  if (activeLens && !vignetteEl.classList.contains('hidden')) {
    const lens = data.lenses[activeLens];
    if (lens) {
      ctx.font = '18px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#9a978f';
      ctx.fillText(`As seen by ${lens.name}:`, 60, 370);

      const vignette = lens.vignettes[result.archetypeKey] || '';
      ctx.font = 'italic 20px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#e8e6e1';
      wrapText(ctx, vignette, 60, 405, 700, 28);
    }
  }

  // Footer
  ctx.font = '16px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#9a978f';
  ctx.textAlign = 'left';
  ctx.fillText('patriotometer.com', 60, 590);

  return canvas;
}

function drawMiniRadar(
  ctx: CanvasRenderingContext2D,
  scores: Record<string, number>,
  cx: number,
  cy: number,
  radius: number
) {
  const axes = ['economic', 'social', 'authority', 'nationalism', 'pragmatism'];
  const n = axes.length;

  // Grid rings (very subtle)
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
    ctx.strokeStyle = 'rgba(42, 46, 61, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Data polygon
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
  ctx.fillStyle = 'rgba(201, 73, 59, 0.15)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(201, 73, 59, 0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(' ');
  let line = '';
  let currentY = y;

  for (const word of words) {
    const test = line + word + ' ';
    if (ctx.measureText(test).width > maxWidth && line !== '') {
      ctx.fillText(line.trim(), x, currentY);
      line = word + ' ';
      currentY += lineHeight;
      if (currentY > 570) break; // Don't overflow into footer
    } else {
      line = test;
    }
  }
  if (line.trim()) ctx.fillText(line.trim(), x, currentY);
}

document.getElementById('share-btn')?.addEventListener('click', () => {
  const canvas = generateMemeImage();
  if (!canvas) return;

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'patriotometer-result.png';
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
});

export {};
