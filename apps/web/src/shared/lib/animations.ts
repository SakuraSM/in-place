import type { Variants, Transition } from 'framer-motion';

export const springTransition: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 30,
};

export const softSpring: Transition = {
  type: 'spring',
  stiffness: 260,
  damping: 20,
};

export const pageTransition: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.18, ease: 'easeIn' } },
};

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.92 },
  animate: { opacity: 1, scale: 1, transition: softSpring },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

export const slideUp: Variants = {
  initial: { opacity: 0, y: '100%' },
  animate: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 350, damping: 32 } },
  exit: { opacity: 0, y: '100%', transition: { duration: 0.22, ease: 'easeIn' } },
};

export const staggerContainer: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.055,
      delayChildren: 0.05,
    },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 16, scale: 0.97 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 380, damping: 28 },
  },
};

export const crumbItem: Variants = {
  initial: { opacity: 0, x: -10 },
  animate: { opacity: 1, x: 0, transition: springTransition },
  exit: { opacity: 0, x: 10, transition: { duration: 0.15 } },
};

export const logoFloat: Variants = {
  initial: { opacity: 0, scale: 0.5, rotate: -15 },
  animate: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: { type: 'spring', stiffness: 300, damping: 18, delay: 0.1 },
  },
};

export const tagPop: Variants = {
  initial: { opacity: 0, scale: 0.5 },
  animate: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 500, damping: 22 } },
  exit: { opacity: 0, scale: 0.5, transition: { duration: 0.12 } },
};
