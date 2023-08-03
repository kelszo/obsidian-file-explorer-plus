import { TAbstractFile, TFile, TFolder, setIcon, PathVirtualElement, TagCache } from "obsidian";
import wcmatch from "wildcard-match";

import { PathFilter, TagFilter } from "./settings";

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

        const pinIcons = Array.from((vEl.el.firstChild as HTMLElement).children).filter((el: HTMLElement) => el.hasClass("pin-icon"));

        pinIcons.forEach((icon: HTMLElement) => vEl.el.firstChild?.removeChild(icon));
    }

    return vEl;
}

export function changeVirtualElementVisibility(vEl: PathVirtualElement, hide: boolean): PathVirtualElement {
    if (hide) {
        vEl.el.style.display = "none";
    } else {
        vEl.el.style.display = "";
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

        if (re.test(file.path) || re.test(file.path.replace(/.md$/g, "")) || re.test((file as TFile).basename || file.name)) {
            return true;
        }
    } else if (filter.patternType === "WILDCARD") {
        const isMatch = wcmatch(filter.pattern);

        if (isMatch(file.path) || isMatch(file.path.replace(/.md$/g, "")) || isMatch((file as TFile).basename || file.name)) {
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

// TODO: Fix tag filters when 1.4 arrives
export function checkTagFilter(filter: TagFilter, file: TAbstractFile): boolean {
    if (file instanceof TFolder) {
        return false;
    }

    if (!filter.active || filter.pattern === "") {
        return false;
    }

    const cachedMetadata = this.app.metadataCache.getFileCache(file as TFile);
    if (!cachedMetadata || !cachedMetadata.tags) {
        return false;
    }

    if (filter.patternType === "REGEX") {
        const re = new RegExp(filter.pattern);

        return cachedMetadata.tags.some((tag: TagCache) => {
            const tagCleaned = tag.tag.replace(/^#/, "");

            if (re.test(tagCleaned)) {
                return true;
            }

            return false;
        });
    } else if (filter.patternType === "WILDCARD") {
        const isMatch = wcmatch(filter.pattern);

        return cachedMetadata.tags.some((tag: TagCache) => {
            const tagCleaned = tag.tag.replace(/^#/, "");

            if (isMatch(tagCleaned)) {
                return true;
            }

            return false;
        });
    } else if (filter.patternType === "STRICT") {
        return cachedMetadata.tags.some((tag: TagCache) => {
            const tagCleaned = tag.tag.replace(/^#/, "");

            if (tagCleaned === filter.pattern) {
                return true;
            }

            return false;
        });
    }

    return false;
}
