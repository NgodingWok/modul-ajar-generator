import VMRunner from '@repo/core/engine/vm-runner.js'

test('VMRunner executes code and returns result via callback', (done) => {
  const code = `
    const a = 5
    const b = 10
    return a + b
  `

  const runner = new VMRunner(code, {}, (err, result) => {
    expect(err).toBeNull()
    expect(result).toBe(15)
    done()
  })

  runner.run()
})

test('VMRunner supports async code with await', (done) => {
  const code = `
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
    await delay(100)
    return 'async result'
  `

  const runner = new VMRunner(code, {}, (err, result) => {
    expect(err).toBeNull()
    expect(result).toBe('async result')
    done()
  })

  runner.run()
})

test('VMRunner passes shared variables into context', (done) => {
  const code = `
    return sharedValue * 2
  `

  const runner = new VMRunner(code, { sharedValue: 7 }, (err, result) => {
    expect(err).toBeNull()
    expect(result).toBe(14)
    done()
  })

  runner.run()
})

test('VMRunner handles errors thrown in code', (done) => {
  const code = `
    throw new Error('Test error')
  `

  const runner = new VMRunner(code, {}, (err, result) => {
    expect(err).toBeInstanceOf(Error)
    expect(err.message).toBe('Test error')
    expect(result).toBeNull()
    done()
  })

  runner.run()
})

test('VMRunner handles rejected promises in async code', (done) => {
  const code = `
    const rejectPromise = () => Promise.reject(new Error('Async error'))
    await rejectPromise()
    return 'This will not be reached'
  `

  const runner = new VMRunner(code, {}, (err, result) => {
    expect(err).toBeInstanceOf(Error)
    expect(err.message).toBe('Async error')
    expect(result).toBeNull()
    done()
  })

  runner.run()
})

test('VMRunner allows access to provided context variables', (done) => {
  const code = `
    return contextValue + 3
  `

  const runner = new VMRunner(code, { contextValue: 4 }, (err, result) => {
    expect(err).toBeNull()
    expect(result).toBe(7)
    done()
  })

  runner.run()
})

test('VMRunner does not allow access to variables outside context', (done) => {
  const code = `
    return typeof process
  `

  const runner = new VMRunner(code, {}, (err, result) => {
    expect(err).toBeNull()
    expect(result).toBe('undefined')
    done()
  })

  runner.run()
})
