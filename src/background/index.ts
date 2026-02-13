export {}

console.log("Web-novel background service worker started.")

// 监听安装事件
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("Web-novel extension installed.")
    // 这里可以初始化一些默认设置
    chrome.storage.local.set({
      settings: {
        pluginTheme: "21st-dark",
        readerTheme: "21st-dark",
        defaultShow: true,
        position: "bottom"
      }
    })
  }
})
