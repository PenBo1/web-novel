/**
 * 应用状态管理器
 * 管理应用级别的状态信息
 */

import { LOCAL_STORAGE_KEYS, getLocalStorage, setLocalStorage } from "./local-storage-keys";

export interface AppState {
  lastVisit: number;
  version: string;
}

const CURRENT_VERSION = "0.0.1";

/**
 * 应用状态管理器
 */
export const AppStateManager = {
  /**
   * 获取应用状态
   */
  getAppState(): AppState {
    return {
      lastVisit: getLocalStorage<number>(
        LOCAL_STORAGE_KEYS.APP.LAST_VISIT,
        0
      ) ?? 0,
      version: getLocalStorage<string>(
        LOCAL_STORAGE_KEYS.APP.VERSION,
        CURRENT_VERSION
      ) ?? CURRENT_VERSION,
    };
  },

  /**
   * 更新最后访问时间
   */
  updateLastVisit(): void {
    const now = Date.now();
    console.log(`[AppStateManager] Updating last visit to: ${new Date(now).toISOString()}`);
    setLocalStorage(LOCAL_STORAGE_KEYS.APP.LAST_VISIT, now);
  },

  /**
   * 获取最后访问时间
   */
  getLastVisit(): number {
    return getLocalStorage<number>(
      LOCAL_STORAGE_KEYS.APP.LAST_VISIT,
      0
    ) ?? 0;
  },

  /**
   * 获取最后访问时间的格式化字符串
   */
  getLastVisitFormatted(): string {
    const timestamp = this.getLastVisit();
    if (timestamp === 0) return "从未访问";
    return new Date(timestamp).toLocaleString("zh-CN");
  },

  /**
   * 获取应用版本
   */
  getVersion(): string {
    return getLocalStorage<string>(
      LOCAL_STORAGE_KEYS.APP.VERSION,
      CURRENT_VERSION
    ) ?? CURRENT_VERSION;
  },

  /**
   * 检查是否是首次访问
   */
  isFirstVisit(): boolean {
    return this.getLastVisit() === 0;
  },

  /**
   * 检查是否是版本升级
   */
  isVersionUpgrade(): boolean {
    const storedVersion = this.getVersion();
    return storedVersion !== CURRENT_VERSION;
  },

  /**
   * 处理版本升级
   */
  handleVersionUpgrade(): void {
    const oldVersion = this.getVersion();
    console.log(`[AppStateManager] Version upgrade: ${oldVersion} → ${CURRENT_VERSION}`);
    
    // 更新版本
    setLocalStorage(LOCAL_STORAGE_KEYS.APP.VERSION, CURRENT_VERSION);
    
    // 这里可以添加版本升级的迁移逻辑
    // 例如：数据格式转换、新功能初始化等
  },

  /**
   * 初始化应用状态
   */
  initializeAppState(): void {
    console.log("[AppStateManager] Initializing app state");
    
    // 检查是否是首次访问
    if (this.isFirstVisit()) {
      console.log("[AppStateManager] First visit detected");
      this.updateLastVisit();
      setLocalStorage(LOCAL_STORAGE_KEYS.APP.VERSION, CURRENT_VERSION);
    }
    
    // 检查是否是版本升级
    if (this.isVersionUpgrade()) {
      this.handleVersionUpgrade();
    }
    
    // 更新最后访问时间
    this.updateLastVisit();
  },

  /**
   * 获取应用运行时间（从首次访问到现在）
   */
  getAppRuntime(): number {
    const firstVisit = this.getLastVisit();
    if (firstVisit === 0) return 0;
    return Date.now() - firstVisit;
  },

  /**
   * 获取应用运行时间的格式化字符串
   */
  getAppRuntimeFormatted(): string {
    const runtime = this.getAppRuntime();
    if (runtime === 0) return "0 秒";
    
    const seconds = Math.floor(runtime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} 天 ${hours % 24} 小时`;
    if (hours > 0) return `${hours} 小时 ${minutes % 60} 分钟`;
    if (minutes > 0) return `${minutes} 分钟 ${seconds % 60} 秒`;
    return `${seconds} 秒`;
  },

  /**
   * 导出应用状态
   */
  exportAppState(): string {
    const state = this.getAppState();
    return JSON.stringify({
      ...state,
      lastVisitFormatted: this.getLastVisitFormatted(),
      isFirstVisit: this.isFirstVisit(),
      isVersionUpgrade: this.isVersionUpgrade(),
      runtimeFormatted: this.getAppRuntimeFormatted(),
    }, null, 2);
  },

  /**
   * 清除应用状态（谨慎使用）
   */
  clearAppState(): void {
    console.warn("[AppStateManager] Clearing app state");
    localStorage.removeItem(LOCAL_STORAGE_KEYS.APP.LAST_VISIT);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.APP.VERSION);
  },
};
