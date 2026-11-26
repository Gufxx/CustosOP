export function NocturnalBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none select-none print:hidden"
    >
      {/* Pure Pitch Black in Dark Mode / Crisp Crystal Mist in Light Mode */}
      <div className="absolute inset-0 bg-[#F4F5F8] dark:bg-[#000000] transition-colors duration-300" />

      {/* Dark Mode: Sculpted Liquid-Glass Chromatic Dispersion S-Curve & Beveled Disc */}
      <svg
        className="hidden dark:block absolute inset-0 w-full h-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <defs>
          {/* Prismatic Chromatic Dispersion Gradient (White -> Cyan -> Cobalt -> Amber -> Crimson) */}
          <linearGradient id="prismRibbonA" x1="15%" y1="0%" x2="85%" y2="100%">
            <stop offset="0%" stopColor="#09090B" stopOpacity="0" />
            <stop offset="18%" stopColor="#E4E4E7" stopOpacity="0.92" />
            <stop offset="30%" stopColor="#38BDF8" stopOpacity="0.88" />
            <stop offset="42%" stopColor="#1E3A8A" stopOpacity="0.7" />
            <stop offset="56%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="68%" stopColor="#FACC15" stopOpacity="0.85" />
            <stop offset="80%" stopColor="#EF4444" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="prismRibbonB" x1="80%" y1="5%" x2="20%" y2="95%">
            <stop offset="0%" stopColor="#000000" stopOpacity="0" />
            <stop offset="22%" stopColor="#38BDF8" stopOpacity="0.75" />
            <stop offset="36%" stopColor="#FFFFFF" stopOpacity="0.98" />
            <stop offset="50%" stopColor="#A1A1AA" stopOpacity="0.35" />
            <stop offset="66%" stopColor="#F59E0B" stopOpacity="0.75" />
            <stop offset="78%" stopColor="#F43F5E" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="glassDiscFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#27272A" stopOpacity="0.55" />
            <stop offset="45%" stopColor="#09090B" stopOpacity="0.92" />
            <stop offset="100%" stopColor="#18181B" stopOpacity="0.75" />
          </linearGradient>

          <linearGradient id="glassDiscRim" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <stop offset="28%" stopColor="#38BDF8" stopOpacity="0.85" />
            <stop offset="52%" stopColor="#FACC15" stopOpacity="0.7" />
            <stop offset="76%" stopColor="#FB7185" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.18" />
          </linearGradient>

          <filter id="prismSoftGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="24" />
          </filter>
          <filter id="prismCrispGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>

        {/* Soft Chromatic Ambient Bloom behind main S-Curve */}
        <path
          d="M 860 -60 C 1020 160, 620 340, 820 560 C 1000 760, 640 840, 740 960"
          stroke="url(#prismRibbonA)"
          strokeWidth="120"
          strokeLinecap="round"
          opacity="0.28"
          filter="url(#prismSoftGlow)"
        />

        {/* Tilted Sculpted Glass Disc (Top-Center / Right) */}
        <g transform="translate(860 95) rotate(-26)">
          <ellipse
            cx="0"
            cy="0"
            rx="168"
            ry="118"
            fill="url(#glassDiscFill)"
            stroke="url(#glassDiscRim)"
            strokeWidth="5.5"
          />
          <ellipse
            cx="-4"
            cy="-4"
            rx="156"
            ry="107"
            stroke="rgba(255,255,255,0.22)"
            strokeWidth="1.5"
          />
        </g>

        {/* Primary Sculpted Liquid-Glass S-Curve Ribbon */}
        <path
          d="M 920 -50 C 1080 180, 600 320, 830 550 C 1040 760, 650 850, 740 970"
          stroke="url(#prismRibbonA)"
          strokeWidth="76"
          strokeLinecap="round"
          opacity="0.88"
        />

        {/* Secondary Offset Specular Dispersion Highlight Ribbon */}
        <path
          d="M 945 -40 C 1105 190, 635 325, 860 555 C 1065 765, 680 855, 765 975"
          stroke="url(#prismRibbonB)"
          strokeWidth="22"
          strokeLinecap="round"
          opacity="0.9"
          filter="url(#prismCrispGlow)"
        />

        {/* Razor-Sharp Inner Specular White Glass Crest */}
        <path
          d="M 918 -48 C 1075 182, 598 320, 828 550 C 1036 760, 648 850, 738 970"
          stroke="rgba(255,255,255,0.82)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Subtle Secondary Edge Dispersion Ribbon on Left Side */}
        <path
          d="M 210 920 C 160 660, 380 510, 220 260"
          stroke="url(#prismRibbonB)"
          strokeWidth="44"
          strokeLinecap="round"
          opacity="0.24"
          filter="url(#prismSoftGlow)"
        />
        <path
          d="M 210 920 C 160 660, 380 510, 220 260"
          stroke="url(#glassDiscRim)"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.35"
        />
      </svg>

      {/* Light Mode: Subtle Crystal Refractive Arcs */}
      <svg
        className="dark:hidden absolute inset-0 w-full h-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <defs>
          <linearGradient id="lightPrism" x1="15%" y1="0%" x2="85%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
            <stop offset="28%" stopColor="#93C5FD" stopOpacity="0.35" />
            <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <stop offset="72%" stopColor="#FDE68A" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M 920 -50 C 1080 180, 600 320, 830 550 C 1040 760, 650 850, 740 970"
          stroke="url(#lightPrism)"
          strokeWidth="84"
          strokeLinecap="round"
        />
        <g transform="translate(860 95) rotate(-26)">
          <ellipse
            cx="0"
            cy="0"
            rx="168"
            ry="118"
            fill="rgba(255,255,255,0.45)"
            stroke="rgba(148,163,184,0.35)"
            strokeWidth="3"
          />
        </g>
      </svg>
    </div>
  );
}
