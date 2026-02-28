/**
 * 搜索调试工具 - 诊断搜索结果问题
 *
 * 问题分析：
 * 1. 搜索成功获取数据，但结果为空
 * 2. 可能原因：
 *    - 选择器不匹配（网站结构变化）
 *    - 数据解析失败（属性提取错误）
 *    - 网络请求失败（后台通信问题）
 *    - 结果过滤过严格（bookName 或 bookUrl 为空）
 */

import type { ScraperRule, SearchResult } from "./types";

export interface DebugInfo {
  rule: string;
  keyword: string;
  htmlLength: number;
  itemsFound: number;
  itemsProcessed: number;
  itemsFiltered: number;
  results: SearchResult[];
  errors: string[];
  warnings: string[];
}

export class SearchDebugger {
  /**
   * 调试搜索过程
   */
  static debugSearch(
    rule: ScraperRule,
    keyword: string,
    html: string,
    parseContent: (
      html: string | HTMLElement | Document | Element,
      query: string,
      type?: "text" | "html" | "attr",
      attrName?: string,
    ) => string,
  ): DebugInfo {
    const debug: DebugInfo = {
      rule: rule.name,
      keyword,
      htmlLength: html.length,
      itemsFound: 0,
      itemsProcessed: 0,
      itemsFiltered: 0,
      results: [],
      errors: [],
      warnings: [],
    };

    try {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const searchRule = rule.search;

      // 检查选择器是否有效
      if (!searchRule.result) {
        debug.errors.push("搜索规则缺少 result 选择器");
        return debug;
      }

      const items = doc.querySelectorAll(searchRule.result);
      debug.itemsFound = items.length;

      if (items.length === 0) {
        debug.warnings.push(
          `未找到匹配的搜索结果项，选择器: ${searchRule.result}`,
        );
        debug.warnings.push(`HTML 长度: ${html.length}，可能网站结构已变化`);
        return debug;
      }

      items.forEach((item, index) => {
        debug.itemsProcessed++;

        try {
          // 提取书名
          const bookName = parseContent(item, searchRule.bookName);
          if (!bookName) {
            debug.warnings.push(
              `[项目 ${index}] 书名为空，选择器: ${searchRule.bookName}`,
            );
            debug.itemsFiltered++;
            return;
          }

          // 提取书籍 URL
          let bookUrl = parseContent(item, searchRule.bookName, "attr", "href");
          if (!bookUrl) {
            debug.warnings.push(
              `[项目 ${index}] 书籍 URL 为空，书名: ${bookName}`,
            );
            debug.itemsFiltered++;
            return;
          }

          // 提取作者
          const author = parseContent(item, searchRule.author);
          if (!author) {
            debug.warnings.push(`[项目 ${index}] 作者为空，书名: ${bookName}`);
          }

          // 提取其他信息
          const latestChapter = searchRule.latestChapter
            ? parseContent(item, searchRule.latestChapter)
            : undefined;
          const lastUpdateTime = searchRule.lastUpdateTime
            ? parseContent(item, searchRule.lastUpdateTime)
            : undefined;

          const result: SearchResult = {
            sourceId: rule.id,
            bookName,
            url: new URL(bookUrl, rule.url).href,
            author: author || "未知作者",
            latestChapter,
            lastUpdateTime,
            category: searchRule.category
              ? parseContent(item, searchRule.category)
              : undefined,
            status: searchRule.status
              ? parseContent(item, searchRule.status)
              : undefined,
            wordCount: searchRule.wordCount
              ? parseContent(item, searchRule.wordCount)
              : undefined,
          };

          debug.results.push(result);
        } catch (e) {
          debug.errors.push(
            `[项目 ${index}] 解析失败: ${(e as Error).message}`,
          );
        }
      });
    } catch (e) {
      debug.errors.push(`HTML 解析失败: ${(e as Error).message}`);
    }

    return debug;
  }

  /**
   * 生成调试报告
   */
  static generateReport(debug: DebugInfo): string {
    const lines: string[] = [
      `\n========== 搜索调试报告 ==========`,
      `书源: ${debug.rule}`,
      `关键词: ${debug.keyword}`,
      `HTML 大小: ${debug.htmlLength} 字节`,
      `\n--- 统计信息 ---`,
      `找到的项目: ${debug.itemsFound}`,
      `处理的项目: ${debug.itemsProcessed}`,
      `过滤的项目: ${debug.itemsFiltered}`,
      `成功的结果: ${debug.results.length}`,
      `\n--- 错误信息 ---`,
    ];

    if (debug.errors.length === 0) {
      lines.push("无错误");
    } else {
      debug.errors.forEach((err) => lines.push(`❌ ${err}`));
    }

    lines.push(`\n--- 警告信息 ---`);
    if (debug.warnings.length === 0) {
      lines.push("无警告");
    } else {
      debug.warnings.slice(0, 10).forEach((warn) => lines.push(`⚠️  ${warn}`));
      if (debug.warnings.length > 10) {
        lines.push(`... 还有 ${debug.warnings.length - 10} 条警告`);
      }
    }

    lines.push(`\n--- 搜索结果 ---`);
    if (debug.results.length === 0) {
      lines.push("无结果");
    } else {
      debug.results.slice(0, 5).forEach((result, i) => {
        lines.push(`${i + 1}. ${result.bookName} - ${result.author}`);
        lines.push(`   URL: ${result.url}`);
      });
      if (debug.results.length > 5) {
        lines.push(`... 还有 ${debug.results.length - 5} 个结果`);
      }
    }

    lines.push(`\n================================\n`);
    return lines.join("\n");
  }

  /**
   * 诊断常见问题
   */
  static diagnose(debug: DebugInfo): string[] {
    const suggestions: string[] = [];

    if (debug.itemsFound === 0) {
      suggestions.push("❌ 未找到搜索结果项");
      suggestions.push("   → 检查 result 选择器是否正确");
      suggestions.push("   → 网站可能已更新结构，需要更新规则");
      suggestions.push("   → 尝试在浏览器开发者工具中验证选择器");
    }

    if (debug.itemsFound > 0 && debug.results.length === 0) {
      suggestions.push("❌ 找到了项目但无法提取数据");
      suggestions.push("   → 检查 bookName 选择器");
      suggestions.push(
        "   → 检查 bookName 属性是否为 href（应该在 <a> 标签上）",
      );
      suggestions.push("   → 检查 author 选择器");
    }

    if (debug.itemsFiltered > 0) {
      suggestions.push(`⚠️  有 ${debug.itemsFiltered} 个项目被过滤`);
      suggestions.push("   → 可能是书名或 URL 为空");
      suggestions.push("   → 检查选择器是否过于严格");
    }

    if (debug.errors.length > 0) {
      suggestions.push(`❌ 有 ${debug.errors.length} 个解析错误`);
      suggestions.push("   → 检查 HTML 结构是否有特殊字符");
      suggestions.push("   → 检查选择器语法是否正确");
    }

    if (debug.results.length > 0) {
      suggestions.push(`✅ 成功获取 ${debug.results.length} 个结果`);
    }

    return suggestions;
  }
}
