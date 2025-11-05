import { useRef, useEffect } from 'react';
import * as OBC from "@thatopen/components";
import * as FRAGS from "@thatopen/fragments";
import * as THREE from "three";
import * as BUI from "@thatopen/ui";

export function IfcTest() {
    const containerRef = useRef(null);

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

            world.scene?.setup()
            if (!containerRef?.current) return;
            world.scene = new OBC.SimpleScene(components);
            world.scene.setup();
            world.scene.three.background = null;
            world.renderer = new OBC.SimpleRenderer(components, containerRef?.current);
            world.camera = new OBC.OrthoPerspectiveCamera(components);
            await world.camera.controls.setLookAt(78, 20, -2.2, 26, -4, 25);
            components.init();
            // Setup Grid
            const grids = components.get(OBC.Grids);
            grids.create(world);


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
        }
        init();
    }, []);

    return (
        <div className="w-full">
            <input
                id="ifcInput"
                type="file"
                accept=".ifc"
                className="
                    block w-full max-w-sm cursor-pointer rounded-xl shadow-sm
                    text-sm text-slate-900
                    file:mr-4 file:rounded-xl file:border-0 file:px-4 file:py-2
                    file:font-semibold file:bg-amber-600 file:text-white
                    hover:file:bg-amber-500
                    focus:outline-none focus:ring-2 focus:ring-amber-500/60
                    disabled:opacity-50
                "
            />
            <div ref={containerRef} style={{ width: '100%', height: '100vh' }} />
        </div>
    );
}

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