export function hexToRgba(hex: string, alpha = 0.5) {
  const h = hex.replace('#', '');
  const bigint = parseInt(h.length === 3
    ? h.split('').map(c => c + c).join('')
    : h.slice(0, 6), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
