import { copyFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const outputDirectory = new URL('../dist/', import.meta.url)

await copyFile(
  fileURLToPath(new URL('index.html', outputDirectory)),
  fileURLToPath(new URL('404.html', outputDirectory)),
)
