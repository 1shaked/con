import { useRef, useEffect, useState } from 'react';
import * as OBC from "@thatopen/components";
// import * as FRAGS from "@thatopen/fragments";
// import * as THREE from "three";
import * as BUI from "@thatopen/ui";
import * as THREE from "three";
import { RenderedFaces } from '@thatopen/fragments';
import { loadIFCFile } from '../utils/Load_IFC_File';
// import { getFinderFilterResult } from '../utils/Get_Finder_Filter_Result';
// import type { TQueriesListTableData } from '../types/QueriesListTableData';
// import { queriesListTemplate } from '../utils/Queries_List_Template';
import { useMutation, useQuery } from '@tanstack/react-query';
import { URL_SERVER } from '../consts';
import { Server_File_Info_Schema } from '../validators/Server_File_Info_Schema';
import { Server_GUIDS_For_Type_Schema } from '../validators/Server_GUIDS_For_Type';


export function IfcTest() {
    const containerRef = useRef(null);
    const isInitializedRef = useRef(false);
    const componentsRef = useRef<OBC.Components | null>(null);
    const worldRef = useRef<OBC.Worlds | null>(null);
    const fragmentsRef = useRef<OBC.FragmentsManager | null>(null);
    const castersRef = useRef<OBC.Raycasters | null>(null);
    const ifcLoaderRef = useRef<OBC.IfcLoader | null>(null);
    const casterRef = useRef<OBC.SimpleRaycaster | null>(null);
    const [file, setFile] = useState<File | null>(null);
    // get the file name
    const fileName = file ? file.name : null;
    const model_data = useQuery({
        queryKey: ['model_data', fileName],
        queryFn: async () => {
            if (!fileName) return { file: '', data: [] };
            const res = await fetch(`${URL_SERVER}file/${fileName}`);
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
    const [selectedElements, setSelectedElements] = useState<Set<string>>(new Set());
    const [selectedElementIndividually, setSelectedElementIndividually] = useState<Set<string>>(new Set());
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
                setFile(file);
                await loadIFCFile(file, ifcLoader, file.name);
                const form = new FormData();
                form.append("ifc_file", file);
                await fetch(`${URL_SERVER}upload_ifc/`, {
                    method: 'POST',
                    body: form
                })
            });

            // const finder = components.get(OBC.ItemsFinder);
            // finder.create("WALL", [{ categories: [/WALL/] }]);
            // finder.create("DOOR", [{ categories: [/DOOR/] }]);
            // finder.create("WINDOW", [{ categories: [/WINDOW/] }]);
            // finder.create("SLAB", [{ categories: [/SLAB/] }]);
            // finder.create("FURNISHING", [{ categories: [/FURNISHING/] }]);
            // finder.create("ROOF", [{ categories: [/ROOF/] }]);

            if (!isInitializedRef.current) {
                BUI.Manager.init();
                isInitializedRef.current = true;
            }

            // const queriesList =
            //     BUI.Component.create<BUI.Table<TQueriesListTableData>>(() => queriesListTemplate(finder));

            // queriesList.style.maxHeight = "25rem";
            // queriesList.columns = ["Name", { name: "Actions", width: "auto" }];
            // queriesList.noIndentation = true;
            // queriesList.headersHidden = true;
            // queriesList.dataTransform = {
            //     Actions: (_, rowData) => {
            //         const { Name } = rowData;
            //         if (!Name) return _;

            //         const hider = components.get(OBC.Hider);
            //         const onClick = async ({ target }: { target: BUI.Button }) => {
            //             target.loading = true;
            //             const modelIdMap = await getFinderFilterResult(Name, finder);
            //             await hider.isolate(modelIdMap);
            //             target.loading = false;
            //         };

            //         return BUI.html`<bim-button icon="solar:cursor-bold" @click=${onClick}></bim-button>`;
            //     },
            // };

            // const panel = BUI.Component.create<BUI.PanelSection>(() => {
            //     const onResetVisibility = async ({ target }: { target: BUI.Button }) => {
            //         target.loading = true;
            //         const hider = components.get(OBC.Hider);
            //         await hider.set(true);
            //         target.loading = false;
            //     };

                // return BUI.html`
                //     <bim-panel active label="Items Finder Tutorial" class="options-menu">
                //     <bim-panel-section style="min-width: 14rem" label="General">
                //         <bim-button label="Reset Visibility" @click=${onResetVisibility}></bim-button>
                //     </bim-panel-section>
                //     <bim-panel-section label="Queries">
                //         ${queriesList}
                //     </bim-panel-section>
                //     </bim-panel>
                // `;
            // });
            // check if panel already exists in the document
            const existingPanel = document.body.querySelector('.options-menu');
            if (existingPanel) {
                existingPanel.remove();
            }
            // panel.style.position = "absolute";
            // panel.style.top = "1rem";
            // panel.style.right = "1rem";
            // panel.style.zIndex = "10";        // above the canvas
            // panel.classList.add("options-menu");
            // (containerRef.current as HTMLElement).append(panel);
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
    interface ElementSelectionParams {
        element_type: string;
        level_name: string;
        ifc_file: Blob;
    }
    const element_details_mutation = useMutation({
        mutationKey: ['element_details'],
        mutationFn: async (params: ElementSelectionParams) => {
            const key = `${params.element_type}-${params.level_name}`;
            const to_remove = selectedElements.has(key)
            if (to_remove ) {
                selectedElements.delete(key);
                setSelectedElements(new Set([...selectedElements]))
            } else {
                setSelectedElements(new Set([...selectedElements, key]));
            }
            const form = new FormData();
            form.append("element_type", params.element_type);
            form.append("level_name", params.level_name);
            form.append("ifc_file", params.ifc_file);
            const res = await fetch(`${URL_SERVER}get_guids/`, {
                method: 'POST',
                body: form
            });
            const data = await res.json();
            const validateData = Server_GUIDS_For_Type_Schema.safeParse(data);
            if (!validateData.success) {
                console.error("Invalid data:", validateData.error);
                return;
            }
            console.log("Validated GUIDs Data:", validateData.data);
            const modelIdMap = await fragmentsRef.current?.guidsToModelIdMap(validateData.data.guids)
            if (!modelIdMap) return;
            if (to_remove) {
                await fragmentsRef.current?.resetHighlight(modelIdMap);
                return;
            }
            await fragmentsRef.current?.highlight({
                color: new THREE.Color("purple"),
                renderedFaces: RenderedFaces.ONE,
                opacity: 0.5,
                transparent: false
            }, modelIdMap);
        }
    })
    async function selectedElementIndividuallyMarker() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const result = (await casterRef.current?.castRay()) as any;
                if (!result) return;
                const modelId = result.fragments.modelId;
                const localId = result.localId;
                const modelIdMap = { [modelId]: new Set([localId]) };
                const guids = await fragmentsRef.current?.modelIdMapToGuids(modelIdMap);
                console.log("GUIDs:", guids);
                if (!guids) return;
                for (const guid of guids) {
                    if (selectedElementIndividually.has(guid)) {
                        setSelectedElementIndividually(new Set([...selectedElementIndividually].filter(id => id !== guid)));
                        await fragmentsRef.current?.resetHighlight(modelIdMap);
                        return ;
                    }
                    setSelectedElementIndividually(new Set([...selectedElementIndividually, guid]));
                    await fragmentsRef.current?.highlight({
                        color: new THREE.Color("red"),
                        renderedFaces: RenderedFaces.ONE,
                        opacity: 0.5,
                        transparent: false,
                    }, modelIdMap);
                }
    }
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

            <div ref={containerRef} 
            className='relative h-[70dvh] rounded-lg border border-gray-200 shadow-lg overflow-hidden'
            onDoubleClick={selectedElementIndividuallyMarker} />
            {/* Enhanced Data Display */}
            <div className="mt-6 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="bg-linear-to-r from-blue-600 to-blue-700 px-6 py-4">
                    <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        Building Elements Summary {element_details_mutation.isPending ? ' - Updating...' : ''}
                    </h3>
                    <p className="text-blue-100 text-sm mt-1">
                        {model_data.data?.data.length || 0} element types found
                    </p>
                </div>

                <div className="p-6">
                    {model_data.isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <span className="ml-3 text-gray-600">Loading elements...</span>
                        </div>
                    ) : model_data.error ? (
                        <div className="text-center py-12">
                            <div className="text-red-500 text-lg mb-2">⚠ Error loading data</div>
                            <p className="text-gray-600">Unable to fetch building elements</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {model_data.data?.data.map((row,) => (
                                <div
                                    key={`${row.Element_Type}-${row.Level}`}
                                    className={`group bg-linear-to-br from-gray-50 to-gray-100
                                             border border-gray-200 hover:border-blue-300 rounded-lg p-4 
                                             transform hover:scale-105 transition-all duration-200 
                                             hover:shadow-md cursor-pointer
                                             ${selectedElements.has(`${row.Element_Type}-${row.Level}`) ? 'shadow-lg shadow-blue-500/25 border-blue-400 bg-linear-to-br from-green-500 to-green-50' : ''}`}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <h4 className={`font-semibold text-gray-900 group-hover:text-blue-700 
                                                         text-lg leading-tight ${selectedElements.has(`${row.Element_Type}-${row.Level}`) ? 'text-blue-700' : ''}`}
                                                >
                                                {row.Element_Type}
                                            </h4>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full 
                                                               text-xs font-medium 
                                                               ${selectedElements.has(`${row.Element_Type}-${row.Level}`) ? 'bg-blue-200 text-blue-900' : 'bg-blue-100 text-blue-800'} 
                                                               group-hover:bg-blue-200`}>
                                                    Level {row.Level}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`text-2xl font-bold group-hover:text-blue-700 
                                                           ${selectedElements.has(`${row.Element_Type}-${row.Level}`) ? 'text-blue-700' : 'text-blue-600'}`}>
                                                {row.Quantity.toLocaleString()}
                                            </div>
                                            <div className="text-xs text-gray-500 uppercase tracking-wide">
                                                Quantity
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-3 border-t border-gray-200 
                                                  group-hover:border-blue-200">
                                        <div className={`flex items-center text-sm group-hover:text-blue-600 
                                                       ${selectedElements.has(`${row.Element_Type}-${row.Level}`) ? 'text-blue-600' : 'text-gray-600'}`}>
                                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Total Quantity {row.Project_Total.toLocaleString()}
                                        </div>
                                        <button className="opacity-0 group-hover:opacity-100 
                                                         text-blue-50 hover:text-blue-700 hover:bg-white text-sm font-medium"
                                                         onClick={() => {
                                                    element_details_mutation.mutate({
                                                            element_type: row.Element_Type,
                                                            level_name: row.Level ?? '',
                                                            ifc_file: file as Blob,
                                                    })
                                                }}>
                                                    {selectedElements.has(`${row.Element_Type}-${row.Level}`) ? 'Hide Details' : 'View Details'}
                                            →
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {model_data.data?.data.length === 0 && !model_data.isLoading && (
                        <div className="text-center py-12">
                            <div className="text-gray-400 text-6xl mb-4">📋</div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No elements found</h3>
                            <p className="text-gray-600">Load an IFC file to see building elements</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

