/**
 * 存储系统使用示例
 * 展示如何使用新的存储 API
 */

import {
  ThemeStorage,
  UIStorage,
  ShortcutsStorage,
  AppStorage,
  ActiveStorage,
  SyncStorage,
  STORAGE_KEYS_LOCAL,
  STORAGE_KEYS_CHROME,
  STORAGE_DEFAULTS,
  exportLocalStorage,
  clearAllLocalStorage,
  exportChromeStorage,
  clearAllChromeStorage,
} from "./index";

// ============ 主题管理示例 ============

export async function exampleThemeManagement() {
  console.log("=== 主题管理示例 ===");

  // 获取当前主题
  const pluginTheme = ThemeStorage.getPluginTheme();
  const readerTheme = ThemeStorage.getReaderTheme();
  console.log(`插件主题: ${pluginTheme}, 阅读条主题: ${readerTheme}`);

  // 切换主题
  ThemeStorage.setPluginTheme("dark");
  ThemeStorage.setReaderTheme("light");
  console.log("主题已切换");

  // 重置为默认主题
  ThemeStorage.setPluginTheme(STORAGE_DEFAULTS.THEME.PLUGIN);
  ThemeStorage.setReaderTheme(STORAGE_DEFAULTS.THEME.READER);
  console.log("主题已重置为默认值");
}

// ============ UI 设置示例 ============

export async function exampleUISettings() {
  console.log("=== UI 设置示例 ===");

  // 获取所有 UI 设置
  const settings = UIStorage.getAll();
  console.log("当前 UI 设置:", settings);

  // 获取单个设置
  const fontSize = UIStorage.getReaderFontSize();
  const position = UIStorage.getReaderPosition();
  console.log(`字体大小: ${fontSize}, 阅读条位置: ${position}`);

  // 修改设置
  UIStorage.setReaderFontSize(14);
  UIStorage.setReaderLineHeight(1.6);
  UIStorage.setReaderPosition("top");
  console.log("UI 设置已更新");

  // 重置为默认值
  UIStorage.setReaderFontSize(STORAGE_DEFAULTS.UI.READER_FONT_SIZE);
  UIStorage.setReaderLineHeight(STORAGE_DEFAULTS.UI.READER_LINE_HEIGHT);
  UIStorage.setReaderPosition(STORAGE_DEFAULTS.UI.READER_POSITION);
  console.log("UI 设置已重置为默认值");
}

// ============ 快捷键管理示例 ============

export async function exampleShortcutsManagement() {
  console.log("=== 快捷键管理示例 ===");

  // 获取快捷键配置
  const shortcuts = ShortcutsStorage.getConfig();
  console.log("当前快捷键配置:", shortcuts);

  // 修改快捷键
  const newShortcuts = [
    { id: "toggleReader", label: "显示/隐藏阅读条", keys: ["Ctrl", "Alt", "C"] },
    { id: "nextPage", label: "下一页", keys: ["ArrowRight"] },
    { id: "prevPage", label: "上一页", keys: ["ArrowLeft"] },
  ];
  ShortcutsStorage.setConfig(newShortcuts);
  console.log("快捷键已更新");

  // 验证更新
  const updated = ShortcutsStorage.getConfig();
  console.log("更新后的快捷键:", updated);
}

// ============ 应用状态示例 ============

export async function exampleAppState() {
  console.log("=== 应用状态示例 ===");

  // 获取最后访问时间
  const lastVisit = AppStorage.getLastVisit();
  console.log(`最后访问时间: ${new Date(lastVisit).toISOString()}`);

  // 更新最后访问时间
  const now = Date.now();
  AppStorage.setLastVisit(now);
  console.log(`已更新最后访问时间为: ${new Date(now).toISOString()}`);

  // 获取版本
  const version = AppStorage.getVersion();
  console.log(`当前版本: ${version}`);

  // 设置版本
  AppStorage.setVersion("0.0.2");
  console.log("版本已更新为 0.0.2");
}

// ============ 活跃状态示例 ============

