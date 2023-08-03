import { Plugin, TAbstractFile, TFolder, Vault, FileExplorerView, PathVirtualElement } from "obsidian";
import { around } from "monkey-around";

import FileExplorerPlusSettingTab, { FileExplorerPlusPluginSettings, UNSEEN_FILES_DEFAULT_SETTINGS } from "./settings";
import { addCommandsToFileMenu, addOnRename, addOnDelete, addOnTagChange, addCommands } from "./handlers";
import { checkPathFilter, checkTagFilter, changeVirtualElementPin, changeVirtualElementVisibility } from "./utils";

export default class FileExplorerPlusPlugin extends Plugin {
    settings: FileExplorerPlusPluginSettings;
    fileExplorer?: FileExplorerView | null;

    async onload() {
        await this.loadSettings();

        addCommandsToFileMenu(this);
        addOnRename(this);
        addOnDelete(this);
        addOnTagChange(this);
        addCommands(this);

        this.addSettingTab(new FileExplorerPlusSettingTab(this.app, this));

        this.app.workspace.onLayoutReady(() => {
            this.patchFileExplorerFolder();
            this.fileExplorer!.requestSort();
        });
    }

    getFileExplorer(): FileExplorerView | undefined {
        return this.app.workspace.getLeavesOfType("file-explorer")?.first()?.view as FileExplorerView;
    }

    patchFileExplorerFolder() {
        this.fileExplorer = this.getFileExplorer();

        if (!this.fileExplorer) {
            throw Error("Could not find file explorer");
        }

        const plugin = this;
        const leaf = this.app.workspace.getLeaf(true);

        //@ts-expect-error
        const tmpFolder = new TFolder(Vault, "");
        const Folder = this.fileExplorer!.createFolderDom(tmpFolder).constructor;

        this.register(
            around(Folder.prototype, {
                sort(old: any) {
                    return function (...args: any[]) {
                        old.call(this, ...args);

                        let virtualElements: PathVirtualElement[] = this.vChildren.children;
                        const paths = virtualElements.map((el) => el.file);

                        if (plugin.settings.hideFilters.active) {
                            const pathsToHide = plugin.getPathsToHide(paths);

                            const pathsToHideLookUp = pathsToHide.reduce(
                                (acc, path) => {
                                    acc[path.path] = true;
                                    return acc;
                                },
                                {} as { [key: string]: boolean },
                            );

                            virtualElements = virtualElements.map((vEl) => {
                                if (pathsToHideLookUp[vEl.file.path]) {
                                    return changeVirtualElementVisibility(vEl, true);
                                } else {
                                    return changeVirtualElementVisibility(vEl, false);
                                }
                            });
                        } else {
                            virtualElements = virtualElements.map((vEl) => changeVirtualElementVisibility(vEl, false));
                        }

                        if (plugin.settings.pinFilters.active) {
                            const pathsToPin = plugin.getPathsToPin(paths);

                            const pathsToPinLookUp = pathsToPin.reduce(
                                (acc, path) => {
                                    acc[path.path] = true;
                                    return acc;
                                },
                                {} as { [key: string]: boolean },
                            );

                            const pinnedVirtualElements = virtualElements
                                .filter((vEl) => pathsToPinLookUp[vEl.file.path])
                                .map((vEl) => {
                                    return changeVirtualElementPin(vEl, true);
                                });

                            const notPinnedVirtualElements = virtualElements
                                .filter((vEl) => !pathsToPinLookUp[vEl.file.path])
                                .map((vEl) => changeVirtualElementPin(vEl, false));

                            virtualElements = pinnedVirtualElements.concat(notPinnedVirtualElements);
                        } else {
                            virtualElements = virtualElements.map((vEl) => changeVirtualElementPin(vEl, false));
                        }

                        this.vChildren.setChildren(virtualElements);
                    };
                },
            }),
        );
        leaf.detach();
    }

    onunload() {
        this.settings.pinFilters.active = false;
        this.settings.hideFilters.active = false;

        for (const path in this.fileExplorer!.fileItems) {
            this.fileExplorer!.fileItems[path] = changeVirtualElementVisibility(this.fileExplorer!.fileItems[path], false);

            this.fileExplorer!.fileItems[path] = changeVirtualElementPin(this.fileExplorer!.fileItems[path], false);
        }

        this.fileExplorer!.requestSort();
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
