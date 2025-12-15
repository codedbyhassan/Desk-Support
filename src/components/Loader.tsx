import React from 'react';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  fullPage?: boolean;
}

const Loader: React.FC<LoaderProps> = ({ size = 'md', fullPage = false }) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  const containerClasses = fullPage 
    ? 'flex items-center justify-center min-h-screen w-full'
    : 'flex items-center justify-center min-h-60 w-full';

  return (
    <div className={containerClasses}>
      <style>{`
        @keyframes traffic-spin {
          100% {
            transform: rotate(180deg);
          }
        }

        @keyframes traffic-pulse {
          0%, 100% {
            opacity: 0.7;
          }
          50% {
            opacity: 1;
          }
        }

        .traffic-loader {
          animation: traffic-spin 1s linear infinite;
        }

        .traffic-loader::before {
          animation: traffic-pulse 1.5s ease-in-out infinite;
        }
      `}</style>
      
      <div className={`${sizeClasses[size]} relative traffic-loader`}>
        {/* Outer rotating ring */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 50 50"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Top dot */}
          <circle cx="25" cy="5" r="3" fill="hsl(var(--chart-blue))" />
          {/* Right dot */}
          <circle cx="45" cy="25" r="3" fill="hsl(var(--chart-blue))" />
          {/* Bottom dot */}
          <circle cx="25" cy="45" r="3" fill="hsl(var(--chart-blue))" />
          {/* Left dot */}
          <circle cx="5" cy="25" r="3" fill="hsl(var(--chart-blue))" />
        </svg>

        {/* Inner rotating ring */}
        <div className="absolute inset-0 traffic-loader-inner" style={{
          animation: 'traffic-spin 1.5s linear infinite reverse'
        }}>
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 50 50"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Conic gradient segments */}
            <circle
              cx="25"
              cy="25"
              r="18"
              fill="none"
              stroke="hsl(var(--chart-blue-light))"
              strokeWidth="2"
              strokeDasharray="17 60"
              opacity="0.8"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default Loader;

