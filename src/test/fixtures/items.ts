import type { Item } from '../../types'

export const ITEM_FIXTURES: Item[] = [
  {
    id: 'bag-of-holding', name: 'Bag of Holding', icon: '🎒', type: 'Magic', rarity: 'Uncommon', category: 'Bag/Container', subtype: 'Container',
    availability: 'Available', basePriceGp: 4000, weight: '15 lb', description: 'A deceptively small satchel whose interior opens into a vast extradimensional space.',
    tags: ['magical', 'utility', 'extradimensional'], properties: ['Carries up to 500 lb', 'Interior volume of 64 cubic feet'], attunement: false,
    source: 'DMG', edition: 'classic', origin: 'item',
  },
  {
    id: 'pearl-of-power', name: 'Pearl of Power', icon: '💎', type: 'Magic', rarity: 'Uncommon', category: 'Gem', subtype: 'Pearl',
    availability: 'Limited', basePriceGp: 6000, weight: '—', description: 'A pearl that stores arcane energy.', tags: ['spellcasting'],
    properties: ['Recover one spell slot daily'], attunement: true, source: 'DMG', edition: 'classic', origin: 'item',
  },
  {
    id: 'vicious-longsword', name: 'Vicious Longsword', icon: '⚔️', type: 'Magic', rarity: 'Rare', category: 'Weapon', subtype: 'Longsword',
    availability: 'Limited', basePriceGp: 3500, weight: '3 lb', description: 'A cruel-edged blade.', tags: ['critical'], properties: ['Extra critical damage'],
    attunement: false, source: 'DMG', edition: 'classic', origin: 'item',
  },
  {
    id: 'vorpal-sword', name: 'Vorpal Sword', icon: '⚔️', type: 'Magic', rarity: 'Legendary', category: 'Weapon', subtype: 'Greatsword',
    availability: 'Unavailable', basePriceGp: null, weight: '6 lb', description: 'A peerless blade.', tags: ['legendary'], properties: ['Exceptional critical effect'],
    attunement: true, source: 'DMG', edition: 'classic', origin: 'item',
  },
]
