import { useMemo } from 'react'
import { tokenizeMeasurements } from '../model/tokenize'
import { MeasurementValue } from './MeasurementValue'

export function MeasurementText({ text, context = '' }: { text: string; context?: string }) {
    const tokens = useMemo(() => tokenizeMeasurements(text.replace(/\bper (mile|pound|gallon)\b/gi, 'per 1 $1'), context), [text, context])
    return <>{tokens.map((token, index) => typeof token === 'string' ? token : <MeasurementValue key={index} measurement={token} />)}</>
}
