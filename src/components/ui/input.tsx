import * as React from 'react'
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', ...rest } = props
  return <input className={`h-9 px-3 rounded-xl border border-gray-300 bg-white outline-none focus:ring-2 focus:ring-gray-300 ${className}`} {...rest} />
}