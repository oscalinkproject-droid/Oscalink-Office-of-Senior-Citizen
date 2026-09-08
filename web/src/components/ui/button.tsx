import { ReactNode } from "react";
import { m } from "framer-motion";

interface ButtonProps {
  children: ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
}

export function Button({ 
  children, 
  variant = "primary", 
  className = "", 
  disabled,
  type = "button",
  onClick,
}: ButtonProps) {
  const baseStyles = "px-8 py-4 font-headline font-bold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 group";
  
  const variants = {
    primary: "bg-primary text-on-primary hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] shadow-[0_0_15px_rgba(59,130,246,0.3)]",
    secondary: "bg-surface-high backdrop-blur-xl border border-outline-variant/30 text-foreground hover:bg-surface-highest",
    outline: "border border-outline/20 text-foreground hover:bg-surface-high hover:border-outline/40",
    ghost: "text-outline hover:text-primary hover:bg-surface-high"
  };

  return (
    <m.button 
      type={type}
      className={`${baseStyles} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      disabled={disabled}
      onClick={onClick}
      whileHover={!disabled ? { scale: 1.02 } : undefined}
      whileTap={!disabled ? { scale: 0.98 } : undefined}
    >
      {children}
    </m.button>
  );
}
