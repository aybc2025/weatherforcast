const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const FONT = '12px Heebo, system-ui, sans-serif';

// Line chart on a canvas. Time axis runs left→right like the numbers it carries (a declared RTL choice).
export function drawLine(canvas, labels, values, { min, max, color, fmt = v => v, fill = true } = {}) {
  const dpr = Math.max(1, window.devicePixelRatio || 1), W = canvas.clientWidth, H = canvas.clientHeight;
  if (!W || !values.length) return;
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.direction = 'ltr';
  const pad = { l: 40, r: 12, t: 22, b: 26 }, w = W - pad.l - pad.r, h = H - pad.t - pad.b;
  const lo = min ?? Math.min(...values), hi = max ?? Math.max(...values), span = hi - lo || 1;
  const X = i => pad.l + (values.length === 1 ? w / 2 : (w * i) / (values.length - 1));
  const Y = v => pad.t + h - ((v - lo) / span) * h;
  ctx.font = FONT; ctx.lineWidth = 1; ctx.strokeStyle = css('--grid'); ctx.fillStyle = css('--muted');
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  for (let i = 0; i <= 3; i++) {
    const y = pad.t + (h * i) / 3; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
    ctx.fillText(String(fmt(Math.round(hi - (span * i) / 3))), 0, y);
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  for (let i = 0; i < labels.length; i += 3) ctx.fillText(labels[i], X(i), H - 6);
  const line = new Path2D(); values.forEach((v, i) => (i ? line.lineTo(X(i), Y(v)) : line.moveTo(X(i), Y(v))));
  if (fill) {
    const g = ctx.createLinearGradient(0, pad.t, 0, pad.t + h); g.addColorStop(0, color + '40'); g.addColorStop(1, color + '00');
    const area = new Path2D(line); area.lineTo(X(values.length - 1), pad.t + h); area.lineTo(X(0), pad.t + h); area.closePath();
    ctx.fillStyle = g; ctx.fill(area);
  }
  ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke(line);
  const peak = values.indexOf(Math.max(...values));
  ctx.fillStyle = css('--sun'); ctx.beginPath(); ctx.arc(X(peak), Y(values[peak]), 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = css('--ink'); ctx.textBaseline = 'bottom'; ctx.fillText(String(fmt(Math.round(values[peak]))), X(peak), Y(values[peak]) - 8);
}
export const chartColors = () => ({ c1: css('--chart-1'), c2: css('--chart-2') });
