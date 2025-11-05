import { useRef, useEffect } from 'react';
import * as OBC from "@thatopen/components";
// import * as FRAGS from "@thatopen/fragments";
// import * as THREE from "three";
import * as BUI from "@thatopen/ui";

export function IfcTest() {
    const containerRef = useRef(null);
    const isInitializedRef = useRef(false);
    useEffect(() => {
        async function init() {
            const components = new OBC.Components();
            const worlds = components.get(OBC.Worlds);
            const world = worlds.create<
                OBC.SimpleScene,
                OBC.OrthoPerspectiveCamera,
                OBC.SimpleRenderer
            >();


            world.scene = new OBC.SimpleScene(components);
            
            if (!containerRef?.current) return;
            world.scene.setup();
            world.scene.three.background = null;
            world.renderer = new OBC.SimpleRenderer(components, containerRef?.current);
            world.camera = new OBC.OrthoPerspectiveCamera(components);
            await world.camera.controls.setLookAt(78, 20, -2.2, 26, -4, 25);
            // Setup Grid
            const grids = components.get(OBC.Grids);
            grids.create(world);
            components.init();
            
            const fragments = components.get(OBC.FragmentsManager);
            fragments.init("/src/worker.mjs");
            
            // set fragment that when a model is added, it is added to the scene and linked to the camera
            fragments.list.onItemSet.add(({ value: model }) => {
                model.useCamera(world.camera.three);
                world.scene.three.add(model.object);
                fragments.core.update(true);
            });
            // update fragments on camera rest (when the user stops moving the view)
            world.camera.controls.addEventListener("rest", () => fragments.core.update(true));

            // Setup IfcImporter
            const ifcLoader = components.get(OBC.IfcLoader);
            await ifcLoader.setup({
                autoSetWasm: false,
                wasm: {
                    path: "https://unpkg.com/web-ifc@0.0.72/",
                    absolute: true,
                },
            });

            // when a file is selected, load it
            const input = document.getElementById("ifcInput");
            input?.addEventListener("change", async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (!file) return;
                await loadIFCFile(file, ifcLoader, file.name);
            });

            const finder = components.get(OBC.ItemsFinder);
            finder.create("WALL", [{ categories: [/WALL/] }]);
            finder.create("DOOR", [{ categories: [/DOOR/ ] }]);
            finder.create("WINDOW", [{ categories: [/WINDOW/] }]);
            finder.create("SLAB", [{ categories: [/SLAB/] }]);




            // add BUI
            // if (!BUI.Manager.initialized) BUI.Manager.init();
            if (!isInitializedRef.current) {
                // debugger
                BUI.Manager.init();
                isInitializedRef.current = true;
            }

            type QueriesListTableData = {
                Name: string;
                Actions: string;
            };

            function queriesListTemplate(finder: OBC.ItemsFinder) {
                const onCreated = (e?: Element) => {
                    if (!e) return;
                    const table = e as BUI.Table<QueriesListTableData>;

                    table.loadFunction = async () => {
                        const data: BUI.TableGroupData<QueriesListTableData>[] = [];

                        for (const [name] of finder.list) {
                            data.push({
                                data: { Name: name, Actions: "" },
                            });
                        }

                        return data;
                    };

                    table.loadData(true);
                };

                return BUI.html`
                    <bim-table ${BUI.ref(onCreated)}></bim-table>
                `;
            };

            const queriesList =
                BUI.Component.create<BUI.Table<QueriesListTableData>>(() => queriesListTemplate(finder));

            queriesList.style.maxHeight = "25rem";
            queriesList.columns = ["Name", { name: "Actions", width: "auto" }];
            queriesList.noIndentation = true;
            queriesList.headersHidden = true;
            queriesList.dataTransform = {
                Actions: (_, rowData) => {
                    const { Name } = rowData;
                    if (!Name) return _;

                    const hider = components.get(OBC.Hider);
                    const onClick = async ({ target }: { target: BUI.Button }) => {
                        target.loading = true;
                        const modelIdMap = await getResult(Name, finder);
                        await hider.isolate(modelIdMap);
                        target.loading = false;
                    };

                    return BUI.html`<bim-button icon="solar:cursor-bold" @click=${onClick}></bim-button>`;
                },
            };

            const panel = BUI.Component.create<BUI.PanelSection>(() => {
                const onResetVisibility = async ({ target }: { target: BUI.Button }) => {
                    target.loading = true;
                    const hider = components.get(OBC.Hider);
                    await hider.set(true);
                    target.loading = false;
                };

                return BUI.html`
                    <bim-panel active label="Items Finder Tutorial" class="options-menu">
                    <bim-panel-section style="min-width: 14rem" label="General">
                        <bim-button label="Reset Visibility" @click=${onResetVisibility}></bim-button>
                    </bim-panel-section>
                    <bim-panel-section label="Queries">
                        ${queriesList}
                    </bim-panel-section>
                    </bim-panel>
                `;
            });
            // check if panel already exists in the document
            const existingPanel = document.body.querySelector('.options-menu');
            if (existingPanel) {
                existingPanel.remove();
            }
            panel.style.position = "absolute";
            panel.style.top = "1rem";
            panel.style.right = "1rem";
            panel.style.zIndex = "10";        // above the canvas
            panel.classList.add("options-menu");
            (containerRef.current as HTMLElement).append(panel);
            // document.body.append(panel);
            
            return {components, world, panel};

        }
        const items = init();
        return () => {
            items.then((objs) => {
                objs?.components?.dispose();
                // objs?.world?.dispose();
                objs?.panel?.remove();
                if (objs?.panel?.parentElement) {
                    document.body.removeChild(objs?.panel.parentElement);
                }
            });
        }


    }, []);

    return (
        <div className="">
            <input
                id="ifcInput"
                type="file"
                accept=".ifc"
                className="
                    block w-full max-w-sm cursor-pointer rounded-xl shadow-sm
                    text-sm text-slate-900
                    file:mr-4 file:rounded-xl file:border-0 file:px-4 file:py-2
                    file:font-semibold file:bg-blue-600 file:text-white
                    hover:file:bg-blue-500
                    focus:outline-none focus:ring-2 focus:ring-blue-500/60
                    disabled:opacity-50
                "
            />
            <div ref={containerRef} className='relative h-[70dvh]'/>
        </div>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export async function loadIFCFile(file: File, ifcLoader: OBC.IfcLoader, name: string = "IFCModel") {
    // const file = await fetch(path);
    // const data = await file.arrayBuffer();
    const data = await file.arrayBuffer();
    const buffer = new Uint8Array(data);
    await ifcLoader.load(buffer, false, name, {
        processData: {
            progressCallback: (progress) => console.log(progress),
        },
    });
}

// eslint-disable-next-line react-refresh/only-export-components
export async function getResult(name: string, finder: OBC.ItemsFinder) {
    const finderQuery = finder.list.get(name);
    if (!finderQuery) return {};
    const result = await finderQuery.test();
    return result;
};