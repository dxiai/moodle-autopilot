import {IntentionError} from "../errors.mjs";
import { IntentBase } from "./IntentBase.mjs";

/**
 * LogIntent adds logging functions to a workflow. 
 * 
 * The intent simply dumps the context of the intent, which is helpful for 
 * debugging the output of another intent. 
 * 
 * This intent is mostly used for developing intents that depend on the output
 * of previous intents in the workflow.
 */
export class GroupIntent extends IntentBase {

    async loadCourseUsers() {
        const courseid = this.context.course.id; 
        const enrolledusers = await this.api.core_enrol.get.enrolled_users({courseid});

        this.users = enrolledusers;
    }

    async loadGroups() {
        const courseid = this.context.course.id; 
        const groups = await this.api.core_group.get.course_groups({courseid});

        this.groups = groups;
    }

    async loadGroupMembers() {
        const courseid = this.context.course.id; 
        const groupsids = {};
        const labelbase = "groupids";

        this.groups.forEach((element, i) => {
            const label = `${labelbase}[${i}]`;
            groupsids[label] = element.id;
        });

        const members = await this.api.core_group.get.group_members(groupsids);

        this.members = members;
    }

    async addGroupMember(group, user) {
        // check if user is already in the selected group

        const res = await this.api.core_group.add_group_members({"userids[0]": user.id});

        console.log(JSON.stringify(res, null, 4));
    }

    async run() {
        await this.loadCourseUsers();
        await this.loadGroups();
        await this.loadGroupMembers();

        // console.log(JSON.stringify(this.users, null, 4));

        const user = this.users.filter(e => (e.email === "glah@zhaw.ch"))[0];

        // console.log(JSON.stringify(user, null, 4));

        const res = await this.api.core_group.add.group_members({
            "members[0][groupid]": this.groups[0].id, 
            "members[0][userid]": user.id
        });

        console.log(JSON.stringify(res, null, 4));

        this.output = this.groups;
    }
}
