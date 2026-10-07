import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
  };

  const svgSizes = {
    sm: 18,
    md: 22,
    lg: 26,
  };

  const currentSvgSize = svgSizes[size];

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* Precision Geometric Logo Icon */}
      <div
        className={`${iconSizes[size]} rounded-xl bg-zinc-950 flex items-center justify-center text-white shrink-0 shadow-xs border border-zinc-800`}
      >
        <svg
          width={currentSvgSize}
          height={currentSvgSize}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Neural Node Points */}
          <circle cx="12" cy="4" r="2" fill="white" />
          <circle cx="5" cy="18" r="2" fill="white" />
          <circle cx="19" cy="18" r="2" fill="white" />
          <circle cx="12" cy="12" r="2.25" fill="#6366f1" />

          {/* Precision Intersecting Neural Vector Paths */}
          <path
            d="M12 6.5V9.75"
            stroke="white"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <path
            d="M6.5 16.5L10.25 13.25"
            stroke="white"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <path
            d="M17.5 16.5L13.75 13.25"
            stroke="white"
            strokeWidth="1.75"
            strokeLinecap="round"
          />

          {/* Outer Triangular Grounding Frame */}
          <path
            d="M6.8 18H17.2"
            stroke="#a1a1aa"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeDasharray="2 2"
          />
        </svg>
      </div>

      {/* Brand Typographic Wordmark */}
      {showText && (
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="font-bold tracking-tight text-zinc-900 text-sm">
              AdaptiveLearn
            </span>
            <span className="font-semibold text-[10px] tracking-wider uppercase px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200">
              AI
            </span>
          </div>
          <span className="text-[10px] text-zinc-500 font-medium tracking-wide mt-1">
            Agentic RAG & Faculty Intelligence
          </span>
        </div>
      )}
    </div>
  );
};
