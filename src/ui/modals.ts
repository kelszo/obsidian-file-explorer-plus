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

        this.plugin.fileExplorer!.requestSort();
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

        const table = contentEl.createEl("table", {});
        table.style.borderCollapse = "collapse";
        contentEl.style.display = "grid";
        contentEl.style.placeItems = "center";
        const headerRow = contentEl.createEl("tr");

        const thead = contentEl.createEl("thead");

        const pathHeaderCell = contentEl.createEl("th");
        pathHeaderCell.style.textAlign = "center";
        pathHeaderCell.innerText = "Path";
        pathHeaderCell.style.paddingLeft = "5px";
        pathHeaderCell.style.paddingRight = "5px";
        pathHeaderCell.style.borderBottom = "2px solid black";
        headerRow.appendChild(pathHeaderCell);

        const typeHeaderCell = contentEl.createEl("th");
        typeHeaderCell.style.textAlign = "center";
        typeHeaderCell.innerText = "Type";
        typeHeaderCell.style.paddingLeft = "5px";
        typeHeaderCell.style.paddingRight = "5px";
        typeHeaderCell.style.borderBottom = "2px solid black";
        headerRow.appendChild(typeHeaderCell);

        const filtersActivatedHeaderCell = contentEl.createEl("th");
        filtersActivatedHeaderCell.style.textAlign = "center";
        filtersActivatedHeaderCell.innerText = "Filters";
        filtersActivatedHeaderCell.style.paddingLeft = "5px";
        filtersActivatedHeaderCell.style.paddingRight = "5px";
        filtersActivatedHeaderCell.style.borderBottom = "2px solid black";
        headerRow.appendChild(filtersActivatedHeaderCell);

        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = contentEl.createEl("tbody");
        for (const file of pathsActivated) {
            const row = contentEl.createEl("tr");

            const pathCell = contentEl.createEl("td");
            pathCell.style.padding = "3px";

            if (file instanceof TFile) {
                const link = contentEl.createEl("a");
                link.onClickEvent(() => {
                    this.app.workspace.getLeaf("tab").openFile(file);
                });
                link.innerText = file.path;
                pathCell.appendChild(link);
            } else {
                pathCell.innerText = file.path;
            }
            row.appendChild(pathCell);

            // Create type cell
            const typeCell = contentEl.createEl("td");
            typeCell.style.textAlign = "center";
            typeCell.style.padding = "3px";
            if (file instanceof TFile) {
                typeCell.innerText = "File";
            } else if (file instanceof TFolder) {
                typeCell.innerText = "Folder";
            } else {
                typeCell.innerText = "Unknown";
            }
            row.appendChild(typeCell);

            const filtersActivatedCell = contentEl.createEl("td");
            filtersActivatedCell.style.textAlign = "center";
            filtersActivatedCell.style.padding = "3px";
            filtersActivatedCell.innerText = (file as any).filtersActivated;
            row.appendChild(filtersActivatedCell);

            tbody.appendChild(row);
        }
        table.appendChild(tbody);
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
