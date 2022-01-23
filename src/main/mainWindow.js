import BrowserWinHandler from './BrowserWinHandler'

const path = require('path');

const winHandler = new BrowserWinHandler({
  height: 720,
  width: 1280,
  show: false,
  useContentSize: true,
  //icon: path.join(__dirname, '/../resources/icons/icon.png')
})

winHandler.onCreated(async (browserWindow) => {
  await winHandler.loadPage('/')
})

export default winHandler
