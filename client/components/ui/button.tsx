import * as React from 'react'
import { cn } from '@/lib/utils'

type ButtonVariant = 'default' | 'secondary' | 'outline' | 'ghost'
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon'

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  asChild?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  default:
    'bg-zinc-900 text-white hover:bg-zinc-900/90 border border-zinc-900',
  secondary:
    'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 border border-zinc-200',
  outline:
    'bg-white text-zinc-900 hover:bg-zinc-50 border border-zinc-200',
  ghost: 'bg-transparent text-zinc-900 hover:bg-zinc-100 border border-transparent',
}

const sizeClasses: Record<ButtonSize, string> = {
  default: 'h-10 px-4 py-2 text-sm',
  sm: 'h-9 px-3 text-sm',
  lg: 'h-11 px-6 text-base',
  icon: 'h-10 w-10 p-0',
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'default', size = 'default', asChild, children, ...props },
    ref
  ) => {
    const composedClassName = cn(
      'inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300',
      variantClasses[variant],
      sizeClasses[size],
      className
    )

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<{ className?: string }>
      return React.cloneElement(child, {
        className: cn(child.props.className, composedClassName),
        ...props,
      })
    }

    return (
      <button
        ref={ref}
        className={composedClassName}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'
