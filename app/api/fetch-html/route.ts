import { NextRequest, NextResponse } from "next/server";
import { html as beautifyHtml } from "js-beautify";
import * as cheerio from "cheerio";

// Extract clean text from HTML with proper formatting
function extractText(html: string): string {
  const $ = cheerio.load(html);

  // Remove unwanted elements
  $("script").remove();
  $("style").remove();
  $("noscript").remove();
  $("iframe").remove();
  $("svg").remove();
  $("head").remove();
  $("nav").remove();
  $("footer").remove();
  $("header").remove();
  $("[hidden]").remove();
  $('[style*="display: none"]').remove();
  $('[style*="display:none"]').remove();
  $('[aria-hidden="true"]').remove();
  $("button").remove();
  $("input").remove();
  $("select").remove();
  $("form").remove();
  $(".advertisement").remove();
  $(".ads").remove();
  $('[role="navigation"]').remove();
  $('[role="banner"]').remove();
  $('[role="complementary"]').remove();

  const lines: string[] = [];
  const seen = new Set<string>();

  // Get title
  const title = $("title").text().trim();
  if (title) {
    lines.push(title);
    lines.push("=".repeat(Math.min(title.length, 50)));
    lines.push("");
    seen.add(title.toLowerCase());
  }

  // Process block elements in order
  $("body")
    .find("h1, h2, h3, h4, h5, h6, p, article, section, main, li, td, th, blockquote, figcaption")
    .each((_, el) => {
      const $el = $(el);
      const tagName = el.tagName.toLowerCase();

      // Skip nested elements that will be processed by parent
      if (
        $el.parents("p, li, td, th, blockquote, figcaption").length > 0 &&
        !["h1", "h2", "h3", "h4", "h5", "h6"].includes(tagName)
      ) {
        return;
      }

      // Get direct text content
      let text = $el
        .clone()
        .children("script, style, nav, footer, header, aside")
        .remove()
        .end()
        .text()
        .trim();

      if (!text) return;

      // Clean excessive whitespace
      text = text.replace(/\s+/g, " ").trim();

      // Skip very short or duplicate text
      const textLower = text.toLowerCase();
      if (text.length < 3 || seen.has(textLower)) return;
      seen.add(textLower);

      // Format based on tag
      switch (tagName) {
        case "h1":
          lines.push("");
          lines.push(text.toUpperCase());
          lines.push("=".repeat(Math.min(text.length, 50)));
          lines.push("");
          break;
        case "h2":
          lines.push("");
          lines.push(text);
          lines.push("-".repeat(Math.min(text.length, 40)));
          lines.push("");
          break;
        case "h3":
        case "h4":
        case "h5":
        case "h6":
          lines.push("");
          lines.push(`[${text}]`);
          lines.push("");
          break;
        case "li":
          lines.push(`  - ${text}`);
          break;
        case "blockquote":
          lines.push("");
          lines.push(`  "${text}"`);
          lines.push("");
          break;
        case "td":
        case "th":
          lines.push(`| ${text} |`);
          break;
        case "figcaption":
          lines.push(`  (${text})`);
          break;
        default:
          // p, article, section, main
          if (text.length > 15) {
            // Word wrap at ~80 characters
            const wrapped = wordWrap(text, 80);
            lines.push(wrapped);
            lines.push("");
          }
          break;
      }
    });

  // Clean up result
  return lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\s+|\s+$/g, "")
    .trim();
}

// Word wrap helper function
function wordWrap(text: string, maxWidth: number): string {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (currentLine.length + word.length + 1 <= maxWidth) {
      currentLine += (currentLine ? " " : "") + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines.join("\n");
}

// Extract text with structure (preserving headings, paragraphs)
function extractStructuredText(html: string): string {
  const $ = cheerio.load(html);

  // Remove unwanted elements
  $("script").remove();
  $("style").remove();
  $("noscript").remove();
  $("iframe").remove();
  $("svg").remove();
  $("head").remove();
  $("[hidden]").remove();
  $('[style*="display: none"]').remove();
  $('[style*="display:none"]').remove();

  const lines: string[] = [];

  // Extract title
  const title = $("title").text().trim();
  if (title) {
    lines.push(`# ${title}`, "");
  }

  // Process main content
  $("body")
    .find("h1, h2, h3, h4, h5, h6, p, li, td, th, blockquote, pre, span, div, a")
    .each((_, el) => {
      const $el = $(el);
      const tagName = el.tagName.toLowerCase();

      // Skip if parent is already processed
      if ($el.parents("p, li, h1, h2, h3, h4, h5, h6").length > 0 && !["a", "span"].includes(tagName)) {
        return;
      }

      let text = $el.clone().children("script, style").remove().end().text().trim();

      if (!text) return;

      // Clean excessive whitespace
      text = text.replace(/\s+/g, " ").trim();

      // Skip very short text (likely navigation items)
      if (text.length < 2) return;

      // Format based on tag
      switch (tagName) {
        case "h1":
          lines.push("", `# ${text}`, "");
          break;
        case "h2":
          lines.push("", `## ${text}`, "");
          break;
        case "h3":
          lines.push("", `### ${text}`, "");
          break;
        case "h4":
        case "h5":
        case "h6":
          lines.push("", `#### ${text}`, "");
          break;
        case "li":
          lines.push(`• ${text}`);
          break;
        case "blockquote":
          lines.push(`> ${text}`);
          break;
        case "pre":
          lines.push("```", text, "```");
          break;
        case "p":
        case "div":
          if (text.length > 20) {
            lines.push(text, "");
          }
          break;
        default:
          break;
      }
    });

  // Clean up result
  return lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n") // Max 2 newlines
    .trim();
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Invalid protocol");
      }
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    // Fetch HTML from the URL
    const response = await fetch(parsedUrl.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      signal: AbortSignal.timeout(15000), // 15 second timeout
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const html = await response.text();

    // Beautify HTML
    const beautifiedHtml = beautifyHtml(html, {
      indent_size: 2,
      indent_char: " ",
      max_preserve_newlines: 2,
      preserve_newlines: true,
      indent_inner_html: true,
      wrap_line_length: 0,
    });

    // Extract text content
    const textOnly = extractText(html);
    const structuredText = extractStructuredText(html);

    return NextResponse.json({
      html: beautifiedHtml,
      rawHtml: html,
      textOnly,
      structuredText,
      url: parsedUrl.toString(),
      contentLength: html.length,
      beautifiedLength: beautifiedHtml.length,
      textLength: textOnly.length,
    });
  } catch (error) {
    console.error("Fetch error:", error);

    if (error instanceof Error) {
      if (error.name === "AbortError" || error.name === "TimeoutError") {
        return NextResponse.json(
          { error: "Request timed out. The website took too long to respond." },
          { status: 408 }
        );
      }
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
