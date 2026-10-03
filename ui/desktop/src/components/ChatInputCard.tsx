import React from 'react';
import { cn } from '../utils';

/**
 * Layout wrapper for the ChatInput.
 *
 * The composer owns its own surfaces: the top selector row and the rounded,
 * bordered message box sit inside this wrapper, while the bottom action bar is
 * portaled out so it lands on the canvas below the box. This wrapper therefore
 * only owns positioning - z-index, margins, entry animation - and keeps the Hub
 * (empty-chat landing) and BaseChat (active session) in sync.
 */
export const ChatInputCard: React.FC<{
  className?: string;
  children: React.ReactNode;
}> = ({ className, children }) => <div className={cn('relative', className)}>{children}</div>;
