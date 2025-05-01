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

export interface FrontMatterFilter {
  name: string;
  active: boolean;
  path: string;
  pattern: string;
  patternType: "REGEX" | "WILDCARD" | "STRICT";
}

export interface FileExplorerPlusPluginSettings {
  hideStrictPathFilters: boolean;
  pinFilters: {
    active: boolean;
    tags: TagFilter[];
    paths: PathFilter[];
    frontMatter: FrontMatterFilter[];
  };

  hideFilters: {
    active: boolean;
    tags: TagFilter[];
    paths: PathFilter[];
    frontMatter: FrontMatterFilter[];
    inverse: boolean;
  };
}

export interface Filter {
  name: string;
  active: boolean;
  pattern: string;
  patternType: "REGEX" | "WILDCARD" | "STRICT";
}

export const FILE_EXPLORER_PLUS_DEFAULT_SETTINGS: FileExplorerPlusPluginSettings = {
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
    frontMatter: [
      {
        name: "",
        active: true,
        path: "",
        pattern: "",
        patternType: "STRICT",
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
    frontMatter: [
      {
        name: "",
        active: true,
        path: "",
        pattern: "",
        patternType: "STRICT",
      },
    ],
    inverse: false,
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

    // Ensure that new settings exists
    if (!this.plugin.settings.pinFilters.frontMatter) {
      this.plugin.settings.pinFilters.frontMatter = FILE_EXPLORER_PLUS_DEFAULT_SETTINGS.pinFilters.frontMatter;
    }

    if (!this.plugin.settings.hideFilters.frontMatter) {
      this.plugin.settings.hideFilters.frontMatter = FILE_EXPLORER_PLUS_DEFAULT_SETTINGS.hideFilters.frontMatter;
    }

    this.containerEl.empty();
    this.containerEl.addClass("file-explorer-plus");

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

    this.containerEl.createEl("h2", { text: "Pin filters", attr: { class: "settings-header" } });
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

            this.plugin.getFileExplorer()?.requestSort();
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
    this.pinFrontMatterFiltersSettings();

    this.containerEl.createEl("h2", { text: "Hide filters", attr: { class: "settings-header" } });
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

            this.plugin.getFileExplorer()?.requestSort();
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

    new Setting(this.containerEl)
      .setName("Inverse hide filters")
      .setDesc("Hide everything except items matching the filters.")
      .addToggle((toggle) =>
        toggle
          .setTooltip(toggle ? "Inverse" : "Normal")
          .setValue(this.plugin.settings.hideFilters.inverse)
          .onChange((inverse) => {
            this.plugin.settings.hideFilters.inverse = inverse;

            this.plugin.saveSettings();

            this.plugin.getFileExplorer()?.requestSort();
          })
      );

    this.hideTagFiltersSettings();
    this.hidePathFiltersSettings();
    this.hideFrontMatterFiltersSettings();
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
    this.containerEl.createEl("h2", { text: "Tag filters" });

    this.plugin.settings.pinFilters.tags.forEach((filter, index) => {
      new Setting(this.containerEl)
        .addText((text) => {
          text
            .setPlaceholder("Name (optional)")
            .setValue(filter.name)
            .onChange((newName) => {
              this.plugin.settings.pinFilters.tags[index].name = newName;

              this.plugin.saveSettings();
            });
        })
        .addText((text) => {
          text
            .setPlaceholder("Tag pattern (required)")
            .setValue(filter.pattern)
            .onChange((newPattern) => {
              this.plugin.settings.pinFilters.tags[index].pattern = newPattern;

              this.plugin.saveSettings();
              this.plugin.getFileExplorer()?.requestSort();
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
              this.plugin.getFileExplorer()?.requestSort();
            });
        })
        .addToggle((toggle) => {
          toggle
            .setTooltip("Active")
            .setValue(filter.active)
            .onChange((isActive) => {
              this.plugin.settings.pinFilters.tags[index].active = isActive;

              this.plugin.saveSettings();
              this.plugin.getFileExplorer()?.requestSort();
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
              this.plugin.getFileExplorer()?.requestSort();
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
    this.containerEl.createEl("h2", { text: "Path filters" });

    this.plugin.settings.pinFilters.paths.forEach((filter, index) => {
      if (this.plugin.settings.hideStrictPathFilters && filter.patternType === "STRICT") {
        return;
      }

      new Setting(this.containerEl)
        .addText((text) => {
          text
            .setPlaceholder("Name (optional)")
            .setValue(filter.name)
            .onChange((newName) => {
              this.plugin.settings.pinFilters.paths[index].name = newName;

              this.plugin.saveSettings();
            });
        })
        .addSearch((text) => {
          new PathSuggest(this.app, text.inputEl);

          text
            .setPlaceholder("Path pattern (required)")
            .setValue(filter.pattern)
            .onChange((newPattern) => {
              this.plugin.settings.pinFilters.paths[index].pattern = newPattern;

              this.plugin.saveSettings();
              this.plugin.getFileExplorer()?.requestSort();
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
              this.plugin.getFileExplorer()?.requestSort();
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
              this.plugin.getFileExplorer()?.requestSort();
            });
        })
        .addToggle((toggle) => {
          toggle
            .setTooltip("Active")
            .setValue(filter.active)
            .onChange((isActive) => {
              this.plugin.settings.pinFilters.paths[index].active = isActive;

              this.plugin.saveSettings();
              this.plugin.getFileExplorer()?.requestSort();
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
              this.plugin.getFileExplorer()?.requestSort();
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

  pinFrontMatterFiltersSettings() {
    this.containerEl.createEl("h2", { text: "Front Matter filters" });

    this.plugin.settings.pinFilters.frontMatter?.forEach((filter, index) => {
      new Setting(this.containerEl)
        .addText((text) => {
          text
            .setPlaceholder("Name (optional)")
            .setValue(filter.name)
            .onChange((newName) => {
              this.plugin.settings.pinFilters.frontMatter[index].name = newName;

              this.plugin.saveSettings();
            });
        })
        .addText((text) => {
          text
            .setPlaceholder("Key path (required)")
            .setValue(filter.path)
            .onChange((newPath) => {
              this.plugin.settings.pinFilters.frontMatter[index].path = newPath;

              this.plugin.saveSettings();
              this.plugin.getFileExplorer()?.requestSort();
            });
        })
        .addText((text) => {
          text
            .setPlaceholder("Value pattern (required)")
            .setValue(filter.pattern)
            .onChange((newPattern) => {
              this.plugin.settings.pinFilters.frontMatter[index].pattern = newPattern;

              this.plugin.saveSettings();
              this.plugin.getFileExplorer()?.requestSort();
            });
        })
        // .addDropdown((dropdown) => {
        //   dropdown
        //     .addOptions({
        //       WILDCARD: "Wildcard",
        //       REGEX: "Regex",
        //       STRICT: "Strict",
        //     })
        //     .setValue(filter.patternType)
        //     .onChange((newPatternType) => {
        //       this.plugin.settings.pinFilters.frontMatter[index].patternType = newPatternType as Filter["patternType"];

        //       this.plugin.saveSettings();
        //       this.plugin.getFileExplorer()?.requestSort();
        //     });
        // })
        .addToggle((toggle) => {
          toggle
            .setTooltip("Active")
            .setValue(filter.active)
            .onChange((isActive) => {
              this.plugin.settings.pinFilters.frontMatter[index].active = isActive;

              this.plugin.saveSettings();
              this.plugin.getFileExplorer()?.requestSort();
            });
        })
        .addExtraButton((button) => {
          button
            .setIcon("calculator")
            .setTooltip("View paths pinned by this filter")
            .onClick(() => {
              new PathsActivatedModal(this.plugin, "PIN", filter, "FRONTMATTER").open();
            });
        })
        .addExtraButton((button) => {
          button
            .setIcon("cross")
            .setTooltip("Delete")
            .onClick(() => {
              this.plugin.settings.pinFilters.frontMatter.splice(index, 1);

              this.plugin.saveSettings();
              this.display();
              this.plugin.getFileExplorer()?.requestSort();
            });
        });
    });

    new Setting(this.containerEl).addButton((button) => {
      button
        .setButtonText("Add new pin filter for front matter")
        .setCta()
        .onClick(() => {
          this.plugin.settings.pinFilters.frontMatter.push({
            name: "",
            active: true,
            path: "",
            pattern: "",
            patternType: "STRICT",
          });
          this.plugin.saveSettings();
          this.display();
        });
    });
  }

  hideTagFiltersSettings() {
    this.containerEl.createEl("h2", { text: "Tag filters" });

    this.plugin.settings.hideFilters.tags.forEach((filter, index) => {
      new Setting(this.containerEl)
        .addText((text) => {
          text
            .setPlaceholder("Name (optional)")
            .setValue(filter.name)
            .onChange((newName) => {
              this.plugin.settings.hideFilters.tags[index].name = newName;

              this.plugin.saveSettings();
            });
        })
        .addText((text) => {
          text
            .setPlaceholder("Tag pattern (required)")
            .setValue(filter.pattern)
            .onChange((newPattern) => {
              this.plugin.settings.hideFilters.tags[index].pattern = newPattern;

              this.plugin.saveSettings();
              this.plugin.getFileExplorer()?.requestSort();
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
              this.plugin.getFileExplorer()?.requestSort();
            });
        })
        .addToggle((toggle) => {
          toggle
            .setTooltip("Active")
            .setValue(filter.active)
            .onChange((isActive) => {
              this.plugin.settings.hideFilters.tags[index].active = isActive;

              this.plugin.saveSettings();
              this.plugin.getFileExplorer()?.requestSort();
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
              this.plugin.getFileExplorer()?.requestSort();
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
    this.containerEl.createEl("h2", { text: "Path filters" });

    this.plugin.settings.hideFilters.paths.forEach((filter, index) => {
      if (this.plugin.settings.hideStrictPathFilters && filter.patternType === "STRICT") {
        return;
      }

      new Setting(this.containerEl)
        .addText((text) => {
          text
            .setPlaceholder("Name (optional)")
            .setValue(filter.name)
            .onChange((newName) => {
              this.plugin.settings.hideFilters.paths[index].name = newName;

              this.plugin.saveSettings();
            });
        })
        .addSearch((text) => {
          new PathSuggest(this.app, text.inputEl);

          text
            .setPlaceholder("Path pattern (required)")
            .setValue(filter.pattern)
            .onChange((newPattern) => {
              this.plugin.settings.hideFilters.paths[index].pattern = newPattern;

              this.plugin.saveSettings();
              this.plugin.getFileExplorer()?.requestSort();
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
              this.plugin.getFileExplorer()?.requestSort();
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
              this.plugin.getFileExplorer()?.requestSort();
            });
        })
        .addToggle((toggle) => {
          toggle
            .setTooltip("Active")
            .setValue(filter.active)
            .onChange((isActive) => {
              this.plugin.settings.hideFilters.paths[index].active = isActive;

              this.plugin.saveSettings();
              this.plugin.getFileExplorer()?.requestSort();
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
              this.plugin.getFileExplorer()?.requestSort();
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

  hideFrontMatterFiltersSettings() {
    this.containerEl.createEl("h2", { text: "Front Matter filters" });

    this.plugin.settings.hideFilters.frontMatter?.forEach((filter, index) => {
      new Setting(this.containerEl)
        .addText((text) => {
          text
            .setPlaceholder("Name (optional)")
            .setValue(filter.name)
            .onChange((newName) => {
              this.plugin.settings.hideFilters.frontMatter[index].name = newName;

              this.plugin.saveSettings();
            });
        })
        .addText((text) => {
          text
            .setPlaceholder("Key path (required)")
            .setValue(filter.path)
            .onChange((newPath) => {
              this.plugin.settings.hideFilters.frontMatter[index].path = newPath;

              this.plugin.saveSettings();
              this.plugin.getFileExplorer()?.requestSort();
            });
        })
        .addText((text) => {
          text
            .setPlaceholder("Value pattern (required)")
            .setValue(filter.pattern)
            .onChange((newPattern) => {
              this.plugin.settings.hideFilters.frontMatter[index].pattern = newPattern;

              this.plugin.saveSettings();
              this.plugin.getFileExplorer()?.requestSort();
            });
        })
        // .addDropdown((dropdown) => {
        //   dropdown
        //     .addOptions({
        //       WILDCARD: "Wildcard",
        //       REGEX: "Regex",
        //       STRICT: "Strict",
        //     })
        //     .setValue(filter.patternType)
        //     .onChange((newPatternType) => {
        //       this.plugin.settings.hideFilters.frontMatter[index].patternType = newPatternType as Filter["patternType"];

        //       this.plugin.saveSettings();
        //       this.plugin.getFileExplorer()?.requestSort();
        //     });
        // })
        .addToggle((toggle) => {
          toggle
            .setTooltip("Active")
            .setValue(filter.active)
            .onChange((isActive) => {
              this.plugin.settings.hideFilters.frontMatter[index].active = isActive;

              this.plugin.saveSettings();
              this.plugin.getFileExplorer()?.requestSort();
            });
        })
        .addExtraButton((button) => {
          button
            .setIcon("calculator")
            .setTooltip("View paths pinned by this filter")
            .onClick(() => {
              new PathsActivatedModal(this.plugin, "PIN", filter, "FRONTMATTER").open();
            });
        })
        .addExtraButton((button) => {
          button
            .setIcon("cross")
            .setTooltip("Delete")
            .onClick(() => {
              this.plugin.settings.hideFilters.frontMatter.splice(index, 1);

              this.plugin.saveSettings();
              this.display();
              this.plugin.getFileExplorer()?.requestSort();
            });
        });
    });

    new Setting(this.containerEl).addButton((button) => {
      button
        .setButtonText("Add new pin filter for front matter")
        .setCta()
        .onClick(() => {
          this.plugin.settings.hideFilters.frontMatter.push({
            name: "",
            active: true,
            path: "",
            pattern: "",
            patternType: "STRICT",
          });
          this.plugin.saveSettings();
          this.display();
        });
    });
  }
}
