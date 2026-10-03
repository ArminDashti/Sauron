'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils';

/**
 * Pointer-anchored menu opened with a secondary (right) click.
 *
 * Built on plain React rather than Radix because this project declares
 * `@radix-ui/react-dropdown-menu`, not `@radix-ui/react-context-menu`, and
 * `@radix-ui/react-menu` is only a transitive dependency — importing it
 * directly reintroduces the undeclared-radix-import hazard that
 * src/test/radixSingleVersion.test.ts exists to catch. The rendering below
 * mirrors dropdown-menu.tsx so both menus look identical.
 */

export interface ContextMenuPosition {
  x: number;
  y: number;
}

interface ContextMenuApi {
  isOpen: boolean;
  position: ContextMenuPosition | null;
  open: (event: React.MouseEvent) => void;
  close: () => void;
}

const ContextMenuContext = React.createContext<ContextMenuApi | null>(null);

export function useContextMenu(): ContextMenuApi {
  const context = React.useContext(ContextMenuContext);
  if (!context) {
    throw new Error('useContextMenu must be used within a <ContextMenu>');
  }
  return context;
}

export function ContextMenu({ children }: { children: React.ReactNode }) {
  const [position, setPosition] = React.useState<ContextMenuPosition | null>(null);

  const open = React.useCallback((event: React.MouseEvent) => {
    // Keep the browser's own menu (Inspect, Copy link, …) out of the way.
    event.preventDefault();
    event.stopPropagation();
    setPosition({ x: event.clientX, y: event.clientY });
  }, []);

  const close = React.useCallback(() => setPosition(null), []);

  const api = React.useMemo<ContextMenuApi>(
    () => ({ isOpen: position !== null, position, open, close }),
    [position, open, close]
  );

  return <ContextMenuContext.Provider value={api}>{children}</ContextMenuContext.Provider>;
}

const VIEWPORT_MARGIN = 8;

function enabledItems(menu: HTMLElement): HTMLElement[] {
  return Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]:not([data-disabled])'));
}

function moveFocus(menu: HTMLElement, from: HTMLElement | null, step: number): void {
  const items = enabledItems(menu);
  if (items.length === 0) return;

  const currentIndex = from ? items.indexOf(from) : -1;
  // Wrap around at both ends so the arrow keys behave like a native menu.
  const nextIndex =
    currentIndex === -1
      ? step > 0
        ? 0
        : items.length - 1
      : (currentIndex + step + items.length) % items.length;
  items[nextIndex].focus();
}

interface ContextMenuContentProps {
  children: React.ReactNode;
  className?: string;
}

export function ContextMenuContent({ children, className }: ContextMenuContentProps) {
  const { isOpen, position, close } = useContextMenu();
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = React.useState<ContextMenuPosition | null>(null);

  // Runs before paint, so the measured correction is never visible as a jump.
  React.useLayoutEffect(() => {
    if (!isOpen || !position || !menuRef.current) return;
    const { width, height } = menuRef.current.getBoundingClientRect();
    const maxLeft = window.innerWidth - width - VIEWPORT_MARGIN;
    const maxTop = window.innerHeight - height - VIEWPORT_MARGIN;
    setPlacement({
      x: Math.min(position.x, Math.max(VIEWPORT_MARGIN, maxLeft)),
      y: Math.min(position.y, Math.max(VIEWPORT_MARGIN, maxTop)),
    });
  }, [isOpen, position]);

  React.useEffect(() => {
    if (!isOpen) {
      setPlacement(null);
      return;
    }

    const previouslyFocused = document.activeElement as HTMLElement | null;
    if (menuRef.current) {
      enabledItems(menuRef.current).at(0)?.focus();
    }

    return () => {
      // The trigger is still mounted here, so hand focus back rather than
      // stranding it on <body> after the menu closes.
      if (previouslyFocused?.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && !menuRef.current?.contains(target)) {
        close();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        close();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown, true);
    // Any layout change under the pointer invalidates the anchor.
    window.addEventListener('resize', close);
    window.addEventListener('blur', close);
    window.addEventListener('scroll', close, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('blur', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [isOpen, close]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const menu = menuRef.current;
    if (!menu) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        moveFocus(menu, document.activeElement as HTMLElement | null, 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        moveFocus(menu, document.activeElement as HTMLElement | null, -1);
        break;
      case 'Home': {
        event.preventDefault();
        const items = enabledItems(menu);
        items.at(0)?.focus();
        break;
      }
      case 'End': {
        event.preventDefault();
        const items = enabledItems(menu);
        items.at(-1)?.focus();
        break;
      }
      case 'Tab':
        close();
        break;
    }
  };

  if (!isOpen || !position) return null;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-orientation="vertical"
      tabIndex={-1}
      data-slot="context-menu-content"
      data-state="open"
      onKeyDown={handleKeyDown}
      style={{ left: placement?.x ?? position.x, top: placement?.y ?? position.y }}
      className={cn(
        'fixed z-50 min-w-[11rem] overflow-x-hidden overflow-y-auto rounded-xl border p-1 shadow-lg space-y-0.5',
        'bg-background-primary text-text-primary animate-in fade-in-0 zoom-in-95',
        className
      )}
    >
      {children}
    </div>,
    document.body
  );
}

interface ContextMenuItemProps extends Omit<React.ComponentProps<'div'>, 'onSelect'> {
  disabled?: boolean;
  inset?: boolean;
  variant?: 'default' | 'destructive';
  onSelect?: () => void;
}

export function ContextMenuItem({
  className,
  disabled = false,
  inset = false,
  variant = 'default',
  onSelect,
  children,
  ...props
}: ContextMenuItemProps) {
  const handleSelect = (event: React.SyntheticEvent) => {
    if (disabled) return;
    event.preventDefault();
    onSelect?.();
  };

  return (
    <div
      role="menuitem"
      tabIndex={-1}
      aria-disabled={disabled || undefined}
      data-slot="context-menu-item"
      data-disabled={disabled ? '' : undefined}
      data-inset={inset ? '' : undefined}
      data-variant={variant}
      onClick={handleSelect}
      onKeyDown={(event) => {
        if (disabled) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect?.();
        }
      }}
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-text-secondary",
        'focus:bg-background-secondary focus:text-text-secondary',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        'data-[inset]:pl-8',
        'data-[variant=destructive]:text-text-danger data-[variant=destructive]:focus:bg-background-danger/10 data-[variant=destructive]:focus:text-text-danger',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function ContextMenuSeparator({ className }: { className?: string }) {
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      data-slot="context-menu-separator"
      className={cn('bg-border-primary -mx-1 my-1 h-px', className)}
    />
  );
}
