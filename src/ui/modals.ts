import { FuzzySuggestModal, Modal, TFile, TFolder } from "obsidian";

import FileExplorerPlusPlugin from "src/main";
import { Filter, TagFilter, PathFilter } from "src/settings";
import { checkPathFilter, checkTagFilter } from "src/utils";

export class InputFilterNameModal extends FuzzySuggestModal<Filter> {
    constructor(
        private plugin: FileExplorerPlusPlugin,
        private actionType: "PIN" | "HIDE",
    ) {
        super(plugin.app);
        this.setPlaceholder("Type name of a filter...");
    }

    getItems(): Filter[] {
        let filters: any[] = [];

        if (this.actionType === "PIN") {
            filters = filters.concat(this.plugin.settings?.pinFilters.tags || []);
            filters = filters.concat(this.plugin.settings?.pinFilters.paths || []);
        } else if (this.actionType === "HIDE") {
            filters = filters.concat(this.plugin.settings?.hideFilters.tags || []);
            filters = filters.concat(this.plugin.settings?.hideFilters.paths || []);
        }

        filters = filters.filter((x) => x.name !== "");

        filters = [...new Set(filters)];

        return filters;
    }

    getItemText(filter: Filter): string {
        return `${filter.name} (${filter.active ? "Enabled" : "Disabled"})`;
    }

    onChooseItem(chosenFilter: Filter): void {
        if (this.actionType === "PIN") {
            this.plugin.settings.pinFilters.tags = this.plugin.settings.pinFilters.tags.map((filter) => {
                if (filter.name === chosenFilter.name) {
                    filter.active = !filter.active;
                }

                return filter;
            });
            this.plugin.settings.pinFilters.paths = this.plugin.settings.pinFilters.paths.map((filter) => {
                if (filter.name === chosenFilter.name) {
                    filter.active = !filter.active;
                }

                return filter;
            });
        } else if (this.actionType === "HIDE") {
            this.plugin.settings.hideFilters.tags = this.plugin.settings.hideFilters.tags.map((filter) => {
                if (filter.name === chosenFilter.name) {
                    filter.active = !filter.active;
                }

                return filter;
            });
            this.plugin.settings.hideFilters.paths = this.plugin.settings.hideFilters.paths.map((filter) => {
                if (filter.name === chosenFilter.name) {
                    filter.active = !filter.active;
                }

                return filter;
            });
        }

        this.plugin.getFileExplorer()?.requestSort();
    }
}

export class PathsActivatedModal extends Modal {
    constructor(
        private plugin: FileExplorerPlusPlugin,
        private actionType: "PIN" | "HIDE",
        private specificFilter?: Filter,
        private filterType?: "PATH" | "TAG",
    ) {
        super(plugin.app);
    }

    onOpen() {
        const { contentEl } = this;
        const files = this.app.vault.getAllLoadedFiles();

        let pathsActivated;
        let pathFilters: PathFilter[];
        let tagFilters: TagFilter[];

        if (this.actionType === "HIDE") {
            pathFilters = this.plugin.settings.hideFilters.paths;
            tagFilters = this.plugin.settings.hideFilters.tags;
        } else if (this.actionType === "PIN") {
            pathFilters = this.plugin.settings.pinFilters.paths;
            tagFilters = this.plugin.settings.pinFilters.tags;
        }

        if (this.specificFilter) {
            pathsActivated = files.filter((file) => {
                if (this.filterType === "PATH") {
                    return checkPathFilter(this.specificFilter as PathFilter, file);
                } else if (this.filterType === "TAG") {
                    return checkTagFilter(this.specificFilter as TagFilter, file);
                }

                return false;
            });
        } else {
            pathsActivated = this.actionType === "HIDE" ? this.plugin.getPathsToHide(files) : this.plugin.getPathsToPin(files);
        }

        pathsActivated = pathsActivated.map((file) => {
            const pathFiltersActivated = pathFilters
                .map((filter) => {
                    if (checkPathFilter(filter, file)) {
                        if (filter.name && filter.name !== "") {
                            return filter.name;
                        } else {
                            return filter.pattern;
                        }
                    }

                    return undefined;
                })
                .filter((x) => !!x);

            const tagFiltersActivated = tagFilters
                .map((filter) => {
                    if (checkTagFilter(filter, file)) {
                        if (filter.name && filter.name !== "") {
                            return filter.name;
                        } else {
                            return filter.pattern;
                        }
                    }

                    return undefined;
                })
                .filter((x) => !!x);

            (file as any).filtersActivated = pathFiltersActivated.join(", ") + tagFiltersActivated.join(", ");

            return file;
        });

        contentEl.addClasses(["file-explorer-plus", "filters-activated-modal"]);

        const data = [["Path", "Type", "Filters"]];

        for (const path of pathsActivated) {
            const row = [];
            if (path instanceof TFile) {
                const link = contentEl.createEl("a");
                link.onClickEvent(() => {
                    this.app.workspace.getLeaf("tab").openFile(path);
                });
                link.textContent = path.path;
                row.push(link);
            } else {
                row.push(path.path);
            }

            if (path instanceof TFile) {
                row.push("File");
            } else if (path instanceof TFolder) {
                row.push("Folder");
            } else {
                row.push("Unknown");
            }

            row.push((path as any).filtersActivated);

            data.push(row);
        }

        const table = generateTable(data);
        contentEl.appendChild(table);
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

export function generateTable(data: (string | HTMLElement)[][]): HTMLElement {
    const table = document.createElement("table", {});
    const thead = document.createElement("thead");
    const tbody = document.createElement("tbody");

    table.appendChild(thead);
    table.appendChild(tbody);

    for (let i = 0; i < data.length; i++) {
        const row = data[i];

        const tableRow = document.createElement("tr");

        if (i === 0) {
            thead.appendChild(tableRow);
        } else {
            tbody.appendChild(tableRow);
        }

        for (let j = 0; j < row.length; j++) {
            let cell;
            if (i === 0) {
                cell = document.createElement("th");
                cell.textContent = data[i][j] as string;
            } else {
                cell = document.createElement("td");
                if (typeof data[i][j] === "string") {
                    cell.textContent = data[i][j] as string;
                } else {
                    cell.appendChild(data[i][j] as HTMLElement);
                }
            }

            tableRow.appendChild(cell);
        }
    }

    return table;
}
