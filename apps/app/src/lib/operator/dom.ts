import type { Page } from 'playwright-core';

// ------------------------------------------------------------------
// 1) Standard DOM type definitions
// ------------------------------------------------------------------
export interface DOMBaseNode {
  type: 'TEXT_NODE' | 'ELEMENT_NODE';
  isVisible: boolean;
  parent?: DOMElementNode;
}

export interface DOMTextNode extends DOMBaseNode {
  type: 'TEXT_NODE';
  text: string;
}

export interface DOMElementNode extends DOMBaseNode {
  type: 'ELEMENT_NODE';
  tagName: string;
  xpath: string;
  attributes: Record<string, string>;
  children: DOMBaseNode[];
  isInteractive: boolean;
  isTopElement: boolean;
  shadowRoot: boolean;
  highlightIndex?: number;
}

/**
 * The typed DOM you'll parse on the Node side
 */
export interface DOMState {
  elementTree: DOMElementNode;
  selectorMap: Record<number, DOMElementNode>;
}

/**
 * We also return the "raw" JSON data for easy injection into the browser
 * for highlight steps, so we don't have to re-serialize the typed DOMState.
 */
export interface DomResult {
  domState: DOMState;
  rawDom: any; // The untyped JSON from the browser
}

// ------------------------------------------------------------------
// 2) The gatherDomTree logic, as a string, for .evaluate(...)
// ------------------------------------------------------------------
const GATHER_DOM_TREE_JS = String.raw`
(function gatherDomTree(highlightElements = true) {
  function isElementInteractive(el) {
    if (!el) return false;
    const tag = (el.tagName || "").toLowerCase();
    const interactiveTags = new Set([
      "a", "button", "details", "embed", "input", "label",
      "menu", "menuitem", "object", "select", "textarea", "summary"
    ]);
    if (interactiveTags.has(tag)) return true;

    const role = el.getAttribute && el.getAttribute("role");
    if (
      role &&
      /^(button|menu|menuitem|link|checkbox|radio|tab|switch|treeitem)$/i.test(role)
    ) {
      return true;
    }
    if (
      el.hasAttribute &&
      (el.hasAttribute("onclick") ||
       el.hasAttribute("ng-click") ||
       el.hasAttribute("@click"))
    ) {
      return true;
    }
    const tabIndex = el.getAttribute && el.getAttribute("tabindex");
    if (tabIndex && tabIndex !== "-1") return true;

    if (el.getAttribute && el.getAttribute("data-action")) {
      return true;
    }
    return false;
  }

  function isVisible(el) {
    if (!el || !el.getBoundingClientRect) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    const style = window.getComputedStyle(el);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      parseFloat(style.opacity) < 0.1
    ) {
      return false;
    }
    return true;
  }

  let highlightCounter = 1;

  function computeXPath(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return "";
    let pathSegments = [];
    let current = el;
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      const tagName = current.nodeName.toLowerCase();
      let index = 1;
      let sibling = current.previousSibling;
      while (sibling) {
        if (
          sibling.nodeType === Node.ELEMENT_NODE &&
          sibling.nodeName.toLowerCase() === tagName
        ) {
          index++;
        }
        sibling = sibling.previousSibling;
      }
      const segment = index > 1 ? tagName + "[" + index + "]" : tagName;
      pathSegments.unshift(segment);
      current = current.parentNode;
      if (!current || !current.parentNode) break;
      if (current.nodeName.toLowerCase() === "html") {
        pathSegments.unshift("html");
        break;
      }
    }
    return "/" + pathSegments.join("/");
  }

  function processNode(node) {
    // TEXT_NODE
    if (node.nodeType === Node.TEXT_NODE) {
      const textContent = node.nodeValue.trim();
      if (
        !textContent ||
        textContent.length < 2 ||
        /^[\\d\\s./$@]+$/.test(textContent) ||
        textContent.startsWith("{")
      ) {
        return null;
      }
      return {
        type: "TEXT_NODE",
        text: textContent,
        isVisible: isVisible(node.parentElement),
      };
    }

    // ELEMENT_NODE
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }
    const el = node;
    const tagName = el.tagName.toLowerCase();

    if (
      (tagName === "a" && !el.textContent.trim() && !el.querySelector("img")) ||
      tagName === "script" ||
      tagName === "style"
    ) {
      return null;
    }

    const attrs = {};
    for (let attr of el.attributes) {
      attrs[attr.name] = attr.value;
    }

    const childNodes = [];
    for (let child of el.childNodes) {
      const processed = processNode(child);
      if (processed) {
        childNodes.push(processed);
      }
    }

    const elVisible = isVisible(el);
    const nodeData = {
      type: "ELEMENT_NODE",
      tagName,
      xpath: computeXPath(el),
      attributes: attrs,
      children: childNodes,
      isVisible: elVisible,
      isInteractive: false,
      isTopElement: false,
      shadowRoot: false,
    };

    if (highlightElements && isElementInteractive(el) && elVisible) {
      nodeData.isInteractive = true;
      nodeData.highlightIndex = highlightCounter++;
    }
    return nodeData;
  }

  const root = document.documentElement;
  const result = processNode(root);
  if (result) {
    result.isTopElement = true;
    result.xpath = "/html";
  }
  return result;
})
`;

