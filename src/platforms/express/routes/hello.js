import { AppRoute } from './index.js'

export const route = new AppRoute('/hello', 'get', (req, res) => {
  res.send('Hello from the /hello route!')
})
