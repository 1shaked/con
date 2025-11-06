import { ItemsFinder } from "@thatopen/components";
import type { TQueriesListTableData } from "../types/QueriesListTableData";
import { Table, type TableGroupData as TypeTableGroupData, html as BUIHtml, ref as BUIRef } from "@thatopen/ui";

export function queriesListTemplate(finder: ItemsFinder) {
    const onCreated = (e?: Element) => {
        if (!e) return;
        const table = e as Table<TQueriesListTableData>;

        table.loadFunction = async () => {
            const data: TypeTableGroupData<TQueriesListTableData>[] = [];

            for (const [name] of finder.list) {
                data.push({
                    data: { Name: name, Actions: "" },
                });
            }

            return data;
        };

        table.loadData(true);
    };

    return BUIHtml`
                    <bim-table ${BUIRef(onCreated)}></bim-table>
                `;
};