import React from 'react';

interface CoLabLogoProps {
  size?: number;
  className?: string;
}

export const CoLabLogo: React.FC<CoLabLogoProps> = ({ size = 32, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} transition-all duration-300 pointer-events-none select-none`}
    >
      <defs>
        {/* Metallic Bevel Gradient */}
        <linearGradient id="metalBevel" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="30%" stopColor="#cbd5e1" />
          <stop offset="70%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>

        {/* Shiny Blue Flask Collar */}
        <linearGradient id="flaskBlue" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#0252cf" />
        </linearGradient>

        {/* Light Green for Bulb */}
        <linearGradient id="lightbulbGreen" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#15803d" />
        </linearGradient>

        {/* Gold Gear Gradient */}
        <linearGradient id="gearYellow" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#eab308" />
        </linearGradient>

        {/* Shadow filter for 3D outline look */}
        <filter id="logoShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#0f172a" floodOpacity="0.15" />
        </filter>
      </defs>

      {/* Main Base Shadow */}
      <path
        d="M 100,20 
           L 115,20 
           Q 120,20 120,25 
           Q 113,38 113,50 
           Q 113,85 174,152 
           Q 181,160 174,168 
           Q 168,174 158,174 
           L 42,174 
           Q 32,174 26,168 
           Q 19,160 26,152 
           Q 87,85 87,50 
           Q 87,38 80,25 
           Q 80,20 85,20 
           Z"
        fill="#000000"
        opacity="0.1"
        transform="translate(0, 3)"
      />

      {/* 1. OUTER METALLIC FRAME (The shiny silver edge) */}
      <path
        d="M 100,20 
           L 115,20 
           Q 120,20 120,25 
           Q 113,38 113,50 
           C 113,85 110,115 174,152 
           Q 181,160 174,168 
           Q 168,174 158,174 
           L 42,174 
           Q 32,174 26,168 
           Q 19,160 26,152 
           C 90,115 87,85 87,50 
           Q 87,38 80,25 
           Q 80,20 85,20 
           Z"
        fill="url(#metalBevel)"
        filter="url(#logoShadow)"
      />

      {/* 2. INNER VIBRANT BLUE OUTLINE */}
      <path
        d="M 100,23 
           L 113,23 
           Q 117,23 117,27 
           Q 110,39 110,51 
           C 110,84 107,113 169,149 
           Q 175,156 169,163 
           Q 164,168 155,168 
           L 45,168 
           Q 36,168 31,163 
           Q 25,156 31,149 
           C 93,113 90,84 90,51 
           Q 90,39 83,27 
           Q 83,23 87,23 
           Z"
        fill="url(#flaskBlue)"
      />

      {/* 3. FLASK LIQUID / BACKGROUND CANVAS (Beautiful White) */}
      <path
        d="M 100,28 
           L 110,28 
           Q 112,28 112,31 
           Q 105,42 105,53 
           C 105,82 102,110 161,144 
           Q 166,150 161,156 
           Q 157,161 149,161 
           L 51,161 
           Q 43,161 39,156 
           Q 34,150 39,144 
           C 98,110 95,82 95,53 
           Q 95,42 88,31 
           Q 88,28 90,28 
           Z"
        fill="#FFFFFF"
      />

      {/* 4. CUTE EYE GOGGLES & SMILE (In Center of Flask) */}
      <g className="cute-face">
        {/* Smile Arc */}
        <path
          d="M 94,111 Q 100,117 106,111"
          stroke="#475569"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Goggles Glass Loop Left & Right */}
        {/* Left lens */}
        <rect
          x="80"
          y="85"
          width="18"
          height="18"
          rx="9"
          fill="#f1f5f9"
          stroke="#475569"
          strokeWidth="3.5"
        />
        {/* Right lens */}
        <rect
          x="102"
          y="85"
          width="18"
          height="18"
          rx="9"
          fill="#f1f5f9"
          stroke="#475569"
          strokeWidth="3.5"
        />
        {/* Bridge */}
        <line
          x1="97"
          y1="94"
          x2="103"
          y2="94"
          stroke="#475569"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Eyes inside goggles */}
        <circle cx="89" cy="94" r="3" fill="#475569" />
        <circle cx="111" cy="94" r="3" fill="#475569" />
        {/* Cute eye reflections */}
        <circle cx="88" cy="93" r="0.8" fill="#FFFFFF" />
        <circle cx="110" cy="93" r="0.8" fill="#FFFFFF" />
      </g>

      {/* 5. TOP GREEN MOLECULE */}
      <g className="top-molecule">
        {/* Connection lines */}
        <line x1="93" y1="56" x2="100" y2="46" stroke="#22c55e" strokeWidth="2.5" />
        <line x1="107" y1="56" x2="100" y2="46" stroke="#22c55e" strokeWidth="2.5" />
        
        {/* Spheres */}
        <circle cx="100" cy="46" r="4.5" fill="#22c55e" stroke="#15803d" strokeWidth="1.5" />
        <circle cx="91" cy="58" r="4.5" fill="#22c55e" stroke="#15803d" strokeWidth="1.5" />
        <circle cx="109" cy="58" r="4.5" fill="#22c55e" stroke="#15803d" strokeWidth="1.5" />
      </g>

      {/* 6. BOTTOM-LEFT GREEN LIGHTBULB WITH INTEGRATED GEAR AND NODES */}
      <g className="bottom-left-ideas">
        {/* Side Connecting Node */}
        <line x1="68" y1="140" x2="57" y2="147" stroke="#22c55e" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="56" cy="148" r="4" fill="#22c55e" stroke="#15803d" strokeWidth="1.5" />

        {/* Bulb Outline Base */}
        <path
          d="M 68,138 
             A 12,12 0 0 1 80,123 
             C 86,123 88,127 88,131
             C 88,136 84,140 82,143
             L 82,148 
             Q 82,150 80,150
             L 70,150
             Q 68,150 68,148
             Z"
          fill="url(#lightbulbGreen)"
          stroke="#166534"
          strokeWidth="1.5"
        />
        {/* Metallic socket base */}
        <rect x="71" y="150" width="8" height="3" rx="1.5" fill="#94a3b8" stroke="#475569" strokeWidth="1" />
        <rect x="72.5" y="153" width="5" height="2" rx="1" fill="#475569" />

        {/* Small White Gear Inside Lightbulb */}
        <circle cx="75" cy="135" r="3.5" fill="none" stroke="#FFFFFF" strokeWidth="1.5" />
        {/* Spokes representing gear */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          return (
            <line
              key={i}
              x1={75 + Math.cos(rad) * 3}
              y1={135 + Math.sin(rad) * 3}
              x2={75 + Math.cos(rad) * 4.8}
              y2={135 + Math.sin(rad) * 4.8}
              stroke="#FFFFFF"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          );
        })}
      </g>

      {/* 7. MIDDLE-BOTTOM YELLOW GEAR */}
      <g className="yellow-gear">
        <circle cx="95" cy="142" r="6" fill="url(#gearYellow)" stroke="#a16207" strokeWidth="1.5" />
        {/* Spokes representing gear */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          return (
            <line
              key={i}
              x1={95 + Math.cos(rad) * 5.5}
              y1={142 + Math.sin(rad) * 5.5}
              x2={95 + Math.cos(rad) * 8.5}
              y2={142 + Math.sin(rad) * 8.5}
              stroke="#a16207"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          );
        })}
        <circle cx="95" cy="142" r="2.2" fill="#FFFFFF" stroke="#a16207" strokeWidth="1" />
      </g>

      {/* 8. BOTTOM-RIGHT COLLABORATING PEOPLE CHATTING */}
      <g className="collaborating-people">
        {/* Left Person (Blue Silhouette) */}
        <g>
          {/* Head */}
          <circle cx="120" cy="133" r="3.5" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="1.2" />
          {/* Body/Arms */}
          <path
            d="M 114,154 
               L 117,143 
               C 117,141 119,139 121,139 
               C 123,139 125,141 125,143 
               L 122,154"
            fill="#3b82f6"
            stroke="#1d4ed8"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Reaching Arm to Table */}
          <path
            d="M 120,143 Q 124,143 128,145"
            stroke="#1d4ed8"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        </g>

        {/* Right Person (Blue Silhouette) */}
        <g>
          {/* Head */}
          <circle cx="140" cy="133" r="3.5" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="1.2" />
          {/* Body/Arms */}
          <path
            d="M 146,154 
               L 143,143 
               C 143,141 141,139 139,139 
               C 137,139 135,141 135,143 
               L 138,154"
            fill="#3b82f6"
            stroke="#1d4ed8"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Reaching Arm to Table */}
          <path
            d="M 140,143 Q 136,143 132,145"
            stroke="#1d4ed8"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        </g>

        {/* Tiny Table */}
        <line x1="126" y1="147" x2="134" y2="147" stroke="#475569" strokeWidth="2.2" strokeLinecap="round" />
        <line x1="130" y1="147" x2="130" y2="154" stroke="#475569" strokeWidth="1.8" />
      </g>

      {/* 9. THE ROBOTIC ARM (Overlapping and looping on the top-right / side) */}
      <g className="robotic-arm font-medium text-xs">
        {/* Primary joint on collar */}
        <rect
          x="117"
          y="42"
          width="13"
          height="8"
          rx="2.5"
          fill="url(#metalBevel)"
          stroke="#475569"
          strokeWidth="1.5"
          transform="rotate(22 121 44)"
        />
        
        {/* Upper arm segment coming outside */}
        <path
          d="M 125,44 
             C 135,44 148,47 151,57 
             C 154,67 151,77 146,84"
          fill="none"
          stroke="#007acc"
          strokeWidth="7"
          strokeLinecap="round"
        />
        {/* Metallic inside line of upper arm */}
        <path
          d="M 125,44 
             C 135,44 148,47 151,57 
             C 154,67 151,77 146,84"
          fill="none"
          stroke="url(#metalBevel)"
          strokeWidth="3.2"
          strokeLinecap="round"
        />

        {/* Elbow Joint */}
        <circle cx="145" cy="85" r="6" fill="url(#metalBevel)" stroke="#475569" strokeWidth="1.5" />
        <circle cx="145" cy="85" r="2.5" fill="#0252cf" />

        {/* Lower arm segment with connector */}
        <line x1="144" y1="88" x2="131" y2="108" stroke="#007acc" strokeWidth="6.5" strokeLinecap="round" />
        <line x1="144" y1="88" x2="131" y2="108" stroke="url(#metalBevel)" strokeWidth="3" strokeLinecap="round" />

        {/* Mechanical Grip Pin touching molecule */}
        <circle cx="129" cy="111" r="3.2" fill="#22c55e" stroke="#15803d" strokeWidth="1.2" />
        <line x1="131" y1="108" x2="129" y2="111" stroke="#475569" strokeWidth="2" />
      </g>
    </svg>
  );
};
