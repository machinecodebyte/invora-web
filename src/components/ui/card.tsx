import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils';

type DivProps = HTMLAttributes<HTMLDivElement>;

export interface CardProps extends DivProps {
  children: ReactNode;
}

/** Surface container for a single unit of content. */
export function Card({ className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn('rounded-lg border border-border bg-surface shadow-sm', className)}
      {...rest}
    >
      {children}
    </div>
  );
}

/** Header region of a card; holds a title and optional description. */
export function CardHeader({ className, children, ...rest }: CardProps) {
  return (
    <div className={cn('flex flex-col gap-1 p-5 pb-3', className)} {...rest}>
      {children}
    </div>
  );
}

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  /**
   * Heading level, so a card can sit at the correct depth in the document
   * outline instead of hard-coding one level everywhere.
   */
  as?: 'h2' | 'h3' | 'h4';
  children: ReactNode;
}

export function CardTitle({
  as: Heading = 'h3',
  className,
  children,
  ...rest
}: CardTitleProps) {
  return (
    <Heading
      className={cn('text-base font-semibold text-foreground', className)}
      {...rest}
    >
      {children}
    </Heading>
  );
}

export function CardDescription({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLParagraphElement> & { children: ReactNode }) {
  return (
    <p className={cn('text-sm text-foreground-muted', className)} {...rest}>
      {children}
    </p>
  );
}

export function CardContent({ className, children, ...rest }: CardProps) {
  return (
    <div className={cn('p-5 pt-0', className)} {...rest}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn('flex items-center gap-3 border-t border-border p-5', className)}
      {...rest}
    >
      {children}
    </div>
  );
}