export async function exampleActiveState() {
  console.log("=== 活跃状态示例 ===");

  // 获取活跃状态
  const bookId = await ActiveStorage.getBookId();
  const chapterIndex = await ActiveStorage.getChapterIndex();
  const scrollPosition = await ActiveStorage.getScrollPosition();
  console.log(`活跃书籍: ${bookId}, 章节: ${chapterIndex}, 滚动: ${scrollPosition}`);

  // 设置活跃状态
  await ActiveStorage.setBookId("book-123");
  await ActiveStorage.setChapterIndex(5);
  await ActiveStorage.setScrollPosition(100);
  console.log("活跃状态已更新");

  // 获取所有活跃状态
  const activeState = await ActiveStorage.getAll();
  console.log("当前活跃状态:", activeState);

  // 清除活跃状态
  await ActiveStorage.clear();
  console.log("活跃状态已清除");
}

// ============ 同步标记示例 ============

export async function exampleSyncStorage() {
  console.log("=== 同步标记示例 ===");

  // 获取最后同步时间
  const lastSync = await SyncStorage.getLastSync();
  console.log(`最后同步时间: ${new Date(lastSync).toISOString()}`);

  // 更新同步时间
  const now = Date.now();
  await SyncStorage.setLastSync(now);
  console.log(`已更新同步时间为: ${new Date(now).toISOString()}`);
}

// ============ 数据导出示例 ============

export async function exampleDataExport() {
  console.log("=== 数据导出示例 ===");

  // 导出 localStorage 数据
  const localData = exportLocalStorage();
  console.log("localStorage 数据:", localData);

  // 导出 chrome.storage.local 数据
  const chromeData = await exportChromeStorage();
  console.log("chrome.storage.local 数据:", chromeData);

  // 导出所有数据
  const allData = {
    localStorage: localData,
    chromeStorage: chromeData,
  };
  console.log("所有数据:", allData);

  // 可以保存为 JSON 文件
  const json = JSON.stringify(allData, null, 2);
  console.log("JSON 格式:", json);
}

// ============ 数据清除示例 ============

export async function exampleDataClear() {
  console.log("=== 数据清除示例 ===");

  // 清除 localStorage 数据
  console.log("正在清除 localStorage 数据...");
  clearAllLocalStorage();
  console.log("localStorage 数据已清除");

  // 清除 chrome.storage.local 数据
  console.log("正在清除 chrome.storage.local 数据...");
  await clearAllChromeStorage();
  console.log("chrome.storage.local 数据已清除");

  // 验证数据已清除
  const localData = exportLocalStorage();
  const chromeData = await exportChromeStorage();
  console.log("清除后的 localStorage 数据:", localData);
  console.log("清除后的 chrome.storage.local 数据:", chromeData);
}

// ============ 键名常量示例 ============

export async function exampleStorageKeys() {
  console.log("=== 键名常量示例 ===");

  // localStorage 键
  console.log("localStorage 键:");
  console.log("  THEME.PLUGIN:", STORAGE_KEYS_LOCAL.THEME.PLUGIN);
  console.log("  THEME.READER:", STORAGE_KEYS_LOCAL.THEME.READER);
  console.log("  SHORTCUTS.CONFIG:", STORAGE_KEYS_LOCAL.SHORTCUTS.CONFIG);
  console.log("  UI.READER_VISIBLE:", STORAGE_KEYS_LOCAL.UI.READER_VISIBLE);
  console.log("  UI.READER_POSITION:", STORAGE_KEYS_LOCAL.UI.READER_POSITION);
  console.log("  UI.READER_FONT_SIZE:", STORAGE_KEYS_LOCAL.UI.READER_FONT_SIZE);
  console.log("  UI.READER_LINE_HEIGHT:", STORAGE_KEYS_LOCAL.UI.READER_LINE_HEIGHT);
  console.log("  UI.DEFAULT_SHOW:", STORAGE_KEYS_LOCAL.UI.DEFAULT_SHOW);
  console.log("  UI.PAGE_SIZE:", STORAGE_KEYS_LOCAL.UI.PAGE_SIZE);
  console.log("  APP.LAST_VISIT:", STORAGE_KEYS_LOCAL.APP.LAST_VISIT);
  console.log("  APP.VERSION:", STORAGE_KEYS_LOCAL.APP.VERSION);

  // chrome.storage.local 键
  console.log("\nchrome.storage.local 键:");
  console.log("  ACTIVE.BOOK_ID:", STORAGE_KEYS_CHROME.ACTIVE.BOOK_ID);
  console.log("  ACTIVE.CHAPTER_INDEX:", STORAGE_KEYS_CHROME.ACTIVE.CHAPTER_INDEX);
  console.log("  ACTIVE.SCROLL_POSITION:", STORAGE_KEYS_CHROME.ACTIVE.SCROLL_POSITION);
  console.log("  ACTIVE.CHAPTERS:", STORAGE_KEYS_CHROME.ACTIVE.CHAPTERS);
  console.log("  SYNC.LAST_SYNC:", STORAGE_KEYS_CHROME.SYNC.LAST_SYNC);
}

