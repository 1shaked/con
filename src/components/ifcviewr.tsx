import { useRef, useEffect } from 'react';
import * as OBC from "@thatopen/components";
import * as FRAGS from "@thatopen/fragments";
import * as THREE from "three";

export function IfcViewer() {
    const containerRef = useRef(null);

    useEffect(() => {
        async function init() {
            const components = new OBC.Components();
            const casters = components.get(OBC.Raycasters);
            const worlds = components.get(OBC.Worlds);
            const world = worlds.create();
            

            world.scene = new OBC.SimpleScene(components);

            // @ts-expect-error the parameter does exist and needed here
            world.scene?.setup()
            if (!containerRef?.current) return;
            world.renderer = new OBC.SimpleRenderer(components, containerRef?.current);
            world.camera = new OBC.SimpleCamera(components);
            world.camera?.controls?.setLookAt(74, 16, 0.2, 30, -4, 27);

            components.init();

            // We set the color outside just to be able to change it from the UI
            const color = new THREE.Color("purple");
            // Each raycaster is associated with a specific world.
            // Here, we retrieve the raycaster for the `world` used in our scene.
            const caster = casters.get(world)
            const onSelectCallback = async (modelIdMap) => {
                debugger
                console.log("Selected items:", modelIdMap);
                const modelId = Object.keys(modelIdMap)[0];
                let attributes = {};
                if (modelId && fragments.list.get(modelId)) {
                    const model = fragments.list.get(modelId)!;
                    const [data] = await model.getItemsData([...modelIdMap[modelId]]);
                    console.log("Item data:", data);
                    attributes = data;
                }

                await fragments.highlight(
                    {
                        color,
                        renderedFaces: FRAGS.RenderedFaces.ONE,
                        opacity: 1,
                        transparent: false,
                    },
                    modelIdMap,
                );

                await fragments.core.update(true);

            };
            console.log("Caster:", containerRef.current, caster);
            containerRef.current?.addEventListener("dblclick", async (ev) => {
                debugger
                const rect = containerRef.current!.getBoundingClientRect();
                const x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
                const y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
                const res = await caster.castRay({ position: new THREE.Vector2(x, y) });
                console.log("Raycast result:", res);    
                debugger
                const result = (await caster.castRay()) as any;
                if (!result) return;
                // The modelIdMap is how selections are represented in the engine.
                // The keys are modelIds, while the values are sets of localIds (items within the model)
                const modelIdMap = { [result.fragments.modelId]: new Set([result.localId]) };
                onSelectCallback(modelIdMap);
            });

            console.log("World on caster:", caster.world === world); // should be true

            const grids = components.get(OBC.Grids);
            grids.create(world);

            // Setup IfcImporter
            const serializer = new FRAGS.IfcImporter();
            serializer.wasm = {
                absolute: true,
                path: "https://unpkg.com/web-ifc@0.0.72/",
            };

            // Setup Fragments
            const fragments = new FRAGS.FragmentsModels("/src/worker.mjs");
            world.camera.controls?.addEventListener("rest", () => fragments.update(true));

            // Setup file input handler
            const input = document.getElementById("ifcInput");
            input?.addEventListener("change", async (e) => {
                const file = (e.target as HTMLInputElement)?.files?.[0];
                if (!file) return;
                const buffer = await file.arrayBuffer();
                const bytes = new Uint8Array(buffer);
                const fragmentBytes = await serializer.process({
                    bytes,
                    progressCallback: (progress, data) => console.log(progress, data),
                });
                const model = await fragments.load(fragmentBytes, { modelId: file.name });
                model.useCamera(world.camera.three);
                world.scene.three.add(model.object);
                await fragments.update(true);
                const items = await model.getItemsOfCategories([/IFCWALL/, /IFCSLAB/]);
                const attrs = await model.getAttributeTypes()
                console.log(items);
                console.log(attrs);

                const props = await model.getItemsWithGeometry();
                console.log(props);




                // const elementProps = await model.id({
                //     ids: ['30cc0b59-59c0-49c8-87dc-1cb2c579c399'],
                //     includeAttributes: true,
                //     includePsets: true,
                //     includeQto: true,
                //     includeMaterials: true,
                // });

                // console.log("IFC Element:", '30cc0b59-59c0-49c8-87dc-1cb2c579c399', elementProps[0]);
                // props is a HUGE nested object.
            });
        }
        init();
    }, []);

    return (
        <div className="w-full">
            <input type="file" id="ifcInput" accept=".ifc" />
            <div ref={containerRef} style={{ width: '100%', height: '100vh' }} />
        </div>
    );
}

