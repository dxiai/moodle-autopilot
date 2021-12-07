import {IntentionError} from "../errors.mjs";
import { GroupIntent } from "./GroupIntent.mjs";
import xlsxFile from 'read-excel-file/node/index.commonjs.js'

export class GroupsFromTableIntent extends GroupIntent {
    async readExcelData() {
        const spreadsheet = this.param.spreadsheet;
        let tablename     = this.param.table;

        const sheets = await xlsxFile(spreadsheet, { getSheets: true });

        if (tablename && tablename.length) {
            const chkSheet = sheets.filter(s => (s.name === tablename));
            if (chkSheet.length !== 1) {
                throw new IntentionError({
                    message: "Requested worksheetname not found",
                    intention: `${this.type}: ${this.name} (${this.id})`
                });
            }
        }
        else {
            tablename = sheets[0].name;
        }
        
        const groupdata = await xlsxFile(spreadsheet, { sheet: tablename });


        // TODO extra parameters for Column identifiers
        // build internal structure from table names if possible
        const colnames = groupdata.shift();
        
        // console.log(JSON.stringify(colnames, null, 4));
        // console.log(JSON.stringify(groupdata, null, 4));

        const groups = [];
        
        return groupdata.map(row => {
            const obj = {};
            colnames.forEach((name, id) => (obj[name] = row[id]));  
            return obj;
        });
    }

    async readCsvData(options) {
        return [];
    }

    async run() {
        const spreadsheet = this.param.spreadsheet;
        // ensure that the provided groups are part of a grouping
        // const grouping = this.param.grouping;

        // console.log(JSON.stringify(this.groupings, null, 4));
        // console.log(JSON.stringify(this.groups, null, 4));


        let groupdata = [];

        if( spreadsheet.endsWith(".xlsx") ) {
            groupdata = await this.readExcelData();
        }
        else if( spreadsheet.endsWith(".csv") ) {
            const csvoptions = {sep: ","};

            groupdata = await this.readCsvData(csvoptions);
        }
        else {
            throw new IntentionError({
                message: `invalid table provided: ${spreadsheet}`,
                intention: `${this.type}: ${this.name} (${this.id})`
            });
        }

        // now change all groups for the provided names 
        // and leave all other users untouched.
        
        // Step 0: verify all groupnames exist and create them if missing and assign to grouping.
        // Step 1: figure out if a user is mentioned for multiple groups. 
        // Step 2: figure out to which groups a user is currently assigned to. 
        // Step 3: add user to the groups the users is assigned to. This will include the old groups. 
        //         optimize, so assignments are skipped if nothing has changed.
        // Step 4: remove user from groups that the user is no longer assigned to.

        this.output = groupdata;
    }
}
