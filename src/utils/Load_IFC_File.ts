import {IfcLoader} from "@thatopen/components";

export async function loadIFCFile(file: File, ifcLoader: IfcLoader, name: string = "IFCModel") {
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