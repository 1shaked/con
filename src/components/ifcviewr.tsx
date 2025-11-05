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
                fileSelected(e, serializer);
            });
            async function fileSelected (e: Event, serializer: FRAGS.IfcImporter) {
                const file = (e.target as HTMLInputElement)?.files?.[0];
                if (!file) return;
                const buffer = await file.arrayBuffer();
                const bytes = new Uint8Array(buffer);
                const fragmentBytes = await serializer.process({
                    bytes,
                    progressCallback: (progress, data) => console.log(progress, data),
                });
                const model = await fragments.load(fragmentBytes, { modelId: file.name });
                // @ts-expect-error the parameter does exist and needed here
                model.useCamera(world.camera.three);
                world.scene.three.add(model.object);
                await fragments.update(true);
                const items = await model.getItemsOfCategories([/IFCWALL/, /IFCSLAB/]);
                const attrs = await model.getAttributeTypes()
                console.log(items);
                console.log(attrs);

                const props = await model.getItemsWithGeometry();
                console.log(props);
            }
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