// ------------------------------------------------------------------
// 3) Local parse logic to create typed DOMState
// ------------------------------------------------------------------
function parseNode(nodeData: any, parent?: DOMElementNode): DOMBaseNode | null {
  if (!nodeData) return null;

  if (nodeData.type === 'TEXT_NODE') {
    const textNode: DOMTextNode = {
      type: 'TEXT_NODE',
      text: nodeData.text,
      isVisible: !!nodeData.isVisible,
      parent,
    };
    return textNode;
  }

  if (nodeData.type === 'ELEMENT_NODE') {
    const elementNode: DOMElementNode = {
      type: 'ELEMENT_NODE',
      tagName: nodeData.tagName || '',
      xpath: nodeData.xpath || '',
      attributes: nodeData.attributes || {},
      children: [],
      isVisible: !!nodeData.isVisible,
      isInteractive: !!nodeData.isInteractive,
      isTopElement: !!nodeData.isTopElement,
      shadowRoot: !!nodeData.shadowRoot,
      highlightIndex: nodeData.highlightIndex,
      parent,
    };

    if (Array.isArray(nodeData.children)) {
      const childNodes: DOMBaseNode[] = [];
      for (const child of nodeData.children) {
        const c = parseNode(child, elementNode);
        if (c) childNodes.push(c);
      }
      elementNode.children = childNodes;
    }
    return elementNode;
  }

  return null;
}

function createSelectorMap(elementTree: DOMElementNode): Record<number, DOMElementNode> {
  const selectorMap: Record<number, DOMElementNode> = {};

  function traverse(node: DOMBaseNode) {
    if (node.type === 'ELEMENT_NODE') {
      const el = node as DOMElementNode;
      if (typeof el.highlightIndex === 'number') {
        selectorMap[el.highlightIndex] = el;
      }
      for (const child of el.children) {
        traverse(child);
      }
    }
  }
  traverse(elementTree);
  return selectorMap;
}

// ------------------------------------------------------------------
// 4) "Get the DOM" method, separate from highlighting
// ------------------------------------------------------------------
export async function getDomState(page: Page, highlightElements = true): Promise<DomResult> {
  // 1) Collect raw JSON from the browser
  const rawTree = await page.evaluate(
    ({ script, doHighlight }) => {
      const fn = new Function(`return ${script}`)();
      return fn(doHighlight);
    },
    { script: GATHER_DOM_TREE_JS, doHighlight: highlightElements },
  );

  if (!rawTree) throw new Error('No DOM returned from browser!');

  // 2) Parse into typed structure
  const elementTree = parseNode(rawTree) as DOMElementNode;
  if (!elementTree) throw new Error('Failed to parse root element node!');

  // 3) Build highlightIndex -> DOMElement map
  const selectorMap = createSelectorMap(elementTree);
  const domState: DOMState = { elementTree, selectorMap };

  return { domState, rawDom: rawTree };
}

