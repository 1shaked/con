import * as z from "zod";
/*    "element_type": "M_Concrete-Rectangular Beam:400 x 800mm",
    "level_name": "03 - Floor",
    "guids": [
        "2UD3D7uxP8kecbbBCRtz8B",
        "2UD3D7uxP8kecbbBCRtz88",
        "2UD3D7uxP8kecbbBCRtz89",
        "2UD3D7uxP8kecbbBCRtz8M",]*/

export const Server_GUIDS_For_Type_Schema = z.object({
    element_type: z.string(),
    level_name: z.string(),
    guids: z.array(z.string())
});