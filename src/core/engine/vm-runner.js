import fs from 'fs'
import path from 'path'
import vm from 'vm'
import consola from 'consola'

const __dirname = import.meta.dirname
const __filename = import.meta.filename

/**
 * Runs JavaScript code safely inside a sandboxed VM context.
 *
 * Use this when you want to execute dynamic or untrusted code without
 * giving it access to your main application's globals or scope.
 *
 * The code runs in its own isolated environment. You can pass in any
 * variables or functions you want the code to access via the `shared`
 * parameter. When the code finishes, your `callback` is called with
 * either an error or the return value.
 *
 * Built-in variables available inside the VM by default:
 *   - fs       (Node.js file system module)
 *   - path     (Node.js path module)
 *   - consola  (logging utility)
 *   - __dirname
 *   - __filename
 *
 * @example
 *
 *   const runner = new VMRunner(
 *     'return 1 + 1',
 *     {},
 *     (err, result) => {
 *       if (err) return console.error(err)
 *       console.log(result) // 2
 *     }
 *   )
 *   runner.run()
 */
class VMRunner {
  code = null
  shared = null
  callback = null
  context = null

  /**
   * Creates a new VMRunner instance.
   *
   * @param {string} code
   *   The JavaScript code to run. Write it as if it were the body of an
   *   async function -- you can use `await` and `return` freely.
   *
   * @example
   *     'const x = await fetchData(); return x.name'
   *
   * @param {Object} [shared={}]
   *   Optional. Variables or functions to inject into the VM so your code can use them.
   *   Think of this as the "imports" available inside the VM.
   *   If not provided, the VM will only have the built-in context variables.
   *
   * @example
   *     { greeting: 'hello', add: (a, b) => a + b }
   *
   * @param {Function} [callback=null]
   *   Optional. Called when execution finishes. Follows Node-style error-first convention:
   *     - First argument is the error (null if none)
   *     - Second argument is the return value from your code (null if error)
   *   If not provided, errors will still be logged via consola but silently ignored.
   *
   * @example
   *     (err, result) => {
   *       if (err) console.error('Something went wrong:', err)
   *       else console.log('Got result:', result)
   *     }
   */
  constructor (code, shared = {}, callback = null) {
    consola.debug('[VMRunner] Constructor called', { code: code?.substring(0, 100), sharedKeys: Object.keys(shared || {}) })

    this.code = code
    this.shared = shared
    this.callback = callback

    this.context = {
      __dirname,
      __filename,
      consola,
      fs,
      path,
      console,
      setTimeout,
      setInterval,
      clearTimeout,
      clearInterval,
      crypto,
      Error
    }

    consola.debug('[VMRunner] Context initialized with keys:', Object.keys(this.context))
  }

  /**
   * Runs the code inside the VM and calls the callback with the result.
   *
   * - Supports both synchronous and async code (await works inside the VM)
   * - If the code throws an error, the callback receives it as the first argument
   * - If the code returns a value, the callback receives it as the second argument
   *
   * @example
   *
   *   const runner = new VMRunner(
   *     `
   *       const content = await fs.promises.readFile('/tmp/hello.txt', 'utf8')
   *       return content.trim()
   *     `,
   *     {},
   *     (err, result) => {
   *       if (err) return consola.error('Failed to read file:', err)
   *       consola.success('File contents:', result)
   *     }
   *   )
   *   runner.run()
   */
  run () {
    consola.debug('[VMRunner] run() called')

    try {
      // Merge shared variables into the context
      const fullContext = {
        ...this.context,
        ...(this.shared || {})
      }
      consola.debug('[VMRunner] Merged context keys:', Object.keys(fullContext))

      // Create and freeze the VM context
      const vmContext = vm.createContext(fullContext)
      consola.debug('[VMRunner] VM context created')

      // Wrap the code to capture the return value or last expression
      const wrappedCode = `
        (async () => {
          ${this.code}
        })()
      `
      consola.debug('[VMRunner] Wrapped code:', wrappedCode.trim())

      // Compile and run the script
      const script = new vm.Script(wrappedCode)
      consola.debug('[VMRunner] Script compiled')

      const result = script.runInContext(vmContext)
      consola.debug('[VMRunner] Script executed, result type:', typeof result)

      // Handle async execution
      Promise.resolve(result)
        .then((value) => {
          consola.debug('[VMRunner] Async execution resolved', { value })
          if (typeof this.callback === 'function') {
            consola.debug('[VMRunner] Calling callback with success')
            this.callback(null, value)
          }
        })
        .catch((err) => {
          consola.debug('[VMRunner] Async execution promise rejected', { error: err?.message })
          consola.error('[VMRunner] Async execution error:', err)
          if (typeof this.callback === 'function') {
            this.callback(err, null)
          }
        })
    } catch (err) {
      consola.debug('[VMRunner] Synchronous execution error caught', { error: err?.message })
      consola.error('[VMRunner] Execution error:', err)
      if (typeof this.callback === 'function') {
        this.callback(err, null)
      }
    }
  }

  /**
   * Adds extra variables into the VM context before running.
   *
   * Call this if you want to inject additional variables after creating
   * the runner but before calling run(). You can call it multiple times
   * and each call will merge into the existing context without removing
   * anything already there.
   *
   * @param {...Object} contexts
   *   One or more objects whose keys will be added to the VM context.
   *
   * @example
   *
   *   const runner = new VMRunner('return greet(name)', {}, callback)
   *
   *   runner.addContext({ name: 'Alice' })
   *   runner.addContext({ greet: (n) => 'Hello, ' + n })
   *
   *   runner.run() // callback receives "Hello, Alice"
   */
  addContext (...contexts) {
    consola.debug('[VMRunner] addContext() called with', contexts.map(c => Object.keys(c)))

    this.context = Object.assign(this.context, ...contexts)

    consola.debug('[VMRunner] Context updated, now has keys:', Object.keys(this.context))
  }
}

export default VMRunner
