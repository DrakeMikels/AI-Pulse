import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Logo({ className, size = "md" }: LogoProps) {
  const sizeMap = {
    sm: { svg: 24, text: "text-lg" },
    md: { svg: 32, text: "text-xl" },
    lg: { svg: 40, text: "text-2xl" },
  };

  const { svg, text } = sizeMap[size];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <svg 
        width={svg} 
        height={svg} 
        viewBox="0 0 32 32" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="text-primary"
      >
        {/* Brain circuit design */}
        <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" />
        
        {/* Pulse wave */}
        <path 
          d="M6 16h4l2-4 4 8 2-4h8" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        
        {/* Circuit nodes */}
        <circle cx="10" cy="16" r="1.5" fill="currentColor" />
        <circle cx="16" cy="16" r="1.5" fill="currentColor" />
        <circle cx="22" cy="16" r="1.5" fill="currentColor" />
        
        {/* AI connection lines */}
        <path 
          d="M10 10l6 6M22 10l-6 6M10 22l6-6M22 22l-6-6" 
          stroke="currentColor" 
          strokeWidth="1.5" 
          strokeLinecap="round" 
          strokeOpacity="0.6"
        />
      </svg>
      <span className={cn("font-bold tracking-tight", text)}>AI Pulse</span>
    </div>
  );
} 