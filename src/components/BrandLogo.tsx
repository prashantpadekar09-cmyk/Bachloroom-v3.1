import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  variant?: "full" | "mark";
  iconClassName?: string;
  wordmarkClassName?: string;
};

const BrandLogo = ({
  className,
  variant = "full",
  iconClassName,
  wordmarkClassName,
}: BrandLogoProps) => {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative flex items-center justify-center">
        <svg
          width="40"
          height="40"
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cn("drop-shadow-sm", iconClassName)}
        >
          <defs>
            {/* Gold → Sapphire gradient */}
            <linearGradient id="logoGoldBlue" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#D4A843" />
              <stop offset="45%"  stopColor="#C19535" />
              <stop offset="100%" stopColor="#2E4A7A" />
            </linearGradient>
            {/* Solid gold for inner details */}
            <linearGradient id="logoGoldInner" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#E5C78B" />
              <stop offset="100%" stopColor="#C5A059" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Main House Shape — Gold → Blue */}
          <path
            d="M20 6L6 18V32C6 33.1046 6.89543 34 8 34H32C33.1046 34 34 33.1046 34 32V18L20 6Z"
            stroke="url(#logoGoldBlue)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Centre line — gold */}
          <path
            d="M20 14V34"
            stroke="url(#logoGoldInner)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* Inner roof accent — gold */}
          <path
            d="M14 22L20 18L26 22"
            stroke="url(#logoGoldInner)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Door — blue tint */}
          <rect
            x="16" y="26" width="8" height="8" rx="2"
            stroke="url(#logoGoldBlue)"
            strokeWidth="1.5"
          />
        </svg>
      </div>

      {variant === "full" && (
        <div className={cn("flex flex-col -space-y-1", wordmarkClassName)}>
          <span className="font-display text-xl font-bold tracking-tight text-foreground leading-none">
            Bachlo<span className="text-gradient">Room</span>
          </span>
          <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-muted-foreground/80">
            Premium Stays
          </span>
        </div>
      )}
    </div>
  );
};

export default BrandLogo;
