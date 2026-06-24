// components/marketing/ui/GlassCard.jsx
// Reusable frosted-glass panel with crimson rim. Variants: default, strong, card.
import React from 'react';

const VARIANTS = {
  default: 'glass',
  strong: 'glass-strong',
  card: 'glass-card',
};

const GlassCard = ({
  children,
  className = '',
  variant = 'card',
  as: Tag = 'div',
  glow = false,
  ...props
}) => {
  const variantClass = VARIANTS[variant] || VARIANTS.card;
  return (
    <Tag
      className={`relative rounded-2xl ${variantClass} ${glow ? 'neon-crimson' : ''} ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
};

export default GlassCard;
