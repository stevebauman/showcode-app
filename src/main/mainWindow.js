import BrowserWinHandler from './BrowserWinHandler'

const winHandler = new BrowserWinHandler({
  height: 720,
  width: 1280,
  show: false,
  useContentSize: true,
})

winHandler.onCreated(async (browserWindow) => {
  await winHandler.loadPage('/')
})

export default winHandler
