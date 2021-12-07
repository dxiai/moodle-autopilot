import {IntentionError} from "../errors.mjs";
import { GroupIntent } from "./GroupIntent.mjs";
import xlsxFile from 'read-excel-file'

export class GroupsFromTableIntent extends GroupIntent {

    async run() {
        const groupdata = await xlsxFile('test-examples/excel_grouping.xlsx', { getSheets: true });

        console.log(JSON.stringify(groupdata, null, 4));
    }
}
