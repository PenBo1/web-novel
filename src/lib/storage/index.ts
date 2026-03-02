/**
 * 存储系统统一导出
 * 提供所有存储相关的 API
 */

export * from "./constants";
export * from "./local-storage";
export * from "./chrome-storage";

// ============ 便捷导出 ============

export {
  getLocalStorageValue,
  setLocalStorageValue,
  removeLocalStorageValue,
  clearAllLocalStorage,
  exportLocalStorage,
  ThemeStorage,
  ShortcutsStorage,
  UIStorage,
  AppStorage,
} from "./local-storage";

export {
  getChromeStorageValue,
  setChromeStorageValue,
  removeChromeStorageValue,
  clearAllChromeStorage,
  exportChromeStorage,
  ActiveStorage,
  SyncStorage,
} from "./chrome-storage";
