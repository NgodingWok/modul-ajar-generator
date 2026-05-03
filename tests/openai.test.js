import OpenAiWrapper from '@repo/core/ai/openai-wrapper.js'

test('OpenAIWrapper initializes with API key and model', () => {
  const wrapper = new OpenAiWrapper('test-api-key', 'test-model')
  expect(wrapper.client).toBeDefined()
  expect(wrapper.model).toBe('test-model')
})

test('OpenAIWrapper allows changing model', () => {
  const wrapper = new OpenAiWrapper('test-api-key', 'initial-model')
  wrapper.model = 'new-model'
  expect(wrapper.model).toBe('new-model')
})

test('OpenAIWrapper sets and gets context', () => {
  const wrapper = new OpenAiWrapper('test-api-key', 'test-model')
  const testContext = [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'What is the capital of France?' }
  ]
  wrapper.context = testContext
  expect(wrapper.context).toEqual(testContext)
})

test('OpenAIWrapper loads contexts from directory', () => {
  const wrapper = new OpenAiWrapper('test-api-key', 'test-model')
  wrapper.loadContextsFromDir('./context')
  expect(wrapper.context.length).toBeGreaterThan(0)
  expect(wrapper.context[0].role).toBe('system')
  expect(wrapper.context[0].content).toContain('--- CONTEXT')
})
