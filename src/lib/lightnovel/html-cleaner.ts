// HTML 内容清理工具，参考 bili_novel_packer 的实现

/**
 * 规范化文本内容，处理特殊字符和编码问题
 */
export const normalizeText = (text: string): string => {
  if (!text) return "";

  // 移除零宽字符和其他不可见字符
  let normalized = text.replace(/[\u200B-\u200D\uFEFF]/g, "");

  // 修复常见的乱码模式（替换为正确的 UTF-8 字符）
  normalized = normalized
    .replace(/\ufffd/g, "") // 移除替换字符
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ""); // 移除控制字符

  return normalized;
};

/**
 * 移除指定的元素列表
 */
export const removeElements = (elements: Element[]): void => {
  elements.forEach((el) => el.remove());
};

/**
 * 递归移除元素中的换行符
 */
export const removeLineBreaks = (element: Element): void => {
  if (element.children.length > 0) {
    Array.from(element.children).forEach((child) => {
      removeLineBreaks(child as Element);
    });
  } else if (element.textContent) {
    element.textContent = element.textContent.replace(/\n/g, "");
  }
};

/**
 * 根据正则模式移除元素
 * 支持按 id、tagName、className 匹配
 */
export const removeElementsByPattern = (
  element: Element,
  pattern: string,
  options: {
    matchId?: boolean;
    matchTagName?: boolean;
    matchClassName?: boolean;
  } = { matchTagName: true },
): void => {
  const regExp = new RegExp(pattern);
  const id = element.id;
  const tagName = element.tagName.toLowerCase();
  const className = element.className;

  // 检查是否匹配移除条件
  if (options.matchId && regExp.test(id)) {
    element.remove();
    return;
  }
  if (options.matchTagName && regExp.test(tagName)) {
    element.remove();
    return;
  }
  if (options.matchClassName && regExp.test(className)) {
    element.remove();
    return;
  }

  // 递归处理子元素
  const children = Array.from(element.children);
  children.forEach((child) => {
    removeElementsByPattern(child as Element, pattern, options);
  });
};

/**
 * 规范化元素中的所有文本节点
 */
export const normalizeTextNodes = (element: Element): void => {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);

  const nodesToUpdate: Text[] = [];
  let node: Node | null;

  while ((node = walker.nextNode())) {
    if (node.nodeValue) {
      nodesToUpdate.push(node as Text);
    }
  }

  nodesToUpdate.forEach((textNode) => {
    textNode.nodeValue = normalizeText(textNode.nodeValue || "");
  });
};

/**
 * 清理哔哩轻小说的内容
 * 按照特定顺序移除元素，确保内容正确
 */
export const cleanBiliContent = (element: Element): void => {
  // 按照 Dart 实现的顺序移除元素
  removeElements(Array.from(element.querySelectorAll("div")));
  removeElements(Array.from(element.querySelectorAll("ins")));
  removeElements(Array.from(element.querySelectorAll("figure")));
  removeElements(Array.from(element.querySelectorAll("fig")));
  removeElements(Array.from(element.querySelectorAll("br")));
  removeElements(Array.from(element.querySelectorAll("script")));
  removeElements(Array.from(element.querySelectorAll(".tp")));
  removeElements(Array.from(element.querySelectorAll(".bd")));

  // 移除特定模式的元素（广告 ID，如 a1234）
  removeElementsByPattern(element, "[a-z]\\d{4}", { matchId: true });

  // 规范化所有文本节点
  normalizeTextNodes(element);
};

/**
 * 清理轻小说文库的内容
 * 移除导航、脚本等无关元素
 */
export const cleanWenkuContent = (element: Element): void => {
  // 按照 Dart 实现的顺序移除元素
  removeElements(Array.from(element.querySelectorAll("#contentdp")));
  removeElements(Array.from(element.querySelectorAll("br")));
  removeElements(Array.from(element.querySelectorAll("script")));

  // 递归移除换行符
  removeLineBreaks(element);

  // 规范化所有文本节点
  normalizeTextNodes(element);
};

/**
 * 处理图片懒加载：将 data-src 转换为 src
 */
export const replaceImageSrc = (element: Element): void => {
  const images = element.querySelectorAll("img");

  images.forEach((img) => {
    let src = img.getAttribute("data-src") || img.getAttribute("src");

    if (!src) {
      img.remove();
      return;
    }

    // 过滤 src 有问题的 img（包含 < 字符）
    if (src.includes("<")) {
      img.remove();
      return;
    }

    // 处理协议相对 URL
    if (src.startsWith("//")) {
      src = "https:" + src;
    }

    img.setAttribute("src", src);

    // 移除无效属性，只保留必要的属性
    const validAttrs = [
      "alt",
      "class",
      "dir",
      "height",
      "id",
      "ismap",
      "lang",
      "longdesc",
      "style",
      "title",
      "usemap",
      "width",
      "src",
      "xml:lang",
    ];
    const attrsToRemove: string[] = [];

    img.getAttributeNames().forEach((attr) => {
      if (!validAttrs.includes(attr)) {
        attrsToRemove.push(attr);
      }
    });

    attrsToRemove.forEach((attr) => img.removeAttribute(attr));

    // 确保有 alt 属性
    if (!img.hasAttribute("alt")) {
      img.setAttribute("alt", "");
    }
  });
};

/**
 * 根据来源提取章节内容
 */
export const extractChapterContent = (
  doc: Document,
  source: "bili" | "wenku",
): string => {
  let contentElement: Element | null = null;

  if (source === "bili") {
    // 哔哩轻小说：优先使用 #acontent，备用 .bcontent
    contentElement =
      doc.querySelector("#acontent") || doc.querySelector(".bcontent");
    if (contentElement) {
      cleanBiliContent(contentElement);
      replaceImageSrc(contentElement);
    }
  } else if (source === "wenku") {
    // 轻小说文库：使用 #content
    contentElement = doc.querySelector("#content");
    if (contentElement) {
      cleanWenkuContent(contentElement);
    }
  }

  return contentElement?.innerHTML || "";
};
