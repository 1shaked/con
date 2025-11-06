import * as z from "zod";
import { IFC_Table_Schema } from "./IFC_Table_Schema";

export const Server_File_Info_Schema = z.object({
    file: z.string(),
    data: IFC_Table_Schema
});

export type TServerFileInfo = z.infer<typeof Server_File_Info_Schema>;