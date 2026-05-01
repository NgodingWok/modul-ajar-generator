import fs from 'fs'
import path from 'path'
import consola from 'consola'
import OpenAI from 'openai'
import { loadContexts, numTokensFromString } from '../../utils/utils.js'

/**
 * OpenAIWrapper is a simple wrapper around the OpenAI API to manage contexts and generate responses.
 *
 * @example
 *  const wrapper = new OpenAIWrapper('your-api-key')
 *  wrapper.loadContextsFromDir('./contexts')
 *  const response = await wrapper.chat('Hello, model!')
 *  console.log(response)
 *  // This will send the message 'Hello, model!' to the OpenAI model along with all the loaded contexts, and log the response.
 *
 * @note Make sure to set the OPENAI_API_KEY and OPENAI_MODEL environment variables before using this class.
 */
class OpenAIWrapper {
  #mClient = null
  #mModel = null
  #mBaseURL = null
  #mDefaultContext = []

  /**
   * Creates an instance of OpenAIWrapper.
   *
   * @param {string} apiKey - Your OpenAI API key, required to authenticate requests to the OpenAI API.
   * @param {string} model - The model to use. Defaults is 'gpt-4.1-2025-04-14'
   * @param {string} baseURL - The base URL for the OpenAI API. Defaults is null. If not provided, it will use the default OpenAI API URL.
   */
  constructor (apiKey, model = 'gpt-4.1-2025-04-14', baseURL = null) {
    consola.debug('[OpenAIWrapper] Initializing OpenAI client')
    consola.debug('[OpenAIWrapper] Model set to:', model)
    consola.debug('[OpenAIWrapper] Base URL set to:', baseURL || 'default OpenAI API URL')

    this.#mModel = model
    this.#mBaseURL = baseURL

    this.#mClient = new OpenAI({
      apiKey,
      baseURL
    })
  }

  // Setter and getter method
  /**
   * Gets the base URL for the OpenAI API.
   * @returns {string} - The base URL for the OpenAI API.
   */
  get baseURL () {
    return this.#mBaseURL
  }

  /**
   * Gets the model.
   * @returns {string} - The model.
   */
  get model () {
    return this.#mModel
  }

  /**
   * Sets the model.
   * @param {string} model - The model.
   */
  set model (model) {
    consola.debug('[OpenAIWrapper] Setting model to:', model)
    this.#mModel = model
  }

  /**
   * Gets the OpenAI client instance.
   * @returns {OpenAI} The OpenAI client instance.
   */
  get client () {
    return this.#mClient
  }

  /**
   * Gets the default context.
   * @returns {Array<{role: string, content: string}>} The default context as an array of message objects.
   */
  get context () {
    return this.#mDefaultContext
  }

  /**
   * Sets the default context. This will replace the entire default context with the provided context.
   * @param {Array<{role: string, content: string}>} context - The new default context as an array of message objects.
   */
  set context (context) {
    this.#mDefaultContext = context
  }

  // Public method

  /**
   * Adds one or more context objects to the existing default context.
   *
   * @param  {...{role: string, content: string}} contexts - Context to add to the default context. Each context should be an object with 'role' and 'content' properties.
   */
  addContext (...contexts) {
    consola.debug('[OpenAIWrapper] addContext() called with', contexts.map(c => Object.keys(c)))

    this.#mDefaultContext = Object.assign(this.#mDefaultContext, ...contexts)

    consola.debug('[OpenAIWrapper] Context updated, now has keys:', Object.keys(this.#mDefaultContext))
  }

  /**
   * Load context(s) from a directory. Each file in the directory will be read and added as a separate context entry with system role.
   *
   * @param {string} pathDir - The path to the directory containing context files. Each file's content will be loaded as a separate context entry.
   *
   * @example
   *   const wrapper = new OpenAIWrapper('your-api-key')
   *   wrapper.loadContextsFromDir('./contexts')
   *   // This will load all files in the './contexts' directory as separate context entries.
   */
  loadContextsFromDir (pathDir) {
    consola.debug('[OpenAIWrapper] Loading contexts from directory:', pathDir)

    let contextxCharCount = 0
    const contexts = loadContexts(pathDir)

    for (const [key, value] of Object.entries(contexts)) {
      contextxCharCount += value.length
      consola.debug('[OpenAIWrapper] Loaded context:', key, `(${value.length} characters)`)

      this.#mDefaultContext.push({
        role: 'system',
        content: `--- CONTEXT ${key} START ---\n${value}\n--- CONTEXT ${key} END ---`
      })
    }

    consola.debug('[OpenAIWrapper] Finished loading contexts from directory:', pathDir, `Total contexts: ${Object.keys(contexts).length}, Total characters: ${contextxCharCount}`)
    consola.debug('[OpenAIWrapper] Total tokens in loaded contexts:', numTokensFromString(this.#mDefaultContext.map(c => c.content).join('\n')))
  }

  /**
   * Loads a context from a file and adds it to the default context as a system message.
   *
   * @param {string} filePath - The path to the file containing the context.
   *
   * @example
   *   const wrapper = new OpenAIWrapper('your-api-key')
   *   wrapper.loadContext('./contexts/context1.md')
   *   // This will load the content of './contexts/context1.md' as a context entry.
   *   wrapper.loadContext('./contexts/context2.md')
   *   // This will load the content of './contexts/context2.md' as another context entry, in addition to the previous one.
   *   // You can call loadContext multiple times to load multiple contexts, and each call will merge into the existing context without removing anything already there.
   */
  loadContext (filePath) {
    consola.debug('[OpenAIWrapper] Loading context from file:', filePath)

    const content = fs.readFileSync(filePath, 'utf-8')
    this.#mDefaultContext.push({
      role: 'system',
      content: `--- CONTEXT ${path.basename(filePath)} START ---\n${content}\n--- CONTEXT ${path.basename(filePath)} END ---`
    })

    consola.debug('[OpenAIWrapper] Loaded context from file:', filePath, `(${content.length} characters)`)
    consola.debug('[OpenAIWrapper] Total tokens in loaded contexts:', numTokensFromString(this.#mDefaultContext.map(c => c.content).join('\n')))
  }

  /**
   * Send a chat message to the OpenAI model with the loaded contexts. You can call this multiple times to send multiple messages, and the contexts will be included in each call.
   *
   * @param {string | Array<{role: string, content: string}> | Array<string>} messages - The message(s) to send to the model. Can be a string, an array of message objects, or an array of strings.
   *
   * @returns {Promise<string>} The response from the model.
   * @throws {Error} If there is an error during the chat request.
   *
   * @example
   *   const wrapper = new OpenAIWrapper('your-api-key')
   *   wrapper.loadContextsFromDir('./contexts')
   *   const response = await wrapper.chat('Hello, model!')
   *   console.log(response)
   *   // This will send the message 'Hello, model!' to the OpenAI model along with all the loaded contexts, and log the response.
   */
  async chat (messages) {
    try {
      const formattedMessages = []
      if (typeof messages === 'string') {
        formattedMessages.push({
          role: 'user',
          content: messages
        })
      } else if (Array.isArray(messages)) {
        for (const msg of messages) {
          if (typeof msg === 'string') {
            formattedMessages.push({
              role: 'user',
              content: msg
            })
          } else if (msg.role && msg.content) {
            formattedMessages.push({
              role: msg.role,
              content: msg.content
            })
          }
        }
      }

      const allMessages = [...this.#mDefaultContext, ...formattedMessages]

      consola.debug('[OpenAIWrapper] Sending chat request with messages:', allMessages)

      // Send the chat request to the OpenAI API
      const response = await this.#mClient.chat.completions.create({
        model: this.#mModel,
        messages: allMessages
      })

      consola.debug('[OpenAIWrapper] Received response from OpenAI:', response)

      // Return the content of the first choice in the response
      return response.choices[0].message.content
    } catch (err) {
      consola.error('[OpenAIWrapper] Error during chat:', err)
      throw err
    }
  }
}

export default OpenAIWrapper
