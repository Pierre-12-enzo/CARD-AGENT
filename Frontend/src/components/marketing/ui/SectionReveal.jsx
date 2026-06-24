// components/marketing/ui/SectionReveal.jsx
// Scroll-in reveal wrapper. Children fade + rise when they enter the viewport.
import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const SectionReveal = ({
  children,
  className = '',
  delay = 0,
  y = 32,
  once = true,
  as = 'div',
}) => {
  const reduceMotion = useReducedMotion();
  const MotionTag = motion[as] || motion.div;

  const variants = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : y },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <MotionTag
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: '-80px' }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </MotionTag>
  );
};

export default SectionReveal;
