import * as z from "zod";
import { IFC_Table_Row_Schema } from "./IFC_Table_Row_Schema";

export const IFC_Table_Schema = z.array(IFC_Table_Row_Schema);

export type TIFCTable = z.infer<typeof IFC_Table_Schema>;