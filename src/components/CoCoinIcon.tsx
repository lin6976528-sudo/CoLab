import React from 'react';

interface CoCoinIconProps {
  size?: number;
  className?: string;
  isLow?: boolean;
}

export const CoCoinIcon: React.FC<CoCoinIconProps> = ({ size = 20, className = '', isLow = false }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} transition-transform duration-300 ${isLow ? 'animate-pulse' : ''}`}
    >
      <defs>
        {/* Outer Gold Rim Gradient */}
        <linearGradient id="coin-gold-rim" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF2A3" />
          <stop offset="25%" stopColor="#E5BA42" />
          <stop offset="75%" stopColor="#B58816" />
          <stop offset="100%" stopColor="#7A5600" />
        </linearGradient>

        {/* Shiny Royal Blue Face Gradient (matches background) */}
        <radialGradient id="coin-blue-face" cx="45%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#4A75C7" />
          <stop offset="60%" stopColor="#254C91" />
          <stop offset="100%" stopColor="#152F63" />
        </radialGradient>

        {/* Yellow Letter/Shape Gradient */}
        <linearGradient id="coin-yellow-fill" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFF275" />
          <stop offset="100%" stopColor="#F9C611" />
        </linearGradient>

        {/* Subtle drop shadow/elevation effect */}
        <filter id="coin-inner-shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="1" dy="2" stdDeviation="1" floodColor="#0d1f3d" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Outer Coin Shadow */}
      <circle cx="50" cy="51.5" r="47" fill="#000000" opacity="0.15" />

      {/* Gold Outer Rim (Ring bezel) */}
      <circle cx="50" cy="50" r="48" fill="url(#coin-gold-rim)" />
      
      {/* Inner Rim Ridge for 3D look */}
      <circle cx="50" cy="50" r="45" fill="#5F4200" opacity="0.4" />
      <circle cx="50" cy="50" r="44.2" fill="url(#coin-gold-rim)" />

      {/* Metallic Blue Main Face */}
      <circle cx="50" cy="50" r="41.5" fill="url(#coin-blue-face)" />

      <g filter="url(#coin-inner-shadow)">
        {/* GOLD RERATION UNDER "C" (gives the outer golden boundary to the yellow C) */}
        <path
          d="M 53 30 A 20 20 0 1 0 53 70"
          fill="none"
          stroke="url(#coin-gold-rim)"
          strokeWidth="15"
          strokeLinecap="round"
        />

        {/* YELLOW "C" ON TOP */}
        <path
          d="M 53 30 A 20 20 0 1 0 53 70"
          fill="none"
          stroke="url(#coin-yellow-fill)"
          strokeWidth="11"
          strokeLinecap="round"
        />

        {/* GOLD UNDER "o" (smiley circle) */}
        <circle cx="66" cy="50" r="13" fill="url(#coin-gold-rim)" />

        {/* YELLOW "o" ON TOP */}
        <circle cx="66" cy="50" r="10.2" fill="url(#coin-yellow-fill)" />

        {/* SMILEY FACE DETAILS */}
        {/* Left eye dot */}
        <circle cx="62.5" cy="48" r="1.3" fill="#6B4D00" />
        {/* Right eye dot */}
        <circle cx="69.5" cy="48" r="1.3" fill="#6B4D00" />
        {/* Tiny nose/smiley curve */}
        <path
          d="M 64 52.2 Q 66 55.4 68 52.2"
          fill="none"
          stroke="#6B4D00"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
};
