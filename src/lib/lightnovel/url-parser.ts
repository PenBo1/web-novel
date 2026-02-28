// URL 和 ID 解析工具

/**
 * 从输入中提取哔哩轻小说 ID
 */
export const extractBiliNovelId = (input: string): string => {
  const trimmed = input.trim();

  // 如果是 URL，提取 ID
  if (trimmed.includes("bilinovel.com") || trimmed.includes("linovelib.com")) {
    const match = trimmed.match(
      /(?:bilinovel|linovelib)\.com\/(?:novel|download)\/(\d+)/,
    );
    if (!match) {
      throw new Error("无法识别哔哩轻小说链接");
    }
    return match[1];
  }

  // 如果是纯数字，直接返回
  if (/^\d+$/.test(trimmed)) {
    return trimmed;
  }

  throw new Error("请输入有效的小说 ID（纯数字）或完整链接");
};

/**
 * 从输入中提取轻小说文库 ID
 */
export const extractWenkuNovelId = (input: string): string => {
  const trimmed = input.trim();

  // 如果是 URL，提取 ID
  if (trimmed.includes("wenku8.net")) {
    const match = trimmed.match(/wenku8\.net\/(?:book|novel\/\d+)\/(\d+)/);
    if (!match) {
      throw new Error("无法识别轻小说文库链接");
    }
    return match[1];
  }

  // 如果是纯数字，直接返回
  if (/^\d+$/.test(trimmed)) {
    return trimmed;
  }

  throw new Error("请输入有效的小说 ID（纯数字）或完整链接");
};

/**
 * 解析相对 URL 为绝对 URL
 */
export const resolveUrl = (baseUrl: string, relativeUrl: string): string => {
  if (relativeUrl.startsWith("http")) {
    return relativeUrl;
  }

  const base = baseUrl.substring(0, baseUrl.lastIndexOf("/") + 1);
  return base + relativeUrl;
};
