import { TAbstractFile, TFolder } from "obsidian";

// Needed to support monkey-patching of the folder sort() function

declare module "obsidian" {
    export interface PathVirtualElement {
        childrenEl: HTMLElement;
        collapseEl: HTMLElement;
        collapsed: boolean;
        collapsible: boolean;
        coverEl: HTMLElement;
        el: HTMLElement;
        file: TAbstractFile;
        info: any;
        innerEl: HTMLElement;
        parent?: PathVirtualElement;
        pusherEl: HTMLElement;
        selfEl: HTMLElement;
        vChildren: {
            children: PathVirtualElement;
        };
    }

    interface FileExplorerFolder {}

    export interface FileExplorerView extends View {
        createFolderDom(folder: TFolder): FileExplorerFolder;
        requestSort(): void;

        fileItems: {
            [key: string]: PathVirtualElement;
        };
    }
}
