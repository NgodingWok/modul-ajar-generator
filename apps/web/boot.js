import { config } from 'dotenv'
import { getEnvPath } from '@repo/utils/utils.js'

const envPath = getEnvPath()
config({ path: envPath || undefined, override: true })

import('./index.js')
