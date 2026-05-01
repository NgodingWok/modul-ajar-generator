/**
 * This file provides a mechanism for dynamically loading and registering Express routes.
 * It scans the current directory recursively, imports each route file, and registers the exported AppRoute instances to an Express router. This allows for a file-system based routing approach that automatically handles different HTTP methods and nested directory structures.
 */

import path from 'node:path'
import fs from 'node:fs/promises'
import Express from 'express'
import consola from 'consola'

/**
 * Represents an application route configuration.
 */
export class AppRoute {
  /**
   * Creates a new AppRoute instance.
   *
   * @param {string} path - The URL path for the route (e.g., '/users').
   * @param {string} method - The HTTP method for the route (e.g., 'get', 'post', 'put', 'delete').
   * @param {import('express').RequestHandler} handler - The Express request handler function.
   */
  constructor (path, method, handler) {
    this.path = path
    this.method = method
    this.handler = handler
  }
}

/**
 * Dynamically loads and registers all routes from the routes directory.
 * Scans the current directory recursively for `.js` and `.ts` files, expecting each valid
 * route file to export an instance of `AppRoute` under the name `route`.
 *
 * @returns {Promise<import('express').Router>} A promise that resolves to the configured Express Router.
 */
export async function loadRoutes () {
  // Variables for filtering files (easy to modify if needed)
  const ignoreFiles = ['index.ts', 'index.js']
  const allowedExtensions = ['.ts', '.js']
  const dissallowedExtensions = ['.map', '.d.ts']

  const __dirname = import.meta.dirname

  // Create a new Express router
  const router = Express.Router()

  /**
   * Helper function to read files recursively.
   *
   * @param {string} dir - The directory path to scan.
   * @returns {Promise<string[]>} A promise that resolves to an array of absolute file paths.
   */
  async function getFilesWalk (dir) {
    let results = []
    const list = await fs.readdir(dir, { withFileTypes: true })
    for (const item of list) {
      const fullPath = path.join(dir, item.name)
      if (item.isDirectory()) {
        results = results.concat(await getFilesWalk(fullPath))
      } else {
        results.push(fullPath)
      }
    }
    return results
  }

  // Read all files recursively in the routes directory
  const routesDir = path.join(__dirname)
  const allFiles = await getFilesWalk(routesDir)

  const filteredFiles = allFiles.filter((filePath) => {
    const fileName = path.basename(filePath)
    const ext = path.extname(fileName)
    return !ignoreFiles.includes(fileName) && allowedExtensions.includes(ext) && !dissallowedExtensions.includes(ext) && !fileName.startsWith('.') && !fileName.endsWith('.d.ts')
  })

  // Dynamically import each route file and register the route
  for (const filePath of filteredFiles) {
    const file = path.relative(routesDir, filePath)
    const routeModule = await import(filePath)
    if (routeModule.route instanceof AppRoute) {
      const route = routeModule.route

      // Determine folder prefix for the route
      const relDir = path.dirname(file)
      const prefix = relDir === '.' ? '' : '/' + relDir.split(path.sep).join('/')

      // Normalize original route path and combine with prefix
      const normalizedRoutePath = route.path.startsWith('/') ? route.path : '/' + route.path
      let finalPath = prefix + (normalizedRoutePath === '/' ? '' : normalizedRoutePath)
      if (finalPath === '') finalPath = '/'

      consola.debug(`Registering route: [${route.method.toUpperCase()}] ${finalPath} from file ${file}`)

      switch (route.method.toLowerCase()) {
        case 'get':
          router.get(finalPath, route.handler)
          break
        case 'post':
          router.post(finalPath, route.handler)
          break
        case 'put':
          router.put(finalPath, route.handler)
          break
        case 'delete':
          router.delete(finalPath, route.handler)
          break
        case 'patch':
          router.patch(finalPath, route.handler)
          break
        default:
          consola.warn(`Unsupported HTTP method: ${route.method} in file ${file}`)
      }
    } else {
      consola.warn(`No valid route found in file: ${file}`)
    }
  }

  return router
}
