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

    async loadGroupings() {
        const courseid = this.context.course.id;
        const groups = await this.api.core_group.get.course_groupings({courseid});

        this.groupings = groups || [];
    }

    /**
     * adds a single user to a group
     * 
     * @param group - a group object as stored in this.groups
     * @param user  - a user object as stored in this.users
     * 
     * This is a lowlevel function, which does not check for a user or group.
     * This has to be done upfront. 
     * 
     * This function generates no output and always succeeds. If the user was not in the group
     * it will be added to it, otherwise the present state remains.
     */
    async addGroupMember(group, user) {
        const res = await this.api.core_group.add.group_members({
            "members[0][groupid]": group.id, 
            "members[0][userid]": user.id
        });
    }

    /**
     * removes a single user from a group 
     * 
     * @param group - a group object as stored in this.groups
     * @param user  - a user object as stored in this.users
     * 
     * This is a lowlevel function, which does not check for a user or group.
     * This has to be done upfront.
     * 
     * This function generates no output and always succeeds. If the user was in the group
     * it will be removed, otherwise the present state remains.
     */
    async deleteGroupMember(group, user) {
        const res = await this.api.core_group.delete.group_members({
            "members[0][groupid]": group.id, 
            "members[0][userid]": user.id
        });
    }

    /**
     * adds a single group to the current moodle course
     * 
     * @param group - a group object
     * 
     * The group object can have the following parameters: 
     * - name (required)  for the name of the group
     * - description (optional) for the description of the group
     * - format (optional) for the description format (defaults to 1 == HTML)
     * - grouping (optional/unused) grouping id for assigning the new group to a grouping
     * 
     * This function will 
     */
    async addGroup(group) {
        const courseid = this.context.course.id;

        // verify that that the group does not exist
        const testGroups = this.groups.filter(g => (g.name === group.name));

        if (testGroups.length) {
            throw new IntentionError({
                message: "group already exists",
                intention: `${this.type}: ${this.name} (${this.id})`
            });
        }

        // create a new group
        await this.api.core_group.create.groups({
            "groups[0][courseid]": courseid,
            "groups[0][name]": group.name,
            "groups[0][description]": group.description || "",
            "groups[0][descriptionformat]": group.format || 1,
        });

        // reload groups
        await this.loadGroups();
    }

    async addGrouping(grouping) {
        // TODO: this function should follow the same logic as addGroup()
    }
    async assingGrouping(grouping, group) {
        // TODO: this function should follow the same logic as addGroupMemeber() only with
        // TODO: core_group_assign_grouping API
    }

    async run() {
        await this.loadCourseUsers();
        await this.loadGroups();
        await this.loadGroupMembers();
        await this.loadGroupings();

        // console.log(JSON.stringify(this.users, null, 4));

        // const user = this.users.filter(e => (e.email === "glah@zhaw.ch"))[0];

        // await this.addGroup({name: "test 5"});

        this.output = this.groups;
    }
}
