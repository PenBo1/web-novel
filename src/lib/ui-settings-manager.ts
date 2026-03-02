/**
 * UI 设置管理器
 * 统一管理阅读条的 UI 相关设置
 */

import { LOCAL_STORAGE_KEYS, getLocalStorage, setLocalStorage } from "./local-storage-keys";

export interface UISettings {
  readerVisible: boolean;
  readerPosition: "top" | "bottom";
  readerFontSize: number;
  readerLineHeight: number;
  defaultShow: boolean;
  pageSize: number;
}

const DEFAULT_UI_SETTINGS: UISettings = {
  readerVisible: true,
  readerPosition: "bottom",
  readerFontSize: 13,
  readerLineHeight: 1.5,
  defaultShow: true,
  pageSize: 50,
};

/**
 * UI 设置管理器
 */
export const UISettingsManager = {
  /**
   * 获取所有 UI 设置
   */
  getUISettings(): UISettings {
    return {
      readerVisible: getLocalStorage<boolean>(
        LOCAL_STORAGE_KEYS.UI.READER_VISIBLE,
        DEFAULT_UI_SETTINGS.readerVisible
      ) ?? DEFAULT_UI_SETTINGS.readerVisible,
      readerPosition: getLocalStorage<"top" | "bottom">(
        LOCAL_STORAGE_KEYS.UI.READER_POSITION,
        DEFAULT_UI_SETTINGS.readerPosition
      ) ?? DEFAULT_UI_SETTINGS.readerPosition,
      readerFontSize: getLocalStorage<number>(
        LOCAL_STORAGE_KEYS.UI.READER_FONT_SIZE,
        DEFAULT_UI_SETTINGS.readerFontSize
      ) ?? DEFAULT_UI_SETTINGS.readerFontSize,
      readerLineHeight: getLocalStorage<number>(
        LOCAL_STORAGE_KEYS.UI.READER_LINE_HEIGHT,
        DEFAULT_UI_SETTINGS.readerLineHeight
      ) ?? DEFAULT_UI_SETTINGS.readerLineHeight,
      defaultShow: getLocalStorage<boolean>(
        LOCAL_STORAGE_KEYS.READER.DEFAULT_SHOW,
        DEFAULT_UI_SETTINGS.defaultShow
      ) ?? DEFAULT_UI_SETTINGS.defaultShow,
      pageSize: getLocalStorage<number>(
        LOCAL_STORAGE_KEYS.READER.PAGE_SIZE,
        DEFAULT_UI_SETTINGS.pageSize
      ) ?? DEFAULT_UI_SETTINGS.pageSize,
    };
  },

  /**
   * 设置阅读条可见性
   */
  setReaderVisible(visible: boolean): void {
    console.log(`[UISettingsManager] Setting reader visible to: ${visible}`);
    setLocalStorage(LOCAL_STORAGE_KEYS.UI.READER_VISIBLE, visible);
  },

  /**
   * 获取阅读条可见性
   */
  getReaderVisible(): boolean {
    return getLocalStorage<boolean>(
      LOCAL_STORAGE_KEYS.UI.READER_VISIBLE,
      DEFAULT_UI_SETTINGS.readerVisible
    ) ?? DEFAULT_UI_SETTINGS.readerVisible;
  },

  /**
   * 设置阅读条位置
   */
  setReaderPosition(position: "top" | "bottom"): void {
    console.log(`[UISettingsManager] Setting reader position to: ${position}`);
    setLocalStorage(LOCAL_STORAGE_KEYS.UI.READER_POSITION, position);
  },

  /**
   * 获取阅读条位置
   */
  getReaderPosition(): "top" | "bottom" {
    return getLocalStorage<"top" | "bottom">(
      LOCAL_STORAGE_KEYS.UI.READER_POSITION,
      DEFAULT_UI_SETTINGS.readerPosition
    ) ?? DEFAULT_UI_SETTINGS.readerPosition;
  },

  /**
   * 设置阅读条字体大小
   */
  setReaderFontSize(size: number): void {
    if (size < 10 || size > 20) {
      console.warn(`[UISettingsManager] Font size out of range: ${size}`);
      return;
    }
    console.log(`[UISettingsManager] Setting reader font size to: ${size}`);
    setLocalStorage(LOCAL_STORAGE_KEYS.UI.READER_FONT_SIZE, size);
  },

  /**
   * 获取阅读条字体大小
   */
  getReaderFontSize(): number {
    return getLocalStorage<number>(
      LOCAL_STORAGE_KEYS.UI.READER_FONT_SIZE,
      DEFAULT_UI_SETTINGS.readerFontSize
    ) ?? DEFAULT_UI_SETTINGS.readerFontSize;
  },

  /**
   * 设置阅读条行高
   */
  setReaderLineHeight(height: number): void {
    if (height < 1 || height > 2) {
      console.warn(`[UISettingsManager] Line height out of range: ${height}`);
      return;
    }
    console.log(`[UISettingsManager] Setting reader line height to: ${height}`);
    setLocalStorage(LOCAL_STORAGE_KEYS.UI.READER_LINE_HEIGHT, height);
  },

  /**
   * 获取阅读条行高
   */
  getReaderLineHeight(): number {
    return getLocalStorage<number>(
      LOCAL_STORAGE_KEYS.UI.READER_LINE_HEIGHT,
      DEFAULT_UI_SETTINGS.readerLineHeight
    ) ?? DEFAULT_UI_SETTINGS.readerLineHeight;
  },

  /**
   * 设置默认显示
   */
  setDefaultShow(show: boolean): void {
    console.log(`[UISettingsManager] Setting default show to: ${show}`);
    setLocalStorage(LOCAL_STORAGE_KEYS.READER.DEFAULT_SHOW, show);
  },

  /**
   * 获取默认显示
   */
  getDefaultShow(): boolean {
    return getLocalStorage<boolean>(
      LOCAL_STORAGE_KEYS.READER.DEFAULT_SHOW,
      DEFAULT_UI_SETTINGS.defaultShow
    ) ?? DEFAULT_UI_SETTINGS.defaultShow;
  },

  /**
   * 设置每屏字符数
   */
  setPageSize(size: number): void {
    if (size < 20 || size > 200) {
      console.warn(`[UISettingsManager] Page size out of range: ${size}`);
      return;
    }
    console.log(`[UISettingsManager] Setting page size to: ${size}`);
    setLocalStorage(LOCAL_STORAGE_KEYS.READER.PAGE_SIZE, size);
  },

  /**
   * 获取每屏字符数
   */
  getPageSize(): number {
    return getLocalStorage<number>(
      LOCAL_STORAGE_KEYS.READER.PAGE_SIZE,
      DEFAULT_UI_SETTINGS.pageSize
    ) ?? DEFAULT_UI_SETTINGS.pageSize;
  },

  /**
   * 重置为默认设置
   */
  resetToDefaults(): void {
    console.log("[UISettingsManager] Resetting to default UI settings");
    setLocalStorage(LOCAL_STORAGE_KEYS.UI.READER_VISIBLE, DEFAULT_UI_SETTINGS.readerVisible);
    setLocalStorage(LOCAL_STORAGE_KEYS.UI.READER_POSITION, DEFAULT_UI_SETTINGS.readerPosition);
    setLocalStorage(LOCAL_STORAGE_KEYS.UI.READER_FONT_SIZE, DEFAULT_UI_SETTINGS.readerFontSize);
    setLocalStorage(LOCAL_STORAGE_KEYS.UI.READER_LINE_HEIGHT, DEFAULT_UI_SETTINGS.readerLineHeight);
    setLocalStorage(LOCAL_STORAGE_KEYS.READER.DEFAULT_SHOW, DEFAULT_UI_SETTINGS.defaultShow);
    setLocalStorage(LOCAL_STORAGE_KEYS.READER.PAGE_SIZE, DEFAULT_UI_SETTINGS.pageSize);
  },

  /**
   * 导出 UI 设置
   */
  exportSettings(): string {
    const settings = this.getUISettings();
    return JSON.stringify(settings, null, 2);
  },

  /**
   * 导入 UI 设置
   */
  importSettings(json: string): boolean {
    try {
      const settings = JSON.parse(json) as UISettings;
      
      // 验证设置
      if (typeof settings.readerVisible !== "boolean") return false;
      if (!["top", "bottom"].includes(settings.readerPosition)) return false;
      if (typeof settings.readerFontSize !== "number" || settings.readerFontSize < 10 || settings.readerFontSize > 20) return false;
      if (typeof settings.readerLineHeight !== "number" || settings.readerLineHeight < 1 || settings.readerLineHeight > 2) return false;
      if (typeof settings.defaultShow !== "boolean") return false;
      if (typeof settings.pageSize !== "number" || settings.pageSize < 20 || settings.pageSize > 200) return false;
      
      // 应用设置
      setLocalStorage(LOCAL_STORAGE_KEYS.UI.READER_VISIBLE, settings.readerVisible);
      setLocalStorage(LOCAL_STORAGE_KEYS.UI.READER_POSITION, settings.readerPosition);
      setLocalStorage(LOCAL_STORAGE_KEYS.UI.READER_FONT_SIZE, settings.readerFontSize);
      setLocalStorage(LOCAL_STORAGE_KEYS.UI.READER_LINE_HEIGHT, settings.readerLineHeight);
      setLocalStorage(LOCAL_STORAGE_KEYS.READER.DEFAULT_SHOW, settings.defaultShow);
      setLocalStorage(LOCAL_STORAGE_KEYS.READER.PAGE_SIZE, settings.pageSize);
      
      console.log("[UISettingsManager] UI settings imported successfully");
      return true;
    } catch (error) {
      console.error("[UISettingsManager] Failed to import UI settings:", error);
      return false;
    }
  },
};
