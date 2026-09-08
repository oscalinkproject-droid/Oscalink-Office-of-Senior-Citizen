'use client';

import { m, AnimatePresence, type Variants, LazyMotion, domMax } from "framer-motion";
import { ReactNode } from 'react';

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const }
  },
  exit: { 
    opacity: 0, 
    y: -10,
    transition: { duration: 0.2 }
  }
};

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const }
  }
};

export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const }
  }
};

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: { duration: 0.2 }
  }
};

export const slideInRight: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }
  },
  exit: { 
    opacity: 0, 
    x: 20,
    transition: { duration: 0.2 }
  }
};

export interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <LazyMotion features={domMax}>
      <m.div
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
        className={className}
      >
        {children}
      </m.div>
    </LazyMotion>
  );
}

export function AnimatedList({ 
  children, 
  className,
  delay = 0.08 
}: { 
  children: ReactNode; 
  className?: string;
  delay?: number;
}) {
  const customStagger: Variants = {
    initial: {},
    animate: {
      transition: {
        staggerChildren: delay,
        delayChildren: 0.1
      }
    }
  };

  return (
    <m.div
      initial="initial"
      animate="animate"
      variants={customStagger}
      className={className}
    >
      {children}
    </m.div>
  );
}

export function AnimatedListItem({ 
  children, 
  className 
}: { 
  children: ReactNode; 
  className?: string;
}) {
  return (
    <m.div
      variants={staggerItem}
      className={className}
    >
      {children}
    </m.div>
  );
}

export function AnimatedModal({ 
  isOpen, 
  children 
}: { 
  isOpen: boolean; 
  children: ReactNode;
}) {
  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </m.div>
      )}
    </AnimatePresence>
  );
}

export function AnimatedDialog({ 
  isOpen, 
  children 
}: { 
  isOpen: boolean; 
  children: ReactNode;
}) {
  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]"
        >
          <m.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {children}
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}

export function ScaleButton({ 
  children, 
  className = '',
  onClick,
  disabled,
  type = 'button',
}: { 
  children: ReactNode; 
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}) {
  return (
    <m.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className={className}
    >
      {children}
    </m.button>
  );
}

export function ScaleCard({ 
  children, 
  className = '',
  onClick,
}: { 
  children: ReactNode; 
  className?: string;
  onClick?: () => void;
}) {
  return (
    <m.div
      onClick={onClick}
      whileHover={{ scale: 1.01, y: -2 }}
      whileTap={{ scale: 0.99 }}
      className={className}
    >
      {children}
    </m.div>
  );
}

export function AnimatedLink({ 
  href, 
  children, 
  className = '',
  onClick
}: { 
  href: string; 
  children: ReactNode; 
  className?: string;
  onClick?: () => void;
}) {
  return (
    <m.div
      whileHover={{ scale: 1.02, x: 4 }}
      whileTap={{ scale: 0.98 }}
    >
      <a href={href} onClick={onClick} className={className}>
        {children}
      </a>
    </m.div>
  );
}