// ------------------------------------------------------------------
// 5) A highlight function that uses "position: fixed"
//    so it won't jump around. Also a bigger label text,
//    bigger background for better readability.
// ------------------------------------------------------------------
export async function highlightDomElements(page: Page, rawDom: any): Promise<void> {
  await page.evaluate((rawData) => {
    if (!rawData) return;

    // 1) gather all nodes with highlightIndex
    const nodesWithIndex: any[] = [];
    function dfs(node: any) {
      if (!node) return;
      if (node.type === 'ELEMENT_NODE' && typeof node.highlightIndex === 'number') {
        nodesWithIndex.push(node);
      }
      if (Array.isArray(node.children)) {
        for (const c of node.children) {
          dfs(c);
        }
      }
    }
    dfs(rawData);

    // 2) Insert style if not present
    const styleId = 'dom-highlighter-style';
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.textContent = `
        .dom-highlighter-overlay {
          position: fixed;
          font-size: 14px;
          font-weight: bold;
          z-index: 999999;
          pointer-events: none;
          box-sizing: border-box;
          border: 2px solid transparent;
        }
        .dom-highlighter-number {
          position: absolute;
          top: -20px;
          left: 50%;
          transform: translateX(-50%);
          padding: 2px 6px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: bold;
          white-space: nowrap;
          opacity: 0.9;
          border: 1px solid rgba(0,0,0,0.2);
        }
      `;
      document.head.appendChild(styleEl);
    }

    // 3) Clear old overlays
    for (const el of document.querySelectorAll('.dom-highlighter-overlay')) {
      el.remove();
    }

    // 4) Some color rotation
    const highlightColors = [
      {
        border: '#FF5D5D',
        bg: '#FF5D5D',
        highlight: 'rgba(255,93,93,0.08)',
      },
      {
        border: '#4CAF50',
        bg: '#4CAF50',
        highlight: 'rgba(76,175,80,0.08)',
      },
      {
        border: '#2196F3',
        bg: '#2196F3',
        highlight: 'rgba(33,150,243,0.08)',
      },
      {
        border: '#FFC107',
        bg: '#FFC107',
        highlight: 'rgba(255,193,7,0.08)',
      },
      {
        border: '#9C27B0',
        bg: '#9C27B0',
        highlight: 'rgba(156,39,176,0.08)',
      },
    ];

    // 5) For each clickable node, measure & place overlays
    for (const nodeObj of nodesWithIndex) {
      const highlightIndex = nodeObj.highlightIndex;
      const xpath = nodeObj.xpath;
      if (!xpath) return;

      const result = document.evaluate(
        xpath,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null,
      );
      const el = result.singleNodeValue as HTMLElement | null;
      if (!el || el.nodeType !== Node.ELEMENT_NODE) return;

      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;

      const colorStyle = highlightColors[highlightIndex % highlightColors.length];
      const overlay = document.createElement('div');
      overlay.className = 'dom-highlighter-overlay';

      const numberSpan = document.createElement('span');
      numberSpan.className = 'dom-highlighter-number';
      numberSpan.textContent = String(highlightIndex);
      numberSpan.style.backgroundColor = colorStyle.bg;
      numberSpan.style.color = 'white';
      overlay.appendChild(numberSpan);

      overlay.style.top = `${rect.top}px`;
      overlay.style.left = `${rect.left}px`;
      overlay.style.width = `${rect.width}px`;
      overlay.style.height = `${rect.height}px`;
      overlay.style.borderColor = colorStyle.border;
      overlay.style.backgroundColor = colorStyle.highlight;

      document.body.appendChild(overlay);
    }
  }, rawDom);
}

export async function clearDomHighlights(page: Page): Promise<void> {
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('.dom-highlighter-overlay')) {
      el.remove();
    }
    const styleEl = document.getElementById('dom-highlighter-style');
    if (styleEl) styleEl.remove();
  });
}

export async function clickElementByHighlightIndex(
  page: Page,
  domState: DOMState,
  highlightIndex: number,
) {
  const elemNode = domState.selectorMap[highlightIndex];
  if (!elemNode) {
    return `No element found for highlightIndex=${highlightIndex}`;
  }

  const xpath = elemNode.xpath;
  if (!xpath) {
    return `Node has no xpath for highlightIndex=${highlightIndex}`;
  }

  const locator = page.locator(`xpath=${xpath}`);
  const count = await locator.count();
  if (count < 1) {
    return `Element not found in DOM for highlightIndex=${highlightIndex}, xpath=${xpath}`;
  }

  await locator.first().click();
  return true;
}
