import { App, PluginSettingTab, Setting } from "obsidian";

import { PathSuggest } from "./ui/suggest";

import FileExplorerPlusPlugin from "./main";
import { PathsActivatedModal } from "./ui/modals";

export interface TagFilter {
    name: string;
    active: boolean;
    pattern: string;
    patternType: "REGEX" | "WILDCARD" | "STRICT";
}

export interface PathFilter {
    name: string;
    active: boolean;
    type: "FILES" | "DIRECTORIES" | "FILES_AND_DIRECTORIES";
    pattern: string;
    patternType: "REGEX" | "WILDCARD" | "STRICT";
}

export interface FileExplorerPlusPluginSettings {
    hideStrictPathFilters: boolean;
    pinFilters: {
        active: boolean;
        tags: TagFilter[];
        paths: PathFilter[];
    };

    hideFilters: {
        active: boolean;
        tags: TagFilter[];
        paths: PathFilter[];
    };
}

export interface Filter {
    name: string;
    active: boolean;
    pattern: string;
    patternType: "REGEX" | "WILDCARD" | "STRICT";
}

export const UNSEEN_FILES_DEFAULT_SETTINGS: FileExplorerPlusPluginSettings = {
    hideStrictPathFilters: true,
    pinFilters: {
        active: true,
        tags: [
            {
                name: "",
                active: true,
                pattern: "",
                patternType: "STRICT",
            },
        ],
        paths: [
            {
                name: "",
                active: true,
                type: "FILES_AND_DIRECTORIES",
                pattern: "",
                patternType: "WILDCARD",
            },
        ],
    },
    hideFilters: {
        active: true,
        tags: [
            {
                name: "",
                active: true,
                pattern: "",
                patternType: "STRICT",
            },
        ],
        paths: [
            {
                name: "",
                active: true,
                type: "FILES_AND_DIRECTORIES",
                pattern: "",
                patternType: "WILDCARD",
            },
        ],
    },
};

export default class FileExplorerPlusSettingTab extends PluginSettingTab {
    constructor(
        app: App,
        private plugin: FileExplorerPlusPlugin,
    ) {
        super(app, plugin);
    }

    display(): void {
        this.cleanSettings();

        this.containerEl.empty();

        new Setting(this.containerEl)
            .setName("Hide strict path filters in settings")
            .setDesc(
                "Hide path filters with type strict from both the pin and hide filter tables below. Good for decluttering the filter tables. These are created when pinning or hiding a file straight in the file explorer.",
            )
            .addToggle((toggle) => {
                toggle
                    .setTooltip("Active")
                    .setValue(this.plugin.settings.hideStrictPathFilters)
                    .onChange((isActive) => {
                        this.plugin.settings.hideStrictPathFilters = isActive;

                        this.plugin.saveSettings();

                        this.display();
                    });
            });

        this.containerEl.createEl("h1", { text: "Pin filters" });
        new Setting(this.containerEl)
            .setName("Enable pin filters")
            .setDesc("Toggle whether or not pin filters for paths and folders should be active.")
            .addToggle((toggle) => {
                toggle
                    .setTooltip("Active")
                    .setValue(this.plugin.settings.pinFilters.active)
                    .onChange((isActive) => {
                        this.plugin.settings.pinFilters.active = isActive;

                        this.plugin.saveSettings();

                        this.plugin.fileExplorer!.requestSort();
                    });
            });

        new Setting(this.containerEl)
            .setName("View paths pinned by filters")
            .setDesc("View paths that are currently being pinned by the active filters below.")
            .addButton((button) => {
                button.setButtonText("View").onClick(() => {
                    new PathsActivatedModal(this.plugin, "PIN").open();
                });
            });
        this.pinTagFiltersSettings();
        this.pinPathFiltersSettings();

        this.containerEl.createEl("h1", { text: "Hide filters" });
        new Setting(this.containerEl)
            .setName("Enable hide filters")
            .setDesc("Toggle whether or not hide filters for paths and folders should be active.")
            .addToggle((toggle) => {
                toggle
                    .setTooltip("Active")
                    .setValue(this.plugin.settings.hideFilters.active)
                    .onChange((isActive) => {
                        this.plugin.settings.hideFilters.active = isActive;

                        this.plugin.saveSettings();

                        this.plugin.fileExplorer!.requestSort();
                    });
            });

        new Setting(this.containerEl)
            .setName("View paths hidden by filters")
            .setDesc("View paths that are currently being hidden by the active filters below.")
            .addButton((button) => {
                button.setButtonText("View").onClick(() => {
                    new PathsActivatedModal(this.plugin, "HIDE").open();
                });
            });
        this.hideTagFiltersSettings();
        this.hidePathFiltersSettings();
    }

