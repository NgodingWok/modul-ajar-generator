import fs from 'node:fs/promises'
import path from 'node:path'

const IS_PRODUCTION = (process.env.NODE_ENV || '').toUpperCase() === 'PRODUCTION'
const JS_PUBLIC_PATH_PATTERN = /^\/js\/[^/]+\.js$/

const stripConsoleCalls = (source) => {
  // Handles nested parens (e.g. console.log(fn())) via depth tracking
  return source.replace(
    /\bconsole\.\w+\s*\((?:[^)(]|\((?:[^)(]|\([^)(]*\))*\))*\)\s*;?/g,
    ''
  )
}

const stripConsoleMiddleware = async (req, res, next) => {
  if (!IS_PRODUCTION) {
    return next()
  }
  if (req.method !== 'GET') {
    return next()
  }
  if (!JS_PUBLIC_PATH_PATTERN.test(req.path)) {
    return next()
  }

  const publicRelativePath = req.path.replace(/^\/+/, '')
  const targetFile = path.join(process.cwd(), 'public', publicRelativePath)

  try {
    const source = await fs.readFile(targetFile, 'utf8')
    const transformedSource = stripConsoleCalls(source)
    res.type('application/javascript')
    return res.send(transformedSource)
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return next()
    }
    return next(error)
  }
}

export default stripConsoleMiddleware
