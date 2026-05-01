/**
 * Just a example hos to use AppRoute to create a route. You can create as many routes as you want by creating new files in the routes/ directory and exporting an AppRoute instance from those files.
 */

import { AppRoute } from './index.js'

const APP_NAME = process.env.APP_NAME || 'My Express App'

export const route = new AppRoute('/', 'get', async (req, res) => {
  res.render('layout/main', { VIEW: 'home', APP_NAME, TITLE: 'Home', BASE_URL: process.env.BASE_URL || '' })
})
