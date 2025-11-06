import { useRef, useEffect } from 'react';
import * as OBC from "@thatopen/components";
// import * as FRAGS from "@thatopen/fragments";
// import * as THREE from "three";
import * as BUI from "@thatopen/ui";
import * as THREE from "three";
import { RenderedFaces } from '@thatopen/fragments';
import { loadIFCFile } from '../utils/Load_IFC_File';
import { getFinderFilterResult } from '../utils/Get_Finder_Filter_Result';
import type { TQueriesListTableData } from '../types/QueriesListTableData';
import { queriesListTemplate } from '../utils/Queries_List_Template';
import { useQuery } from '@tanstack/react-query';
import { URL_SERVER } from '../consts';
import { Server_File_Info_Schema } from '../validators/Server_File_Info_Schema';


export function IfcTest() {
    const containerRef = useRef(null);
    const isInitializedRef = useRef(false);
    const componentsRef = useRef<OBC.Components | null>(null);
    const worldRef = useRef<OBC.Worlds | null>(null);
    const fragmentsRef = useRef<OBC.FragmentsManager | null>(null);
    const castersRef = useRef<OBC.Raycasters | null>(null);
    const ifcLoaderRef = useRef<OBC.IfcLoader | null>(null);
    const casterRef = useRef<OBC.SimpleRaycaster | null>(null);
    const model_data = useQuery({
        queryKey: ['model_data'],
        queryFn: async () => {
            const res = await fetch(`${URL_SERVER}file/base_structure.ifc`);
            const data = await res.json();
            // validate the data
            const result = Server_File_Info_Schema.safeParse(data);
            if (!result.success) {
                console.error("Invalid data:", result.error);
                throw new Error("Invalid data");
            }
            return result.data;
        }
    })
    useEffect(() => {
        async function init() {
            const components = new OBC.Components();
            componentsRef.current = components;
            const worlds = components.get(OBC.Worlds);
            worldRef.current = worlds;
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
            const casters = components.get(OBC.Raycasters);
            castersRef.current = casters;
            components.init();
            const caster = casters.get(world);
            casterRef.current = caster 
            
            const fragments = components.get(OBC.FragmentsManager);
            fragmentsRef.current = fragments;
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
            ifcLoaderRef.current = ifcLoader;
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
            finder.create("FURNISHING", [{ categories: [/FURNISHING/] }]);
            finder.create("ROOF", [{ categories: [/ROOF/] }]);

            if (!isInitializedRef.current) {
                BUI.Manager.init();
                isInitializedRef.current = true;
            }

            const queriesList =
                BUI.Component.create<BUI.Table<TQueriesListTableData>>(() => queriesListTemplate(finder));

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
                        const modelIdMap = await getFinderFilterResult(Name, finder);
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
            
            
            
            // const onSelectCallback = async (modelIdMap: { [x: number]: Set<any> }, attrs?: FRAGS.ItemData) => {
            //     const modelId = Object.keys(modelIdMap)[0];
            //     if (modelId && fragments.list.get(modelId)) {
            //         const model = fragments.list.get(modelId)!;
            //         const [data] = await model.getItemsData([...modelIdMap[modelId]]);
            //         // eslint-disable-next-line @typescript-eslint/no-unused-vars
            //         attrs = data;
            //     }

            //     await fragments.highlight(
            //         {
            //         color: COLOR_PURPLE,
            //         renderedFaces: FRAGS.RenderedFaces.ONE,
            //         opacity: 1,
            //         transparent: false,
            //         },
            //         modelIdMap,
            //     );

            //     await fragments.core.update(true);

            //     // onItemSelected();
            // };

        }
        init();
        return () => {
            componentsRef.current?.dispose();
            worldRef.current?.dispose();
            fragmentsRef.current?.dispose();
            casterRef.current?.dispose();
            ifcLoaderRef.current?.dispose();
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
            <button
            id='test' onClick={async () => {
                const modelIdMap = await fragmentsRef.current?.guidsToModelIdMap(['2UD3D7uxP8kecbbBCRtz3R' , '2UD3D7uxP8kecbbBCRtzBk', 
                    '18YHwga450Mw4Fy6M5t_8r'
                ])
                await fragmentsRef.current?.highlight({
                    color: new THREE.Color("purple"),
                    renderedFaces: RenderedFaces.ONE,
                    opacity: 0.5,
                    transparent: false
                }, modelIdMap);
                await fragmentsRef.current?.core.update(true);
            }}>test viewpoint</button>
            <div ref={containerRef} className='relative h-[70dvh]' onDoubleClick={async () => {
                
            }}/>
            {model_data.data?.data.map((row) => <div key={`${row.Element_Type}-${row.Level}`}
            className=''>
                <p>{row.Element_Type} - {row.Quantity} {row.Level}</p>
            </div>)}
        </div>
    );
}

