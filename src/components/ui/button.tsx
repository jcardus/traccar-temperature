import * as React from 'react'
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'outline' | 'secondary'
  size?: 'sm' | 'md' | 'icon'
}
export const Button = React.forwardRef<HTMLButtonElement, Props>(
  ({ className = '', variant = 'default', size = 'md', ...props }, ref) => {
    const variants = {
      default: 'bg-gray-900 text-white hover:bg-gray-800',
      outline: 'border border-gray-300 hover:bg-gray-100',
      secondary: 'bg-gray-100 hover:bg-gray-200'
    }
    const sizes = {
      sm: 'px-3 py-1.5 text-sm rounded-xl',
      md: 'px-4 py-2 rounded-xl',
      icon: 'p-2 rounded-xl'
    }
    return <button ref={ref} className={`${variants[variant]} ${sizes[size]} ${className}`} {...props} />
  }
)
Button.displayName = 'Button'