    cleanSettings() {
        this.plugin.settings.hideFilters.tags = this.plugin.settings.hideFilters.tags.filter((filter, index, arr) => {
            if (index == arr.length - 1) {
                return true;
            }

            return filter.pattern !== "" && arr.findIndex((x) => x.pattern === filter.pattern) === index;
        });

        this.plugin.settings.hideFilters.paths = this.plugin.settings.hideFilters.paths.filter((filter, index, arr) => {
            if (index == arr.length - 1) {
                return true;
            }

            return filter.pattern !== "" && arr.findIndex((x) => x.pattern === filter.pattern) === index;
        });
    }

    pinTagFiltersSettings() {
        this.containerEl.createEl("h2", { text: "Tag Filters" });

        this.plugin.settings.pinFilters.tags.forEach((filter, index) => {
            new Setting(this.containerEl)
                .addText((text) => {
                    text.setPlaceholder("Name (optional)")
                        .setValue(filter.name)
                        .onChange((newName) => {
                            this.plugin.settings.pinFilters.tags[index].name = newName;

                            this.plugin.saveSettings();
                        });
                })
                .addText((text) => {
                    text.setPlaceholder("Tag pattern (required)")
                        .setValue(filter.pattern)
                        .onChange((newPattern) => {
                            this.plugin.settings.pinFilters.tags[index].pattern = newPattern;

                            this.plugin.saveSettings();
                            this.plugin.fileExplorer!.requestSort();
                        });
                })
                .addDropdown((dropdown) => {
                    dropdown
                        .addOptions({
                            WILDCARD: "Wildcard",
                            REGEX: "Regex",
                            STRICT: "Strict",
                        })
                        .setValue(filter.patternType)
                        .onChange((newPatternType) => {
                            this.plugin.settings.pinFilters.tags[index].patternType = newPatternType as Filter["patternType"];

                            this.plugin.saveSettings();
                            this.plugin.fileExplorer!.requestSort();
                        });
                })
                .addToggle((toggle) => {
                    toggle
                        .setTooltip("Active")
                        .setValue(filter.active)
                        .onChange((isActive) => {
                            this.plugin.settings.pinFilters.tags[index].active = isActive;

                            this.plugin.saveSettings();
                            this.plugin.fileExplorer!.requestSort();
                        });
                })
                .addExtraButton((button) => {
                    button
                        .setIcon("calculator")
                        .setTooltip("View paths pinned by this filter")
                        .onClick(() => {
                            new PathsActivatedModal(this.plugin, "PIN", filter, "TAG").open();
                        });
                })
                .addExtraButton((button) => {
                    button
                        .setIcon("cross")
                        .setTooltip("Delete")
                        .onClick(() => {
                            this.plugin.settings.pinFilters.tags.splice(index, 1);

                            this.plugin.saveSettings();
                            this.display();
                            this.plugin.fileExplorer!.requestSort();
                        });
                });
        });

        new Setting(this.containerEl).addButton((button) => {
            button
                .setButtonText("Add new pin filter for tags")
                .setCta()
                .onClick(() => {
                    this.plugin.settings.pinFilters.tags.push({
                        name: "",
                        active: true,
                        pattern: "",
                        patternType: "STRICT",
                    });
                    this.plugin.saveSettings();
                    this.display();
                });
        });
    }

