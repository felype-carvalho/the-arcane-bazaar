import { Shield, Swords } from 'lucide-react'

export function Toolbar() {
  return (
    <header className="flex h-[60px] shrink-0 items-center justify-between border-b border-gold/35 bg-header px-4 md:px-5">
      <div>
        <h1 className="font-display text-sm font-semibold tracking-wide text-gold-bright md:text-base">The Arcane Bazaar</h1>
        <p className="mt-0.5 hidden text-[9px] tracking-wide text-violet-300/70 sm:block">Magic Item Market & Pricing Guide</p>
      </div>
      <div className="flex items-center gap-3 text-muted">
        <span className="hidden items-center gap-2 font-display text-[10px] uppercase tracking-[0.15em] md:flex"><Swords size={17} /> D&amp;D 5.5e</span>
        <span className="h-4 w-px bg-border" />
        <Shield size={16} className="text-violet-300" />
      </div>
    </header>
  )
}