// ============ 默认值示例 ============

export async function exampleStorageDefaults() {
  console.log("=== 默认值示例 ===");

  console.log("主题默认值:", STORAGE_DEFAULTS.THEME);
  console.log("UI 默认值:", STORAGE_DEFAULTS.UI);
  console.log("活跃状态默认值:", STORAGE_DEFAULTS.ACTIVE);
}

// ============ 完整工作流示例 ============

export async function exampleCompleteWorkflow() {
  console.log("=== 完整工作流示例 ===");

  // 1. 初始化应用
  console.log("1. 初始化应用");
  AppStorage.setLastVisit(Date.now());
  AppStorage.setVersion("0.0.1");

  // 2. 加载用户配置
  console.log("2. 加载用户配置");
  const theme = ThemeStorage.getPluginTheme();
  const uiSettings = UIStorage.getAll();
  const shortcuts = ShortcutsStorage.getConfig();
  console.log("配置已加载:", { theme, uiSettings, shortcuts });

  // 3. 加载活跃状态
  console.log("3. 加载活跃状态");
  const activeState = await ActiveStorage.getAll();
  console.log("活跃状态已加载:", activeState);

  // 4. 用户操作 - 修改设置
  console.log("4. 用户修改设置");
  ThemeStorage.setPluginTheme("dark");
  UIStorage.setReaderFontSize(14);
  console.log("设置已保存");

  // 5. 用户操作 - 打开书籍
  console.log("5. 用户打开书籍");
  await ActiveStorage.setBookId("book-456");
  await ActiveStorage.setChapterIndex(10);
  await ActiveStorage.setScrollPosition(500);
  console.log("书籍状态已保存");

  // 6. 导出数据（用于备份）
  console.log("6. 导出数据");
  const backup = {
    localStorage: exportLocalStorage(),
    chromeStorage: await exportChromeStorage(),
  };
  console.log("数据已导出:", backup);

  // 7. 应用关闭前的清理
  console.log("7. 应用关闭前的清理");
  await SyncStorage.setLastSync(Date.now());
  console.log("同步时间已更新");
}

// ============ 运行所有示例 ============

export async function runAllExamples() {
  console.log("========================================");
  console.log("   存储系统使用示例");
  console.log("========================================\n");

  try {
    await exampleThemeManagement();
    console.log();

    await exampleUISettings();
    console.log();

    await exampleShortcutsManagement();
    console.log();

    await exampleAppState();
    console.log();

    await exampleActiveState();
    console.log();

    await exampleSyncStorage();
    console.log();

    await exampleStorageKeys();
    console.log();

    await exampleStorageDefaults();
    console.log();

    await exampleDataExport();
    console.log();

    await exampleCompleteWorkflow();
    console.log();

    console.log("========================================");
    console.log("   所有示例执行完成");
    console.log("========================================");
  } catch (error) {
    console.error("示例执行出错:", error);
  }
}

// 在浏览器控制台中运行示例
// import { runAllExamples } from "@/lib/storage/examples";
// runAllExamples();
