import * as z from "zod";

export const IFC_Table_Row_Schema = z.object({
    Element_Type: z.string(),
    Unit: z.string(),
    Project_Total: z.number(),
    Level: z.string().nullable(),
    Quantity: z.number()
});

export type TIFCTableRow = z.infer<typeof IFC_Table_Row_Schema>;