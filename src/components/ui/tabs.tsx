import * as React from 'react'
type TabsContextType = { value: string, setValue: (v: string) => void }
const TabsContext = React.createContext<TabsContextType | null>(null)

export function Tabs({ value, onValueChange, children, className = '' }: { value: string, onValueChange: (v: string)=>void, children: React.ReactNode, className?: string }) {
  return <TabsContext.Provider value={{ value, setValue: onValueChange }}><div className={className}>{children}</div></TabsContext.Provider>
}
export function TabsList({ children }: { children: React.ReactNode }) {
  return <div className="inline-flex gap-2 rounded-xl bg-gray-100 p-1">{children}</div>
}
export function TabsTrigger({ value, children }: { value: string, children: React.ReactNode }) {
  const ctx = React.useContext(TabsContext)!
  const active = ctx.value === value
  return (
    <button onClick={()=>ctx.setValue(value)} className={`px-3 py-1.5 text-sm rounded-lg ${active ? 'bg-white shadow' : 'text-gray-600 hover:bg-white/60'}`}>
      {children}
    </button>
  )
}
export function TabsContent({ value, children, className='' }: { value: string, children: React.ReactNode, className?: string }) {
  const ctx = React.useContext(TabsContext)!
  if (ctx.value !== value) return null
  return <div className={className}>{children}</div>
}