    pinPathFiltersSettings() {
        this.containerEl.createEl("h2", { text: "Path Filters" });

        this.plugin.settings.pinFilters.paths.forEach((filter, index) => {
            if (this.plugin.settings.hideStrictPathFilters && filter.patternType === "STRICT") {
                return;
            }

            new Setting(this.containerEl)
                .addText((text) => {
                    text.setPlaceholder("Name (optional)")
                        .setValue(filter.name)
                        .onChange((newName) => {
                            this.plugin.settings.pinFilters.paths[index].name = newName;

                            this.plugin.saveSettings();
                        });
                })
                .addSearch((text) => {
                    new PathSuggest(this.app, text.inputEl);

                    text.setPlaceholder("Path pattern (required)")
                        .setValue(filter.pattern)
                        .onChange((newPattern) => {
                            this.plugin.settings.pinFilters.paths[index].pattern = newPattern;

                            this.plugin.saveSettings();
                            this.plugin.fileExplorer!.requestSort();
                        });
                })
                .addDropdown((dropdown) => {
                    dropdown
                        .addOptions({
                            FILES_AND_DIRECTORIES: "Files and folders",
                            FILES: "Files",
                            DIRECTORIES: "Folders",
                        })
                        .setValue(filter.type)
                        .onChange((newType) => {
                            this.plugin.settings.pinFilters.paths[index].type = newType as PathFilter["type"];

                            this.plugin.saveSettings();
                            this.plugin.fileExplorer!.requestSort();
                        });
                })
                .addDropdown((dropdown) => {
                    dropdown
                        .addOptions({
                            WILDCARD: "Wildcard",
                            REGEX: "Regex",
                            STRICT: "Strict",
                        })
                        .setValue(filter.patternType)
                        .onChange((newPatternType) => {
                            this.plugin.settings.pinFilters.paths[index].patternType = newPatternType as Filter["patternType"];

                            this.plugin.saveSettings();
                            this.plugin.fileExplorer!.requestSort();
                        });
                })
                .addToggle((toggle) => {
                    toggle
                        .setTooltip("Active")
                        .setValue(filter.active)
                        .onChange((isActive) => {
                            this.plugin.settings.pinFilters.paths[index].active = isActive;

                            this.plugin.saveSettings();
                            this.plugin.fileExplorer!.requestSort();
                        });
                })
                .addExtraButton((button) => {
                    button
                        .setIcon("calculator")
                        .setTooltip("View paths pinned by this filter")
                        .onClick(() => {
                            new PathsActivatedModal(this.plugin, "PIN", filter, "PATH").open();
                        });
                })
                .addExtraButton((button) => {
                    button
                        .setIcon("cross")
                        .setTooltip("Delete")
                        .onClick(() => {
                            this.plugin.settings.pinFilters.paths.splice(index, 1);

                            this.plugin.saveSettings();
                            this.display();
                            this.plugin.fileExplorer!.requestSort();
                        });
                });
        });

        new Setting(this.containerEl).addButton((button) => {
            button
                .setButtonText("Add new pin filter for paths")
                .setCta()
                .onClick(() => {
                    this.plugin.settings.pinFilters.paths.push({
                        name: "",
                        active: true,
                        type: "FILES_AND_DIRECTORIES",
                        pattern: "",
                        patternType: "WILDCARD",
                    });
                    this.plugin.saveSettings();
                    this.display();
                });
        });
    }
    hideTagFiltersSettings() {
        this.containerEl.createEl("h2", { text: "Tag Filters" });

        this.plugin.settings.hideFilters.tags.forEach((filter, index) => {
            new Setting(this.containerEl)
                .addText((text) => {
                    text.setPlaceholder("Name (optional)")
                        .setValue(filter.name)
                        .onChange((newName) => {
                            this.plugin.settings.hideFilters.tags[index].name = newName;

                            this.plugin.saveSettings();
                        });
                })
                .addText((text) => {
                    text.setPlaceholder("Tag pattern (required)")
                        .setValue(filter.pattern)
                        .onChange((newPattern) => {
                            this.plugin.settings.hideFilters.tags[index].pattern = newPattern;

                            this.plugin.saveSettings();
                            this.plugin.fileExplorer!.requestSort();
                        });
                })
                .addDropdown((dropdown) => {
                    dropdown
                        .addOptions({
                            WILDCARD: "Wildcard",
                            REGEX: "Regex",
                            STRICT: "Strict",
                        })
                        .setValue(filter.patternType)
                        .onChange((newPatternType) => {
                            this.plugin.settings.hideFilters.tags[index].patternType = newPatternType as Filter["patternType"];

                            this.plugin.saveSettings();
                            this.plugin.fileExplorer!.requestSort();
                        });
                })
                .addToggle((toggle) => {
                    toggle
                        .setTooltip("Active")
                        .setValue(filter.active)
                        .onChange((isActive) => {
                            this.plugin.settings.hideFilters.tags[index].active = isActive;

                            this.plugin.saveSettings();
                            this.plugin.fileExplorer!.requestSort();
                        });
                })
                .addExtraButton((button) => {
                    button
                        .setIcon("calculator")
                        .setTooltip("View paths hidden by this filter")
                        .onClick(() => {
                            new PathsActivatedModal(this.plugin, "HIDE", filter, "TAG").open();
                        });
                })
                .addExtraButton((button) => {
                    button
                        .setIcon("cross")
                        .setTooltip("Delete")
                        .onClick(() => {
                            this.plugin.settings.hideFilters.tags.splice(index, 1);

                            this.plugin.saveSettings();
                            this.display();
                            this.plugin.fileExplorer!.requestSort();
                        });
                });
        });

        new Setting(this.containerEl).addButton((button) => {
            button
                .setButtonText("Add new hide filter for tags")
                .setCta()
                .onClick(() => {
                    this.plugin.settings.hideFilters.tags.push({
                        name: "",
                        active: true,
                        pattern: "",
                        patternType: "STRICT",
                    });
                    this.plugin.saveSettings();
                    this.display();
                });
        });
    }

