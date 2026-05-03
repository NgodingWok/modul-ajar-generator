import fs from 'node:fs'
import path from 'node:path'

const IS_PRODUCTION = (process.env.NODE_ENV || '').toUpperCase() === 'PRODUCTION'
const JS_PUBLIC_PATH_PATTERN = /^\/js\/[^/]+\.js$/

/**
 * Helper function to strip console calls from JavaScript source code.
 * @param {string} source - The JavaScript source code
 * @returns {string} - The transformed source code
 */
const stripConsoleCalls = (source) => {
  // Handles nested parens (e.g. console.log(fn())) via depth tracking
  return source.replace(
    /\bconsole\.\w+\s*\((?:[^)(]|\((?:[^)(]|\([^)(]*\))*\))*\)\s*;?/g,
    ''
  )
}

/**
 * Middleware to strip console calls from JavaScript files in production.
 * Only processes GET requests for paths matching /js/*.js.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {import('express').Response | void}
 *
 * @note This middleware should be used after static file serving middleware, so it can intercept requests for JS files.
 * @note It reads the original JS file from the public directory, transforms it by stripping console calls, and serves the transformed version.
 * @note If the file does not exist or an error occurs, it passes control to the next middleware (which may serve the original file or handle the error).
 */
const stripConsoleMiddleware = (req, res, next) => {
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
    const source = fs.readFileSync(targetFile, 'utf8')
    const transformedSource = stripConsoleCalls(source)
    res.type('application/javascript')
    return res.send(transformedSource)
  } catch (/** @type {Error | unknown} */ error) {
    if (error instanceof Error && ['ENOENT', 'EACCES'].includes(error.name)) {
      // File not found or access denied, pass to next middleware (which may serve the original file or handle 404)
      console.warn(`Could not process ${targetFile}:`, error.message)
      return next()
    }
    // For other errors, log and pass to error handler
    console.error(`Error processing ${targetFile}:`, error)
    return next(error)
  }
}

export default stripConsoleMiddleware
