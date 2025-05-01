import { PathVirtualElement, TAbstractFile, TFile, TFolder, TagCache, setIcon } from "obsidian";
import wcmatch from "wildcard-match";

import { FrontMatterFilter, PathFilter, TagFilter } from "./settings";

function flattenObject(obj: Record<string, any>, prefix: string = ""): Record<string, any> {
  return Object.keys(obj).reduce((acc: Record<string, any>, key: string) => {
    const prefixedKey = prefix ? `${prefix}.${key}` : key;

    if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
      // Recursively flatten nested objects
      const flattened = flattenObject(obj[key], prefixedKey);
      Object.assign(acc, flattened);
    } else {
      // Add the property with its prefixed key
      acc[prefixedKey] = obj[key];
    }

    return acc;
  }, {});
}

export function changeVirtualElementPin(vEl: PathVirtualElement, pin: boolean): PathVirtualElement {
  if (pin && !vEl.el.hasClass("tree-item-pinned")) {
    vEl.el.addClass("tree-item-pinned");

    const pinDiv = document.createElement("div");
    pinDiv.addClass("file-explorer-plus");
    pinDiv.addClass("pin-icon");
    setIcon(pinDiv, "pin");
    vEl.el.firstChild?.insertBefore(pinDiv, vEl.el.firstChild.firstChild);
  } else if (!pin) {
    vEl.el.removeClass("tree-item-pinned");

    const pinIcons = Array.from((vEl.el.firstChild as HTMLElement).children).filter((el: HTMLElement) =>
      el.hasClass("pin-icon"),
    );

    pinIcons.forEach((icon: HTMLElement) => vEl.el.firstChild?.removeChild(icon));
  }

  return vEl;
}

export function checkPathFilter(filter: PathFilter, file: TAbstractFile): boolean {
  if (!filter.active || filter.pattern === "") {
    return false;
  }

  if (filter.type == "FILES" && file instanceof TFolder) {
    // Filter is only for files. Current row is a directory
    return false;
  }

  if (filter.type == "DIRECTORIES" && file instanceof TFile) {
    // Filter is only for directories. Current row is a file
    return false;
  }

  if (filter.patternType === "REGEX") {
    const re = new RegExp(filter.pattern);

    if (
      re.test(file.path) ||
      re.test(file.path.replace(/.md$/g, "")) ||
      re.test((file as TFile).basename || file.name)
    ) {
      return true;
    }
  } else if (filter.patternType === "WILDCARD") {
    const isMatch = wcmatch(filter.pattern);

    if (
      isMatch(file.path) ||
      isMatch(file.path.replace(/.md$/g, "")) ||
      isMatch((file as TFile).basename || file.name)
    ) {
      return true;
    }
  } else {
    if (
      file.path === filter.pattern ||
      file.path.replace(/.md$/g, "") == filter.pattern ||
      ((file as TFile).basename || file.name) === filter.pattern
    )
      return true;
  }

  return false;
}

export function checkTagFilter(filter: TagFilter, file: TAbstractFile): boolean {
  if (file instanceof TFolder) {
    return false;
  }

  if (!filter.active || filter.pattern === "") {
    return false;
  }

  const cachedMetadata = this.app.metadataCache.getFileCache(file as TFile);
  if (!cachedMetadata) {
    return false;
  }

  const tags = (cachedMetadata.tags || []).map((tag: TagCache) => tag.tag.replace(/^#/, ""));
  const frontmatterTags = cachedMetadata.frontmatter?.tags || [];

  const allTags = [...new Set(tags.concat(frontmatterTags))];

  if (filter.patternType === "REGEX") {
    const re = new RegExp(filter.pattern);

    return allTags.some((tag: string) => {
      return re.test(tag);
    });
  } else if (filter.patternType === "WILDCARD") {
    const isMatch = wcmatch(filter.pattern);

    return allTags.some((tag: string) => {
      return isMatch(tag);
    });
  } else if (filter.patternType === "STRICT") {
    return allTags.some((tag: string) => {
      return tag === filter.pattern;
    });
  }

  return false;
}

export function checkFrontMatterFilter(filter: FrontMatterFilter, file: TAbstractFile): boolean {
  if (file instanceof TFolder) {
    return false;
  }

  if (!filter.active || filter.pattern === "" || filter.path == "") {
    return false;
  }

  const cachedMetadata = this.app.metadataCache.getFileCache(file as TFile);
  if (!cachedMetadata) {
    return false;
  }

  const frontmatter = flattenObject(cachedMetadata.frontmatter || {});
  const value = String(frontmatter[filter.path]);

  if (filter.patternType === "REGEX") {
    const re = new RegExp(filter.pattern);

    return re.test(value);
  } else if (filter.patternType === "WILDCARD") {
    const isMatch = wcmatch(filter.pattern);

    return isMatch(value);
  } else if (filter.patternType === "STRICT") {
    return value == filter.pattern;
  }

  return false;
}

export function checkFolderInverseVisibilityRecursively(
  folderToCheck: TFolder,
  globalPathsToHideLookUp: { [key: string]: boolean }
): boolean {
  // Check if the folder itself is marked for visibility
  if (globalPathsToHideLookUp[folderToCheck.path]) {
    return true;
  }
  // If no children, it can't contain a visible item
  if (!folderToCheck.children) {
    return false;
  }
  // Check if any child meets the condition
  return folderToCheck.children.some((child) => {
    if (child instanceof TFolder) {
      // Recursively check subfolders
      return checkFolderInverseVisibilityRecursively(child, globalPathsToHideLookUp);
    } else {
      // Check if child file is marked for visibility
      return globalPathsToHideLookUp[child.path];
    }
  });
}

export function shouldHideInInverse(file: TAbstractFile, globalPathsToHideLookUp: { [key: string]: boolean }): boolean {
  if (file instanceof TFolder) {
    // A folder is hidden if neither it nor any descendant is in the global hide list.
    const shouldBeVisible = checkFolderInverseVisibilityRecursively(file, globalPathsToHideLookUp);
    return !shouldBeVisible;
  } else {
    // A file is hidden if it's not in the global hide list.
    return !globalPathsToHideLookUp[file.path];
  }
}
