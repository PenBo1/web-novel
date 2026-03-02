/**
 * IndexedDB 初始化模块
 * 在应用启动时确保所有数据正确初始化
 */

import { IDBMigrationManager } from "./idb-storage";

let initialized = false;

/**
 * 初始化 IndexedDB
 * 应在应用启动时调用一次
 */
export async function initializeIDB(): Promise<void> {
  if (initialized) return;

  try {
    console.log("[IDB] Initializing IndexedDB...");

    // 初始化默认数据
    await IDBMigrationManager.initializeDefaults();

    // 验证数据完整性
    const integrity = await IDBMigrationManager.verifyDataIntegrity();
    console.log("[IDB] Data integrity check:", integrity);

    if (!integrity.rules) {
      console.warn("[IDB] Rules data is missing, reinitializing...");
      await IDBMigrationManager.initializeDefaults();
    }

    initialized = true;
    console.log("[IDB] IndexedDB initialized successfully");
  } catch (error) {
    console.error("[IDB] Failed to initialize IndexedDB:", error);
    throw error;
  }
}

/**
 * 检查 IndexedDB 是否已初始化
 */
export function isIDBInitialized(): boolean {
  return initialized;
}

/**
 * 重置初始化状态（用于测试）
 */
export function resetInitializationState(): void {
  initialized = false;
}
