import {IntentionError} from "../errors.mjs";
import { GroupIntent } from "./GroupIntent.mjs";
import xlsxFile from 'read-excel-file/node/index.commonjs.js'
import { unsubscribe } from "superagent";

export class GroupsFromTableIntent extends GroupIntent {
    getRequiredParams() {
        return [
            "spreadsheet"
        ];
    }

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

            colnames.forEach((name, id) => (obj[name.toLowerCase()] = row[id]));  
            return obj;
        });
    }

    async readCsvData(options) {
        return [];
    }

    async run() {
        const self = this;
        const spreadsheet = this.param.spreadsheet;
        // ensure that the provided groups are part of a grouping
        // const grouping = this.param.grouping;

        let groupdata = [];

        if( spreadsheet.endsWith(".xlsx") ) {
            groupdata = await self.readExcelData();
        }
        else if( spreadsheet.endsWith(".csv") ) {
            const csvoptions = {sep: ","};

            groupdata = await self.readCsvData(csvoptions);
        }
        else {
            throw new IntentionError({
                message: `invalid table provided: ${spreadsheet}`,
                intention: `${this.type}: ${this.name} (${this.id})`
            });
        }

        // now change all groups for the provided names 
        // and leave all other users untouched.

        const group_field = (this.param.group_column || "group").toLowerCase();
        const email_field = (this.param.email_column || "email").toLowerCase();
        const groupnames  = {};
        const usernames  = {};
        const members  = {};

        // Step 0: verify all groupnames exist and create them if missing and assign to grouping.

        await Promise.all(groupdata.map(async (user) => {
            const name = user[group_field];
            let grps = name.split(",");

            await Promise.all(grps.map(async (name) => self.addGroup({ name })));
        }));

        // prepare the groups and users for faster access
        this.groups.forEach(g => {
            groupnames[g.name] = g; 
        });

        this.users.forEach(u => {
            usernames[u.email] = u; 
        });

        this.users.forEach(m => {
            members[m.groupid] = m.userids; 
        });

        // Step 2: figure out to which groups a user is currently assigned to.
        const usergrps = {};
        this.users.forEach((user) => {
            usergrps[user.email] = self.members.filter(m => (m.userids.contains(user.id))).map(m => m.groupid);
        });

        // Step 3: add user to the groups the users is assigned to. This will include the old groups. 
        //         optimize, so assignments are skipped if nothing has changed.
        await Promise.all(groupdata.map(async (user) => {
            const group = user[group_field];
            const email = user[email_field];

            const g = groupnames[group];

            // keep only groups the user is not assigned
            usergrps[user.email] = usergrps[user.email].filter(ug => (ug != g.id));

            // Now add the user
            await self.addGroupMember(g, usernames[email]);
        }));

        // Step 4: remove user from groups that the user is no longer assigned to.
        //         we should be careful here and use only groups that were assigned 
        //         by this intent.
        //         normally, we would use only groups from the same grouping. However,
        //         moodle does not provide this information
        //         if we remove a user from all groups we may remove groups that are
        //         unrelated to this intent. 
        await Promise.all(groupdata.map(async (user) => {
            await Promise.all(usergrps[user.email].map(async (id) => {
                await self.deleteGroupMember({id}, user);
            }));
        }));

        this.output = groupdata;
    }
}
