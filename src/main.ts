import { Plugin, TAbstractFile, FileExplorerView, WorkspaceLeaf, PathVirtualElement } from "obsidian";
import { around } from "monkey-around";

import FileExplorerPlusSettingTab, { FileExplorerPlusPluginSettings, UNSEEN_FILES_DEFAULT_SETTINGS } from "./settings";
import { addCommandsToFileMenu, addOnRename, addOnDelete, addOnTagChange, addCommands } from "./handlers";
import { checkPathFilter, checkTagFilter, changeVirtualElementPin } from "./utils";

export default class FileExplorerPlusPlugin extends Plugin {
    settings: FileExplorerPlusPluginSettings;

    async onload() {
        await this.loadSettings();

        addCommandsToFileMenu(this);
        addOnRename(this);
        addOnDelete(this);
        addOnTagChange(this);
        addCommands(this);

        this.addSettingTab(new FileExplorerPlusSettingTab(this.app, this));

        this.app.workspace.onLayoutReady(() => {
            this.patchFileExplorer();

            const fileExplorer = this.getFileExplorer();
            if (fileExplorer?.requestSort) {
                fileExplorer.requestSort();
            }
        });

        this.app.workspace.on("layout-change", () => {
            if (!this.getFileExplorer()?.fileExplorerPlusPatched) {
                this.patchFileExplorer();

                const fileExplorer = this.getFileExplorer();
                if (fileExplorer?.requestSort) {
                    fileExplorer.requestSort();
                }
            }
        });
    }

    getFileExplorerContainer(): WorkspaceLeaf | undefined {
        return this.app.workspace.getLeavesOfType("file-explorer")?.first();
    }

    getFileExplorer(): FileExplorerView | undefined {
        const fileExplorerContainer = this.getFileExplorerContainer();
        return fileExplorerContainer?.view as FileExplorerView;
    }

    patchFileExplorer() {
        const fileExplorer = this.getFileExplorer();

        if (!fileExplorer) {
            throw Error("Could not find file explorer");
        }

        const plugin = this;
        const leaf = this.app.workspace.getLeaf(true);

        this.register(
            around(Object.getPrototypeOf(fileExplorer), {
                getSortedFolderItems(old: any) {
                    return function (...args: any[]) {
                        let sortedChildren: PathVirtualElement[] = old.call(this, ...args);

                        let paths = sortedChildren.map((el) => el.file);

                        if (plugin.settings.hideFilters.active) {
                            const pathsToHide = plugin.getPathsToHide(paths);

                            const pathsToHideLookUp = pathsToHide.reduce(
                                (acc, path) => {
                                    acc[path.path] = true;
                                    return acc;
                                },
                                {} as { [key: string]: boolean },
                            );

                            sortedChildren = sortedChildren.filter((vEl) => {
                                if (pathsToHideLookUp[vEl.file.path]) {
                                    vEl.info.hidden = true;
                                    return false;
                                } else {
                                    vEl.info.hidden = false;
                                    return true;
                                }
                            });
                        }

                        // only get visible vChildren
                        paths = sortedChildren.map((el) => el.file);

                        if (plugin.settings.pinFilters.active) {
                            const pathsToPin = plugin.getPathsToPin(paths);

                            const pathsToPinLookUp = pathsToPin.reduce(
                                (acc, path) => {
                                    acc[path.path] = true;
                                    return acc;
                                },
                                {} as { [key: string]: boolean },
                            );

                            const pinnedVirtualElements = sortedChildren.filter((vEl) => {
                                if (pathsToPinLookUp[vEl.file.path]) {
                                    vEl = changeVirtualElementPin(vEl, true);
                                    vEl.info.pinned = true;
                                    return true;
                                } else {
                                    vEl = changeVirtualElementPin(vEl, false);
                                    vEl.info.pinned = false;
                                    return false;
                                }
                            });
                            const notPinnedVirtualElements = sortedChildren.filter((vEl) => {
                                if (pathsToPinLookUp[vEl.file.path]) {
                                    return false;
                                } else {
                                    return true;
                                }
                            });

                            sortedChildren = pinnedVirtualElements.concat(notPinnedVirtualElements);
                        } else {
                            sortedChildren = sortedChildren.map((vEl) => changeVirtualElementPin(vEl, false));
                        }

                        return sortedChildren;
                    };
                },
            }),
        );

        leaf.detach();

        fileExplorer.fileExplorerPlusPatched = true;
    }

    onunload() {
        const fileExplorer = this.getFileExplorer();

        if (!fileExplorer) {
            return;
        }

        for (const path in fileExplorer!.fileItems) {
            fileExplorer!.fileItems[path] = changeVirtualElementPin(fileExplorer!.fileItems[path], false);
        }

        if (fileExplorer?.requestSort) {
            fileExplorer.requestSort();
        }
        fileExplorer.fileExplorerPlusPatched = false;
    }

    async loadSettings() {
        this.settings = Object.assign({}, UNSEEN_FILES_DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    getPathsToPin(paths: (TAbstractFile | null)[]): TAbstractFile[] {
        return paths.filter((path) => {
            if (!path) {
                return false;
            }

            const pathFilterActivated = this.settings.pinFilters.paths.some((filter) => checkPathFilter(filter, path));

            if (pathFilterActivated) {
                return true;
            }

            const tagFilterActivated = this.settings.pinFilters.tags.some((filter) => checkTagFilter(filter, path));

            if (tagFilterActivated) {
                return true;
            }

            return false;
        }) as TAbstractFile[];
    }

    getPathsToHide(paths: (TAbstractFile | null)[]): TAbstractFile[] {
        return paths.filter((path) => {
            if (!path) {
                return false;
            }

            const pathFilterActivated = this.settings.hideFilters.paths.some((filter) => checkPathFilter(filter, path));

            if (pathFilterActivated) {
                return true;
            }

            const tagFilterActivated = this.settings.hideFilters.tags.some((filter) => checkTagFilter(filter, path));

            if (tagFilterActivated) {
                return true;
            }

            return false;
        }) as TAbstractFile[];
    }
}
