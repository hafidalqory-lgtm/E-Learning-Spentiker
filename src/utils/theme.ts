import React from 'react';
import { AppSettings, BackgroundThemeType } from '../types';

export interface ThemePreset {
  id: BackgroundThemeType;
  name: string;
  description: string;
  previewClass: string;
}

export const BACKGROUND_THEME_PRESETS: ThemePreset[] = [
  {
    id: 'gradient-blue',
    name: 'Biru ANBK Klasik (Modern Navy)',
    description: 'Warna standar resmi ANBK SMP Negeri 3 Kertek (Navy & Deep Blue)',
    previewClass: 'from-slate-900 via-blue-950 to-slate-900',
  },
  {
    id: 'gradient-midnight',
    name: 'Cyber Midnight (Gelap Pekat)',
    description: 'Nuansa hitam pekat dengan aksen slate minimalis',
    previewClass: 'from-black via-slate-950 to-neutral-950',
  },
  {
    id: 'gradient-emerald',
    name: 'Emerald Edukasi (Hijau & Teal)',
    description: 'Nuansa hijau tosca segar dan menenangkan untuk konsentrasi ujian',
    previewClass: 'from-emerald-950 via-teal-950 to-slate-950',
  },
  {
    id: 'gradient-indigo',
    name: 'Royal Indigo (Ungu Biru)',
    description: 'Kombinasi ungu malam dan indigo mewah berwibawa',
    previewClass: 'from-indigo-950 via-slate-950 to-purple-950',
  },
  {
    id: 'solid-dark',
    name: 'Solid Slate Dark (Polos)',
    description: 'Warna latar solid tanpa gradasi untuk kenyamanan mata maksimal',
    previewClass: 'bg-slate-950',
  },
  {
    id: 'custom-image',
    name: 'Gambar Kustom (Unggah / URL)',
    description: 'Foto gedung sekolah, laboratorium komputer, atau grafis kustom',
    previewClass: 'from-blue-900 via-slate-800 to-slate-900',
  },
];

export function getBackgroundStyle(settings: Partial<AppSettings>): {
  className: string;
  style?: React.CSSProperties;
} {
  const theme = settings.backgroundTheme || 'gradient-blue';

  if (theme === 'custom-image' && settings.customBackgroundImageUrl) {
    return {
      className: 'bg-slate-950 text-slate-100 bg-cover bg-center bg-no-repeat relative',
      style: {
        backgroundImage: `url(${settings.customBackgroundImageUrl})`,
      },
    };
  }

  switch (theme) {
    case 'gradient-midnight':
      return {
        className: 'bg-gradient-to-br from-black via-slate-950 to-neutral-950 text-slate-100',
      };
    case 'gradient-emerald':
      return {
        className: 'bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-950 text-slate-100',
      };
    case 'gradient-indigo':
      return {
        className: 'bg-gradient-to-br from-indigo-950 via-slate-950 to-purple-950 text-slate-100',
      };
    case 'solid-dark':
      return {
        className: 'bg-slate-950 text-slate-100',
      };
    case 'gradient-blue':
    default:
      return {
        className: 'bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-slate-100',
      };
  }
}

/**
 * Reads an image file as a compressed Base64 Data URL
 */
export function readFileAsDataUrl(file: File, maxSizePx = 1600): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Berkas harus berupa gambar (.png, .jpg, .jpeg, .svg, .webp)'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;

      // If svg or small enough, return as is
      if (file.type.includes('svg') || file.size < 500 * 1024) {
        resolve(result);
        return;
      }

      // Resize larger raster images via HTML5 canvas to keep IndexedDB fast
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSizePx || height > maxSizePx) {
          if (width > height) {
            height = Math.round((height * maxSizePx) / width);
            width = maxSizePx;
          } else {
            width = Math.round((width * maxSizePx) / height);
            height = maxSizePx;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(result);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => resolve(result);
      img.src = result;
    };
    reader.onerror = () => reject(new Error('Gagal membaca berkas gambar.'));
    reader.readAsDataURL(file);
  });
}
