import { describe, expect, it } from 'vitest'
import { resolveCopies } from './resolve-copy'
import type { JsonRecord, RawItemEntity } from './raw-types'

function resolve(entries: unknown[], modifications: JsonRecord): RawItemEntity[] {
    const entities: RawItemEntity[] = [
        { name: 'Parent', source: 'TEST', entries },
        { name: 'Child', source: 'TEST', _copy: { name: 'Parent', source: 'TEST', _mod: { entries: modifications } } },
    ]
    const original = JSON.stringify(entities)
    const result = resolveCopies(entities)
    expect(JSON.stringify(entities)).toBe(original)
    expect(result[0].entries).toEqual(entries)
    return result
}

describe('5etools copy modifications', () => {
    it('removes named sections and exact values in operation order', () => {
        const entries = [{ name: 'Corrupted' }, { name: 'Sentience', entries: ['old'] }, 'obsolete']
        const entities: RawItemEntity[] = [
            { name: 'Parent', source: 'TEST', entries },
            { name: 'Child', source: 'TEST', _copy: { name: 'Parent', source: 'TEST', _mod: { entries: [
                { mode: 'removeArr', names: ['Corrupted'] },
                { mode: 'removeArr', items: 'obsolete' },
                { mode: 'replaceArr', replace: 'Sentience', items: { name: 'Sentience', entries: ['new'] } },
            ] } } },
        ]
        const original = JSON.stringify(entities)
        const result = resolveCopies(entities)
        expect(result[1].entries).toEqual([{ name: 'Sentience', entries: ['new'] }])
        expect(result[0].entries).toEqual(entries)
        expect(JSON.stringify(entities)).toBe(original)
        const changedSection = result[1].entries![0] as JsonRecord
        changedSection.name = 'changed'
        expect(result[0].entries).toEqual(entries)
    })

    it('requires removal targets unless a missing name is forced', () => {
        expect(() => resolve([], { mode: 'removeArr', names: 'missing' })).toThrow(/target was not found/)
        expect(resolve([], { mode: 'removeArr', names: 'missing', force: true })[1].entries).toEqual([])
        expect(() => resolve([], { mode: 'removeArr', items: 'missing', force: true })).toThrow(/target was not found/)
        expect(() => resolve([], { mode: 'removeArr' })).toThrow(/requires names or items/)
    })

    it('replaces names and strings and matches regexes against names only for objects', () => {
        expect(resolve([{ name: 'Section' }], { mode: 'replaceArr', replace: 'Section', items: 'new' })[1].entries).toEqual(['new'])
        expect(resolve(['Section'], { mode: 'replaceArr', replace: 'Section', items: ['a', 'b'] })[1].entries).toEqual(['a', 'b'])
        expect(resolve([{ name: 'Section' }], { mode: 'replaceArr', replace: { regex: '^section$', flags: 'i' }, items: 'new' })[1].entries).toEqual(['new'])
        expect(() => resolve([{ name: 'Other', entries: ['Section'] }], { mode: 'replaceArr', replace: { regex: 'Section' }, items: 'new' })).toThrow(/target was not found/)
        expect(() => resolve(['last'], { mode: 'replaceArr', replace: 'missing', items: 'new' })).toThrow(/target was not found/)
        expect(resolve(['a', 'b'], { mode: 'replaceArr', replace: { index: 0 }, items: 'new' })[1].entries).toEqual(['new', 'b'])
        expect(resolve(['a', 'b'], { mode: 'replaceArr', replace: { index: -1 }, items: 'new' })[1].entries).toEqual(['a', 'new'])
        expect(resolve(['a'], { mode: 'replaceArr', replace: { value: 'a' }, items: 'new' })[1].entries).toEqual(['new'])
        expect(resolve([{ name: 'a' }], { mode: 'replaceArr', replace: { name: 'a' }, items: 'new' })[1].entries).toEqual(['new'])
    })

    it('replaces text globally in selected fields while preserving nested tags', () => {
        const entries = ['Old OLD {@item Old|TEST|{@i Old}} Old', { name: 'Old', caption: 'Old Old', entries: ['Old'] }]
        expect(resolve(entries, { mode: 'replaceTxt', replace: 'old', with: 'New', flags: 'i', props: [null, 'caption'] })[1].entries).toEqual([
            'New New {@item Old|TEST|{@i Old}} New',
            { name: 'Old', caption: 'New New', entries: ['Old'] },
        ])
        expect(resolve(entries, { mode: 'replaceTxt', replace: 'Old', with: 'New', tagInsensitive: true, props: [null] })[1].entries?.[0]).toBe('New OLD {@item New|TEST|{@i New}} New')
    })

    it('walks default entry properties recursively without rewriting section names', () => {
        expect(resolve([{ name: 'Old', entries: [{ entries: ['Old Old'] }], headerEntries: ['Old'], footerEntries: ['Old'], caption: 'Old' }], {
            mode: 'replaceTxt', replace: 'Old', with: 'New',
        })[1].entries).toEqual([{ name: 'Old', entries: [{ entries: ['New New'] }], headerEntries: ['New'], footerEntries: ['New'], caption: 'Old' }])
        expect(resolve(['Old'], { mode: 'replaceTxt', replace: 'Old', with: 'New', props: [] })[1].entries).toEqual(['Old'])
        expect(() => resolve([], { mode: 'replaceTxt', replace: 'Old' })).toThrow(/requires replace and with/)
        expect(() => resolve([], { mode: 'replaceTxt', replace: 'Old', with: 'New', props: [42] })).toThrow(/property names or null/)
        const absent = resolveCopies([
            { name: 'Parent', source: 'TEST' },
            { name: 'Child', source: 'TEST', _copy: { name: 'Parent', source: 'TEST', _mod: { entries: { mode: 'replaceTxt', replace: 'Old', with: 'New' } } } },
        ] as RawItemEntity[])
        expect(absent[1]).not.toHaveProperty('entries')
    })
})
