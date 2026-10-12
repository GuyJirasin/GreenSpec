import React from 'react';

/**
 * Official Thai Government Garuda Emblem (ตราครุฑชั้นเครื่อง)
 * Vector SVG representation scaled for official government procurement documents (e-GP/TOR).
 * Standard height in formal notices is typically 1.5 cm to 3 cm.
 */
export default function ThaiGarudaEmblem({ height = 54, className = '', color = '#000000' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 160 160"
      height={height}
      className={className}
      fill={color}
      aria-label="ตราครุฑพ่าห์ หนังสือราชการไทย"
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      <g transform="translate(80, 80)">
        {/* Crown / Mongkut */}
        <path d="M 0,-72 L 5,-58 L 12,-56 L 7,-44 L 14,-42 L 5,-32 L 0,-34 L -5,-32 L -14,-42 L -7,-44 L -12,-56 L -5,-58 Z" />
        <circle cx="0" cy="-75" r="2.5" />
        <ellipse cx="0" cy="-36" rx="6" ry="2.5" />

        {/* Head and Beak */}
        <path d="M 0,-32 C 6,-32 9,-26 9,-20 C 9,-16 6,-14 3,-14 C 7,-11 8,-7 4,-4 C 1,-2 -1,-2 -4,-4 C -8,-7 -7,-11 -3,-14 C -6,-14 -9,-16 -9,-20 C -9,-26 -6,-32 0,-32 Z" />
        <path d="M 0,-18 L 4,-12 L 0,-8 L -4,-12 Z" />

        {/* Neck ornaments & Torso */}
        <path d="M -8,-10 C -12,-4 -14,8 -14,16 C -14,24 -8,32 0,35 C 8,32 14,24 14,16 C 14,8 12,-4 8,-10 C 4,-7 -4,-7 -8,-10 Z" />
        <ellipse cx="0" cy="12" rx="7" ry="9" fill="#ffffff" />
        <path d="M 0,3 C 3,3 5,7 5,12 C 5,17 3,21 0,21 C -3,21 -5,17 -5,12 C -5,7 -3,3 0,3 Z" />

        {/* Waist & Belt (Khat-bel) */}
        <path d="M -12,28 C -5,30 5,30 12,28 L 14,35 C 6,37 -6,37 -14,35 Z" />
        <circle cx="0" cy="32" r="3" />

        {/* Ceremonial Wings (Left & Right) */}
        {/* Right Wing */}
        <path d="M 10,-8 C 22,-20 40,-35 66,-38 C 72,-38 76,-33 70,-26 C 60,-15 48,-6 38,4 C 54,-4 68,-9 73,-5 C 77,-2 74,4 66,10 C 56,18 44,24 32,28 C 44,24 58,22 62,26 C 65,29 60,35 50,40 C 40,45 28,47 16,42 C 14,36 12,24 10,-8 Z" />
        <path d="M 42,-14 C 56,-26 64,-28 66,-26 C 68,-23 58,-12 46,-3 Z" />
        <path d="M 40,8 C 55,2 65,3 66,6 C 66,9 55,16 42,20 Z" />
        <path d="M 32,25 C 46,24 54,26 54,29 C 54,32 44,36 32,37 Z" />

        {/* Left Wing (Mirrored) */}
        <path d="M -10,-8 C -22,-20 -40,-35 -66,-38 C -72,-38 -76,-33 -70,-26 C -60,-15 -48,-6 -38,4 C -54,-4 -68,-9 -73,-5 C -77,-2 -74,4 -66,10 C -56,18 -44,24 -32,28 C -44,24 -58,22 -62,26 C -65,29 -60,35 -50,40 C -40,45 -28,47 -16,42 C -14,36 -12,24 -10,-8 Z" />
        <path d="M -42,-14 C -56,-26 -64,-28 -66,-26 C -68,-23 -58,-12 -46,-3 Z" />
        <path d="M -40,8 C -55,2 -65,3 -66,6 C -66,9 -55,16 -42,20 Z" />
        <path d="M -32,25 C -46,24 -54,26 -54,29 C -54,32 -44,36 -32,37 Z" />

        {/* Tail Feathers (Phang-hang) */}
        <path d="M 0,35 C 6,42 12,52 16,66 C 12,68 6,65 0,58 C -6,65 -12,68 -16,66 C -12,52 -6,42 0,35 Z" />
        <path d="M 5,42 C 14,48 24,56 28,68 C 24,70 18,66 12,58 Z" />
        <path d="M -5,42 C -14,48 -24,56 -28,68 C -24,70 -18,66 -12,58 Z" />

        {/* Powerful Talons / Claws */}
        <path d="M 12,38 C 18,44 26,48 30,56 C 26,58 20,54 16,48 L 14,58 L 10,56 L 10,42 Z" />
        <path d="M -12,38 C -18,44 -26,48 -30,56 C -26,58 -20,54 -16,48 L -14,58 L -10,56 L -10,42 Z" />
      </g>
    </svg>
  );
}
