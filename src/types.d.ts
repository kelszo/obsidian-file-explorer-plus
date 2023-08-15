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
        info: {
            childLeft: number;
            childLeftPadding: number;
            childTop: number;
            computed: boolean;
            height: number;
            hidden: boolean;
            pinned?: boolean;
            next: boolean;
            queued: boolean;
            width: number;
        };
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
