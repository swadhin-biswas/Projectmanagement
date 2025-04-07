import { motion } from 'framer-motion';
import React from 'react';

export const TypingIndicator = ({ users }) => {
  if (!users || users.length === 0) return null;

  const userNames = users.map(u => u.fullName.split(' ')[0]);
  const displayText = users.length === 1
    ? `${userNames[0]} is typing...`
    : users.length === 2
    ? `${userNames.join(' and ')} are typing...`
    : `${userNames.length} people are typing...`;

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-1 h-1 rounded-full bg-current"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2
            }}
          />
        ))}
      </div>
      <span>{displayText}</span>
    </div>
  );
};