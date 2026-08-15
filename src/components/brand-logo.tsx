import React from "react";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  textClassName?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className,
  size = "md",
  showText = true,
  textClassName,
}) => {
  const iconSize =
    size === "sm"
      ? "h-6 w-6 rounded-md"
      : size === "lg"
        ? "h-9 w-9 rounded-xl"
        : size === "xl"
          ? "h-14 w-14 rounded-2xl"
          : "h-7 w-7 rounded-lg";

  const textSize =
    size === "sm"
      ? "text-sm font-semibold"
      : size === "lg"
        ? "text-xl font-bold"
        : size === "xl"
          ? "text-2xl font-extrabold tracking-tight"
          : "text-base font-semibold tracking-tight";

  return (
    <div className={cn("flex items-center gap-2.5 select-none", className)}>
      <div className={cn("relative shrink-0 flex items-center justify-center", iconSize)}>
        <img
          src="/logo.png"
          alt="Zen Planner Logo"
          className="h-full w-full object-contain drop-shadow-xs"
        />
      </div>
      {showText && (
        <span
          className={cn(
            "bg-gradient-to-r from-foreground via-foreground to-foreground/80 bg-clip-text text-foreground",
            textSize,
            textClassName
          )}
        >
          Zen Planner
        </span>
      )}
    </div>
  );
};
