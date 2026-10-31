import React, { useState, useEffect } from 'react';
import { getByIdFromStore, STORES } from '../../db/indexedDB';
import { AppSettings } from '../../types';

interface SchoolLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  customLogoUrl?: string;
  customSchoolName?: string;
  customSubtext?: string;
  textColor?: 'dark' | 'light';
}

export const SchoolLogo: React.FC<SchoolLogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
  customLogoUrl,
  customSchoolName,
  customSubtext,
  textColor = 'dark',
}) => {
  const [activeLogo, setActiveLogo] = useState<string>(customLogoUrl || '');
  const [activeName, setActiveName] = useState<string>(customSchoolName || '');
  const [activeSubtext, setActiveSubtext] = useState<string>(customSubtext || '');

  useEffect(() => {
    if (customLogoUrl !== undefined) {
      setActiveLogo(customLogoUrl);
    }
    if (customSchoolName !== undefined) {
      setActiveName(customSchoolName);
    }
    if (customSubtext !== undefined) {
      setActiveSubtext(customSubtext);
    }

    // If not supplied, attempt to load from saved app settings
    const fetchSavedSettings = () => {
      getByIdFromStore<AppSettings>(STORES.APP_SETTINGS, 'default').then((settings) => {
        if (settings) {
          if (customLogoUrl === undefined) {
            setActiveLogo(settings.useDefaultLogo ? '' : settings.customLogoUrl || '');
          }
          if (!customSchoolName && settings.schoolName) {
            setActiveName(settings.schoolName);
          }
          if (!customSubtext && settings.schoolSubtext) {
            setActiveSubtext(settings.schoolSubtext);
          }
        }
      }).catch(() => {});
    };

    if (customLogoUrl === undefined || !customSchoolName) {
      fetchSavedSettings();
    }

    const handleSettingsUpdated = (e: any) => {
      const s = e.detail as AppSettings;
      if (s) {
        if (customLogoUrl === undefined) {
          setActiveLogo(s.useDefaultLogo ? '' : s.customLogoUrl || '');
        }
        if (!customSchoolName && s.schoolName) {
          setActiveName(s.schoolName);
        }
        if (!customSubtext && s.schoolSubtext) {
          setActiveSubtext(s.schoolSubtext);
        }
      } else {
        fetchSavedSettings();
      }
    };

    window.addEventListener('app_settings_updated', handleSettingsUpdated);
    return () => window.removeEventListener('app_settings_updated', handleSettingsUpdated);
  }, [customLogoUrl, customSchoolName, customSubtext]);

  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20',
  };

  const displayName = activeName || 'SMP Negeri 3 Kertek';
  const displaySubtext = activeSubtext || 'Kabupaten Wonosobo \u2022 Jawa Tengah';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Official Emblem or Custom Uploaded Logo */}
      <div className={`relative shrink-0 ${sizeMap[size]} flex items-center justify-center`}>
        {activeLogo ? (
          <img
            src={activeLogo}
            alt={displayName}
            className="w-full h-full object-contain drop-shadow"
            onError={() => setActiveLogo('')}
          />
        ) : (
          <svg
            viewBox="0 0 120 130"
            className="w-full h-full drop-shadow-md"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Shield Outer Border */}
            <path
              d="M60 5 L110 24 V65 C110 95 60 122 60 122 C60 122 10 95 10 65 V24 L60 5 Z"
              fill="#0F2B5C"
              stroke="#F59E0B"
              strokeWidth="3.5"
            />
            {/* Shield Inner Infill */}
            <path
              d="M60 12 L102 28 V64 C102 89 60 114 60 114 C60 114 18 89 18 64 V28 L60 12 Z"
              fill="#1E3A8A"
            />

            {/* Central Sunburst / Golden Laurel Ring */}
            <circle cx="60" cy="58" r="28" fill="#1D4ED8" stroke="#FBBF24" strokeWidth="2" strokeDasharray="3 2" />

            {/* Open Book of Knowledge */}
            <path
              d="M60 62 C50 56 38 57 32 60 V76 C38 73 50 72 60 77 C70 72 82 73 88 76 V60 C82 57 70 56 60 62 Z"
              fill="#FFFFFF"
              stroke="#CBD5E1"
              strokeWidth="1.2"
            />
            <path d="M60 62 V77" stroke="#0F2B5C" strokeWidth="1.5" />

            {/* Golden Torch / Obor of Learning */}
            <path d="M57 58 L54 70 H66 L63 58 Z" fill="#D97706" />
            {/* Flame */}
            <path
              d="M60 38 C56 44 54 48 56 53 C58 56 62 56 64 53 C66 48 64 44 60 38 Z"
              fill="#F59E0B"
            />
            <path
              d="M60 42 C58 45 57 48 58 51 C59 53 61 53 62 51 C63 48 62 45 60 42 Z"
              fill="#EF4444"
            />

            {/* Five Stars of Pancasila */}
            <polygon points="60,20 62,25 67,25 63,28 65,33 60,30 55,33 57,28 53,25 58,25" fill="#FDE047" />

            {/* Ribbon at Bottom */}
            <path
              d="M20 98 Q60 110 100 98 L104 105 Q60 118 16 105 Z"
              fill="#F59E0B"
              stroke="#B45309"
              strokeWidth="1"
            />
            <text
              x="60"
              y="107"
              textAnchor="middle"
              fill="#0F2B5C"
              fontSize="7"
              fontWeight="bold"
              letterSpacing="0.8"
            >
              SMPN 3 KERTEK
            </text>
          </svg>
        )}
      </div>

      {showText && (
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-extrabold tracking-tight text-base sm:text-lg leading-tight uppercase font-sans ${
                textColor === 'light' ? 'text-white' : 'text-blue-950'
              }`}
            >
              {displayName}
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                textColor === 'light'
                  ? 'bg-blue-500/20 text-blue-200 border-blue-400/30'
                  : 'bg-blue-100 text-blue-800 border-blue-200'
              }`}
            >
              ANBK
            </span>
          </div>
          <span
            className={`text-xs font-medium tracking-tight ${
              textColor === 'light' ? 'text-blue-200/80' : 'text-slate-500'
            }`}
          >
            {displaySubtext}
          </span>
        </div>
      )}
    </div>
  );
};
