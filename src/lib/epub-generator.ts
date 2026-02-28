import JSZip from "jszip";
import type { Book, BookChapter } from "./types";

/**
 * EPUB 生成器
 * 将书籍对象打包为标准 EPUB 文件
 */
export class EpubGenerator {
  private zip: JSZip;
  private book: Book;
  private chapters: BookChapter[];

  constructor(book: Book, chapters: BookChapter[]) {
    this.zip = new JSZip();
    this.book = book;
    this.chapters = chapters;
  }

  /**
   * 生成 EPUB Blob 对象
   */
  async generate(): Promise<Blob> {
    // 1. mimetype (必须是第一个文件，且未压缩)
    this.zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

    // 2. META-INF/container.xml
    this.zip.folder("META-INF")?.file("container.xml", this.getContainerXml());

    // 3. OEBPS 目录
    const oebps = this.zip.folder("OEBPS");
    if (!oebps) throw new Error("Failed to create OEBPS folder");

    // 3.1 封面图片 (如果有)
    let coverFilename = "";
    if (this.book.cover) {
      try {
        // 尝试获取图片数据
        const response = await fetch(this.book.cover);
        const blob = await response.blob();
        const ext = blob.type.split("/")[1] || "jpg";
        coverFilename = `cover.${ext}`;
        oebps.file(`Images/${coverFilename}`, blob);
      } catch (e) {
        console.warn("Failed to fetch cover image:", e);
      }
    }

    // 3.2 样式表
    oebps.file("Styles/style.css", this.getCss());

    // 3.3 章节内容
    this.chapters.forEach((chapter, index) => {
      const filename = `Text/chapter_${index + 1}.xhtml`;
      oebps.file(filename, this.getChapterXhtml(chapter, `第 ${index + 1} 章`));
    });

    // 3.4 content.opf
    oebps.file("content.opf", this.getContentOpf(coverFilename));

    // 3.5 toc.ncx (为了兼容性)
    oebps.file("toc.ncx", this.getTocNcx());

    // 生成最终文件
    return await this.zip.generateAsync({
      type: "blob",
      mimeType: "application/epub+zip",
    });
  }

  private getContainerXml(): string {
    return `<?xml version="1.0" encoding="UTF-8" ?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
   <rootfiles>
      <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
   </rootfiles>
</container>`;
  }

  private getCss(): string {
    return `body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; text-align: justify; line-height: 1.6; }
h1, h2 { text-align: center; font-weight: bold; margin-bottom: 1em; }
p { text-indent: 2em; margin: 0.5em 0; }
img { max-width: 100%; height: auto; }`;
  }

  private getChapterXhtml(chapter: BookChapter, defaultTitle: string): string {
    const title = chapter.title || defaultTitle;
    // 处理内容：将换行符转换为 p 标签，简单处理
    const contentHtml = chapter.content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => `<p>${this.escapeHtml(line)}</p>`)
      .join("\n");

    return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${this.escapeHtml(title)}</title>
  <link href="../Styles/style.css" type="text/css" rel="stylesheet"/>
</head>
<body>
  <h2>${this.escapeHtml(title)}</h2>
  ${contentHtml}
</body>
</html>`;
  }

  private getContentOpf(coverFilename: string): string {
    const title = this.escapeHtml(this.book.title);
    const author = this.escapeHtml(this.book.author || "Unknown");
    const uuid =
      this.book.id || "urn:uuid:00000000-0000-0000-0000-000000000000";
    const date = new Date().toISOString().split("T")[0];

    let manifestItems = `<item id="style" href="Styles/style.css" media-type="text/css"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>`;

    if (coverFilename) {
      const ext = coverFilename.split(".").pop();
      const mime = ext === "png" ? "image/png" : "image/jpeg";
      manifestItems += `\n    <item id="cover-image" href="Images/${coverFilename}" media-type="${mime}" properties="cover-image"/>`;
    }

    this.chapters.forEach((_, index) => {
      manifestItems += `\n    <item id="ch${index + 1}" href="Text/chapter_${index + 1}.xhtml" media-type="application/xhtml+xml"/>`;
    });

    let spineItems = "";
    this.chapters.forEach((_, index) => {
      spineItems += `\n    <itemref idref="ch${index + 1}"/>`;
    });

    return `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${title}</dc:title>
    <dc:creator>${author}</dc:creator>
    <dc:language>zh-CN</dc:language>
    <dc:identifier id="BookId">${uuid}</dc:identifier>
    <dc:date>${date}</dc:date>
    <meta name="cover" content="cover-image" />
  </metadata>
  <manifest>
    ${manifestItems}
  </manifest>
  <spine toc="ncx">
    ${spineItems}
  </spine>
</package>`;
  }

  private getTocNcx(): string {
    const title = this.escapeHtml(this.book.title);
    const uuid =
      this.book.id || "urn:uuid:00000000-0000-0000-0000-000000000000";

    let navMap = "";
    this.chapters.forEach((chapter, index) => {
      const chapterTitle = this.escapeHtml(
        chapter.title || `第 ${index + 1} 章`,
      );
      navMap += `
    <navPoint id="navPoint-${index + 1}" playOrder="${index + 1}">
      <navLabel>
        <text>${chapterTitle}</text>
      </navLabel>
      <content src="Text/chapter_${index + 1}.xhtml"/>
    </navPoint>`;
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${uuid}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle>
    <text>${title}</text>
  </docTitle>
  <navMap>
    ${navMap}
  </navMap>
</ncx>`;
  }

  private escapeHtml(text: string): string {
    if (!text) return "";
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }
}