    hidePathFiltersSettings() {
        this.containerEl.createEl("h2", { text: "Path Filters" });

        this.plugin.settings.hideFilters.paths.forEach((filter, index) => {
            if (this.plugin.settings.hideStrictPathFilters && filter.patternType === "STRICT") {
                return;
            }

            new Setting(this.containerEl)
                .addText((text) => {
                    text.setPlaceholder("Name (optional)")
                        .setValue(filter.name)
                        .onChange((newName) => {
                            this.plugin.settings.hideFilters.paths[index].name = newName;

                            this.plugin.saveSettings();
                        });
                })
                .addSearch((text) => {
                    new PathSuggest(this.app, text.inputEl);

                    text.setPlaceholder("Path pattern (required)")
                        .setValue(filter.pattern)
                        .onChange((newPattern) => {
                            this.plugin.settings.hideFilters.paths[index].pattern = newPattern;

                            this.plugin.saveSettings();
                            this.plugin.fileExplorer!.requestSort();
                        });
                })
                .addDropdown((dropdown) => {
                    dropdown
                        .addOptions({
                            FILES_AND_DIRECTORIES: "Files and folders",
                            FILES: "Files",
                            DIRECTORIES: "Folders",
                        })
                        .setValue(filter.type)
                        .onChange((newType) => {
                            this.plugin.settings.hideFilters.paths[index].type = newType as PathFilter["type"];

                            this.plugin.saveSettings();
                            this.plugin.fileExplorer!.requestSort();
                        });
                })
                .addDropdown((dropdown) => {
                    dropdown
                        .addOptions({
                            WILDCARD: "Wildcard",
                            REGEX: "Regex",
                            STRICT: "Strict",
                        })
                        .setValue(filter.patternType)
                        .onChange((newPatternType) => {
                            this.plugin.settings.hideFilters.paths[index].patternType = newPatternType as Filter["patternType"];

                            this.plugin.saveSettings();
                            this.plugin.fileExplorer!.requestSort();
                        });
                })
                .addToggle((toggle) => {
                    toggle
                        .setTooltip("Active")
                        .setValue(filter.active)
                        .onChange((isActive) => {
                            this.plugin.settings.hideFilters.paths[index].active = isActive;

                            this.plugin.saveSettings();
                            this.plugin.fileExplorer!.requestSort();
                        });
                })
                .addExtraButton((button) => {
                    button
                        .setIcon("calculator")
                        .setTooltip("View paths hidden by this filter")
                        .onClick(() => {
                            new PathsActivatedModal(this.plugin, "HIDE", filter, "PATH").open();
                        });
                })
                .addExtraButton((button) => {
                    button
                        .setIcon("cross")
                        .setTooltip("Delete")
                        .onClick(() => {
                            this.plugin.settings.hideFilters.paths.splice(index, 1);

                            this.plugin.saveSettings();
                            this.display();
                            this.plugin.fileExplorer!.requestSort();
                        });
                });
        });

        new Setting(this.containerEl).addButton((button) => {
            button
                .setButtonText("Add new hide filter for paths")
                .setCta()
                .onClick(() => {
                    this.plugin.settings.hideFilters.paths.push({
                        name: "",
                        active: true,
                        type: "FILES_AND_DIRECTORIES",
                        pattern: "",
                        patternType: "WILDCARD",
                    });
                    this.plugin.saveSettings();
                    this.display();
                });
        });
    }
}
