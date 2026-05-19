import qrcode from 'qrcode-generator';

export interface QrDesign {
  /** Foreground color of QR pattern */
  foregroundColor?: string;
  /** Background color */
  backgroundColor?: string;
  /** Gradient for foreground (overrides foregroundColor) */
  gradient?: { from: string; to: string; angle?: number } | null;
  /** Eye shape style */
  eyeStyle?: 'square' | 'rounded' | 'circle';
  /** Eye inner color (separate from eye border) */
  eyeColor?: string;
  /** Dot shape */
  dotStyle?: 'square' | 'rounded' | 'circle';
  /** Logo data URL (PNG/SVG base64) or absolute URL */
  logoUrl?: string | null;
  /** Logo size as fraction of QR (0.0–0.30 recommended) */
  logoSize?: number;
  /** Logo padding (white box around logo) */
  logoPadding?: number;
  /** Margin around QR in modules */
  margin?: number;
  /** Error correction level */
  errorCorrection?: 'L' | 'M' | 'Q' | 'H';
}

const DEFAULTS: Required<Omit<QrDesign, 'gradient' | 'logoUrl' | 'eyeColor'>> & {
  gradient: QrDesign['gradient'];
  logoUrl: string | null;
  eyeColor: string | null;
} = {
  foregroundColor: '#0a0e27',
  backgroundColor: '#ffffff',
  gradient: null,
  eyeStyle: 'rounded',
  eyeColor: null,
  dotStyle: 'rounded',
  logoUrl: null,
  logoSize: 0.2,
  logoPadding: 2,
  margin: 4,
  errorCorrection: 'H',
};

function isPositionMarker(row: number, col: number, count: number): boolean {
  // Top-left eye 7x7
  if (row < 7 && col < 7) return true;
  // Top-right eye
  if (row < 7 && col >= count - 7) return true;
  // Bottom-left eye
  if (row >= count - 7 && col < 7) return true;
  return false;
}

function isPositionMarkerOuter(row: number, col: number, count: number): boolean {
  if (!isPositionMarker(row, col, count)) return false;
  // The outer frame of the 7x7 (ring)
  const inTopLeft = row < 7 && col < 7;
  const inTopRight = row < 7 && col >= count - 7;
  const inBotLeft = row >= count - 7 && col < 7;

  if (inTopLeft) {
    if (row === 0 || row === 6 || col === 0 || col === 6) return true;
    return false;
  }
  if (inTopRight) {
    const cc = col - (count - 7);
    if (row === 0 || row === 6 || cc === 0 || cc === 6) return true;
    return false;
  }
  if (inBotLeft) {
    const rr = row - (count - 7);
    if (rr === 0 || rr === 6 || col === 0 || col === 6) return true;
    return false;
  }
  return false;
}

function isPositionMarkerInner(row: number, col: number, count: number): boolean {
  if (!isPositionMarker(row, col, count)) return false;
  const inTopLeft = row < 7 && col < 7;
  const inTopRight = row < 7 && col >= count - 7;
  const inBotLeft = row >= count - 7 && col < 7;

  if (inTopLeft) {
    return row >= 2 && row <= 4 && col >= 2 && col <= 4;
  }
  if (inTopRight) {
    const cc = col - (count - 7);
    return row >= 2 && row <= 4 && cc >= 2 && cc <= 4;
  }
  if (inBotLeft) {
    const rr = row - (count - 7);
    return rr >= 2 && rr <= 4 && col >= 2 && col <= 4;
  }
  return false;
}

/**
 * Render a QR code as an SVG string with the requested design.
 *
 * Pure JS, Workers-compatible, no DOM dependency.
 */
export function renderQrSvg(data: string, design: QrDesign = {}, sizePx = 1024): string {
  const d = { ...DEFAULTS, ...design };
  if (!data) throw new Error('QR data required');

  const qr = qrcode(0, d.errorCorrection);
  qr.addData(data, 'Byte');
  qr.make();
  const count: number = qr.getModuleCount();

  const margin = Math.max(0, Math.floor(d.margin));
  const totalModules = count + margin * 2;
  const moduleSize = sizePx / totalModules;
  const radius = moduleSize / 2;

  const gradientId = 'qr-grad-' + Math.random().toString(36).slice(2, 9);
  const useGradient = !!d.gradient;
  const fgRef = useGradient ? `url(#${gradientId})` : d.foregroundColor;
  const eyeRef = d.eyeColor || fgRef;

  let defs = '';
  if (useGradient && d.gradient) {
    const a = d.gradient.angle ?? 90;
    defs = `<defs><linearGradient id="${gradientId}" gradientTransform="rotate(${a}, 0.5, 0.5)"><stop offset="0%" stop-color="${d.gradient.from}"/><stop offset="100%" stop-color="${d.gradient.to}"/></linearGradient></defs>`;
  }

  const moduleCells: string[] = [];
  const eyeOuterCells: string[] = [];
  const eyeInnerCells: string[] = [];

  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (!qr.isDark(row, col)) continue;
      const x = (col + margin) * moduleSize;
      const y = (row + margin) * moduleSize;

      if (isPositionMarker(row, col, count)) {
        if (isPositionMarkerInner(row, col, count)) {
          eyeInnerCells.push(JSON.stringify({ x, y }));
        } else {
          eyeOuterCells.push(JSON.stringify({ x, y }));
        }
        continue;
      }

      // Regular data module
      if (d.dotStyle === 'circle') {
        moduleCells.push(
          `<circle cx="${x + radius}" cy="${y + radius}" r="${radius}" />`,
        );
      } else if (d.dotStyle === 'rounded') {
        const rr = moduleSize * 0.25;
        moduleCells.push(
          `<rect x="${x}" y="${y}" width="${moduleSize}" height="${moduleSize}" rx="${rr}" ry="${rr}" />`,
        );
      } else {
        moduleCells.push(`<rect x="${x}" y="${y}" width="${moduleSize}" height="${moduleSize}" />`);
      }
    }
  }

  // Eyes
  const eyeShapes = renderEyes(count, margin, moduleSize, d.eyeStyle, eyeRef);

  const logoSvg = renderLogo(d, sizePx);

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${sizePx}" height="${sizePx}" viewBox="0 0 ${sizePx} ${sizePx}" shape-rendering="geometricPrecision">
  ${defs}
  <rect width="${sizePx}" height="${sizePx}" fill="${d.backgroundColor}" />
  <g fill="${fgRef}">${moduleCells.join('')}</g>
  ${eyeShapes}
  ${logoSvg}
