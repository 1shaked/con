import {ItemsFinder} from "@thatopen/components";

export async function getFinderFilterResult(name: string, finder: ItemsFinder) {
    const finderQuery = finder.list.get(name);
    if (!finderQuery) return {};
    const result = await finderQuery.test();
    return result;
};