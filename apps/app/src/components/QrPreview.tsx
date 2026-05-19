import qrcode from 'qrcode-generator';
import { useMemo } from 'react';

export interface QrDesign {
  foregroundColor?: string;
  backgroundColor?: string;
  gradient?: { from: string; to: string; angle?: number } | null;
  eyeStyle?: 'square' | 'rounded' | 'circle';
  eyeColor?: string | null;
  dotStyle?: 'square' | 'rounded' | 'circle';
  logoUrl?: string | null;
  logoSize?: number;
  margin?: number;
  errorCorrection?: 'L' | 'M' | 'Q' | 'H';
}

interface Props {
  data: string;
  design?: QrDesign;
  size?: number;
}

function isMarker(row: number, col: number, count: number) {
  if (row < 7 && col < 7) return true;
  if (row < 7 && col >= count - 7) return true;
  if (row >= count - 7 && col < 7) return true;
  return false;
}

export function QrPreview({ data, design = {}, size = 320 }: Props) {
  const fg = design.foregroundColor || '#0a0e27';
  const bg = design.backgroundColor || '#ffffff';
  const eyeStyle = design.eyeStyle || 'rounded';
  const dotStyle = design.dotStyle || 'rounded';
  const margin = Math.max(0, design.margin ?? 4);
  const ecLevel = design.errorCorrection || 'H';
  const gradient = design.gradient;
  const logoUrl = design.logoUrl;
  const logoSize = design.logoSize ?? 0.2;

  const svg = useMemo(() => {
    if (!data) return null;
    try {
      const qr = qrcode(0, ecLevel);
      qr.addData(data || 'preview', 'Byte');
      qr.make();
      const count: number = qr.getModuleCount();
      const total = count + margin * 2;
      const moduleSize = size / total;
      const gradId = 'g-' + Math.abs(hashCode(data)).toString(36);
      const fgRef = gradient ? `url(#${gradId})` : fg;

      const dataCells: string[] = [];
      const eyePositions: Array<{ x: number; y: number }> = [];
      for (let r = 0; r < count; r++) {
        for (let cc = 0; cc < count; cc++) {
          if (!qr.isDark(r, cc)) continue;
          if (isMarker(r, cc, count)) continue;
          const x = (cc + margin) * moduleSize;
          const y = (r + margin) * moduleSize;
          if (dotStyle === 'circle') {
            dataCells.push(
              `<circle cx="${x + moduleSize / 2}" cy="${y + moduleSize / 2}" r="${moduleSize / 2}" />`,
            );
          } else if (dotStyle === 'rounded') {
            dataCells.push(
              `<rect x="${x}" y="${y}" width="${moduleSize}" height="${moduleSize}" rx="${moduleSize * 0.25}" />`,
            );
          } else {
            dataCells.push(`<rect x="${x}" y="${y}" width="${moduleSize}" height="${moduleSize}" />`);
          }
        }
      }

      const eyeCorners: Array<[number, number]> = [
        [0, 0],
        [0, count - 7],
        [count - 7, 0],
      ];
      let eyeSvg = '';
      const eyeColor = design.eyeColor || fgRef;
      for (const [r, cc] of eyeCorners) {
        const x = (cc + margin) * moduleSize;
        const y = (r + margin) * moduleSize;
        const outer = moduleSize * 7;
        const inner = moduleSize * 3;
        const innerOff = moduleSize * 2;

        if (eyeStyle === 'circle') {
          const cx = x + outer / 2;
          const cy = y + outer / 2;
          eyeSvg += `<path fill="${eyeColor}" fill-rule="evenodd" d="M ${cx} ${cy} m -${outer / 2} 0 a ${outer / 2} ${outer / 2} 0 1 0 ${outer} 0 a ${outer / 2} ${outer / 2} 0 1 0 -${outer} 0 z M ${cx} ${cy} m -${outer / 2 - moduleSize} 0 a ${outer / 2 - moduleSize} ${outer / 2 - moduleSize} 0 1 1 ${outer - moduleSize * 2} 0 a ${outer / 2 - moduleSize} ${outer / 2 - moduleSize} 0 1 1 -${outer - moduleSize * 2} 0 z" />`;
          eyeSvg += `<circle cx="${cx}" cy="${cy}" r="${inner / 2}" fill="${eyeColor}" />`;
        } else if (eyeStyle === 'rounded') {
          const rr = moduleSize * 1.4;
          eyeSvg += `<path fill="${eyeColor}" fill-rule="evenodd" d="M ${x} ${y + rr} a ${rr} ${rr} 0 0 1 ${rr} -${rr} h ${outer - rr * 2} a ${rr} ${rr} 0 0 1 ${rr} ${rr} v ${outer - rr * 2} a ${rr} ${rr} 0 0 1 -${rr} ${rr} h -${outer - rr * 2} a ${rr} ${rr} 0 0 1 -${rr} -${rr} z M ${x + moduleSize} ${y + rr} v ${outer - rr * 2} a ${rr - moduleSize} ${rr - moduleSize} 0 0 0 ${rr - moduleSize} ${rr - moduleSize} h ${outer - rr * 2} a ${rr - moduleSize} ${rr - moduleSize} 0 0 0 ${rr - moduleSize} -${rr - moduleSize} v -${outer - rr * 2} a ${rr - moduleSize} ${rr - moduleSize} 0 0 0 -${rr - moduleSize} -${rr - moduleSize} h -${outer - rr * 2} a ${rr - moduleSize} ${rr - moduleSize} 0 0 0 -${rr - moduleSize} ${rr - moduleSize} z" />`;
          eyeSvg += `<rect x="${x + innerOff}" y="${y + innerOff}" width="${inner}" height="${inner}" rx="${moduleSize * 0.6}" fill="${eyeColor}" />`;
        } else {
          eyeSvg += `<path fill="${eyeColor}" fill-rule="evenodd" d="M ${x} ${y} h ${outer} v ${outer} h -${outer} z M ${x + moduleSize} ${y + moduleSize} v ${outer - moduleSize * 2} h ${outer - moduleSize * 2} v -${outer - moduleSize * 2} z" />`;
          eyeSvg += `<rect x="${x + innerOff}" y="${y + innerOff}" width="${inner}" height="${inner}" fill="${eyeColor}" />`;
        }
      }

      let defs = '';
      if (gradient) {
        defs = `<defs><linearGradient id="${gradId}" gradientTransform="rotate(${gradient.angle ?? 90}, 0.5, 0.5)"><stop offset="0%" stop-color="${gradient.from}"/><stop offset="100%" stop-color="${gradient.to}"/></linearGradient></defs>`;
      }

      let logo = '';
      if (logoUrl) {
        const lSize = size * Math.min(0.32, Math.max(0.1, logoSize));
        const lx = (size - lSize) / 2;
        const ly = (size - lSize) / 2;
        const pad = 4;
        logo = `<rect x="${lx - pad}" y="${ly - pad}" width="${lSize + pad * 2}" height="${lSize + pad * 2}" rx="6" fill="${bg}" /><image href="${logoUrl}" x="${lx}" y="${ly}" width="${lSize}" height="${lSize}" preserveAspectRatio="xMidYMid meet" />`;
      }

      return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="geometricPrecision">${defs}<rect width="${size}" height="${size}" fill="${bg}" /><g fill="${fgRef}">${dataCells.join('')}</g>${eyeSvg}${logo}</svg>`;
    } catch (e) {
      console.error(e);
      return null;
    }
  }, [data, fg, bg, eyeStyle, dotStyle, margin, ecLevel, gradient, logoUrl, logoSize, size, design.eyeColor]);

  if (!svg) return <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>QR preview unavailable</div>;
  return <div dangerouslySetInnerHTML={{ __html: svg }} />;
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

export function downloadSvg(filename: string, svgString: string) {
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadPng(filename: string, svgString: string, size = 1024): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('No canvas context'));
      ctx.drawImage(img, 0, 0, size, size);
      canvas.toBlob((b) => {
        if (!b) return reject(new Error('PNG conversion failed'));
        const pngUrl = URL.createObjectURL(b);
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = filename;
        a.click();
        setTimeout(() => {
          URL.revokeObjectURL(pngUrl);
          URL.revokeObjectURL(url);
        }, 1000);
        resolve();
      }, 'image/png');
    };
    img.onerror = reject;
    img.src = url;
  });
}

export function buildQrSvgString(data: string, design: QrDesign, size = 1024): string {
  const tempDiv = document.createElement('div');
  // Render via the same component logic
  const node = document.createElement('div');
  tempDiv.appendChild(node);
  // Reuse by invoking QrPreview as a string - easier path: replicate inline rendering
  // To keep things simple, just render the React component to string at the API render endpoint.
  // For client-side fallback, we'll generate a simplified version:
  const qr = qrcode(0, design.errorCorrection || 'H');
  qr.addData(data || 'preview', 'Byte');
  qr.make();
  const count = qr.getModuleCount();
  const margin = design.margin ?? 4;
  const total = count + margin * 2;
  const moduleSize = size / total;
  const fg = design.foregroundColor || '#0a0e27';
  const bg = design.backgroundColor || '#ffffff';
  let cells = '';
  for (let r = 0; r < count; r++) {
    for (let cc = 0; cc < count; cc++) {
      if (!qr.isDark(r, cc)) continue;
      const x = (cc + margin) * moduleSize;
      const y = (r + margin) * moduleSize;
      cells += `<rect x="${x}" y="${y}" width="${moduleSize}" height="${moduleSize}" rx="${moduleSize * 0.2}" />`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="${bg}" /><g fill="${fg}">${cells}</g></svg>`;
}