</svg>`;
  return svg;
}

function renderEyes(
  count: number,
  margin: number,
  moduleSize: number,
  style: 'square' | 'rounded' | 'circle',
  fill: string,
): string {
  const positions: Array<{ row: number; col: number }> = [
    { row: 0, col: 0 },
    { row: 0, col: count - 7 },
    { row: count - 7, col: 0 },
  ];
  const out: string[] = [];

  for (const { row, col } of positions) {
    const x = (col + margin) * moduleSize;
    const y = (row + margin) * moduleSize;
    const outerSize = moduleSize * 7;
    const innerSize = moduleSize * 3;
    const innerOffset = moduleSize * 2;

    if (style === 'circle') {
      const cx = x + outerSize / 2;
      const cy = y + outerSize / 2;
      // Outer ring as path (annulus)
      out.push(
        `<path fill="${fill}" fill-rule="evenodd" d="M ${cx} ${cy} m -${outerSize / 2} 0 a ${outerSize / 2} ${outerSize / 2} 0 1 0 ${outerSize} 0 a ${outerSize / 2} ${outerSize / 2} 0 1 0 -${outerSize} 0 z M ${cx} ${cy} m -${outerSize / 2 - moduleSize} 0 a ${outerSize / 2 - moduleSize} ${outerSize / 2 - moduleSize} 0 1 1 ${outerSize - moduleSize * 2} 0 a ${outerSize / 2 - moduleSize} ${outerSize / 2 - moduleSize} 0 1 1 -${outerSize - moduleSize * 2} 0 z" />`,
      );
      out.push(
        `<circle cx="${cx}" cy="${cy}" r="${innerSize / 2}" fill="${fill}" />`,
      );
    } else if (style === 'rounded') {
      const r = moduleSize * 1.4;
      out.push(
        `<path fill="${fill}" fill-rule="evenodd" d="M ${x} ${y + r} a ${r} ${r} 0 0 1 ${r} -${r} h ${outerSize - r * 2} a ${r} ${r} 0 0 1 ${r} ${r} v ${outerSize - r * 2} a ${r} ${r} 0 0 1 -${r} ${r} h -${outerSize - r * 2} a ${r} ${r} 0 0 1 -${r} -${r} z M ${x + moduleSize} ${y + r} v ${outerSize - r * 2} a ${r - moduleSize} ${r - moduleSize} 0 0 0 ${r - moduleSize} ${r - moduleSize} h ${outerSize - r * 2} a ${r - moduleSize} ${r - moduleSize} 0 0 0 ${r - moduleSize} -${r - moduleSize} v -${outerSize - r * 2} a ${r - moduleSize} ${r - moduleSize} 0 0 0 -${r - moduleSize} -${r - moduleSize} h -${outerSize - r * 2} a ${r - moduleSize} ${r - moduleSize} 0 0 0 -${r - moduleSize} ${r - moduleSize} z" />`,
      );
      const innerR = moduleSize * 0.6;
      out.push(
        `<rect x="${x + innerOffset}" y="${y + innerOffset}" width="${innerSize}" height="${innerSize}" rx="${innerR}" ry="${innerR}" fill="${fill}" />`,
      );
    } else {
      // Square
      out.push(
        `<path fill="${fill}" fill-rule="evenodd" d="M ${x} ${y} h ${outerSize} v ${outerSize} h -${outerSize} z M ${x + moduleSize} ${y + moduleSize} v ${outerSize - moduleSize * 2} h ${outerSize - moduleSize * 2} v -${outerSize - moduleSize * 2} z" />`,
      );
      out.push(
        `<rect x="${x + innerOffset}" y="${y + innerOffset}" width="${innerSize}" height="${innerSize}" fill="${fill}" />`,
      );
    }
  }
  return out.join('');
}

function renderLogo(d: ReturnType<typeof Object.assign> & Required<Omit<QrDesign, 'gradient' | 'logoUrl' | 'eyeColor'>> & { gradient: QrDesign['gradient']; logoUrl: string | null; eyeColor: string | null }, sizePx: number): string {
  if (!d.logoUrl) return '';
  const logoBoxSize = sizePx * Math.min(0.32, Math.max(0.1, d.logoSize));
  const x = (sizePx - logoBoxSize) / 2;
  const y = (sizePx - logoBoxSize) / 2;
  const pad = d.logoPadding * 2;
  return `
  <rect x="${x - pad}" y="${y - pad}" width="${logoBoxSize + pad * 2}" height="${logoBoxSize + pad * 2}" rx="8" ry="8" fill="${d.backgroundColor}" />
  <image href="${d.logoUrl}" x="${x}" y="${y}" width="${logoBoxSize}" height="${logoBoxSize}" preserveAspectRatio="xMidYMid meet" />`;
}
