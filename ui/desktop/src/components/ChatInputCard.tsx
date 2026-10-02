import React from 'react';
import { cn } from '../utils';

/**
 * Layout wrapper for the ChatInput.
 *
 * The composer draws its own rounded, bordered surface around the input row, so
 * the bottom action bar can sit on the canvas below it instead of inside a
 * card. This wrapper only owns positioning - z-index, margins, entry animation -
 * and keeps the Hub (empty-chat landing) and BaseChat (active session) in sync.
 */
export const ChatInputCard: React.FC<{
  className?: string;
  children: React.ReactNode;
}> = ({ className, children }) => <div className={cn('relative', className)}>{children}</div>;
