import { Gem, Sparkles } from 'lucide-react'
import type { ItemType, Rarity } from '../../../types'

const rarityClass: Record<Rarity, string> = {
  None: 'rarity-none',
  Common: 'rarity-common',
  Uncommon: 'rarity-uncommon',
  Rare: 'rarity-rare',
  'Very Rare': 'rarity-very-rare',
  Legendary: 'rarity-legendary',
  Artifact: 'rarity-artifact',
  Varies: 'rarity-varies',
  Unknown: 'rarity-unknown',
}

export function RarityBadge({ rarity }: { rarity: Rarity }) {
  return <span className={`rarity-badge ${rarityClass[rarity]}`}>{rarity}</span>
}

export function TypeMark({ type }: { type: ItemType }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.15em] ${type === 'Magic' ? 'text-violet-400' : 'text-slate-400'}`}>
      {type === 'Magic' ? <Sparkles size={13} className="text-gold" /> : <Gem size={13} className="text-stone-400" />}
      {type}
    </span>
  )
}
