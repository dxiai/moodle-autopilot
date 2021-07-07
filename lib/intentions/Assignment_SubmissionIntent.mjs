import {IntentionError} from "../errors.mjs";
import {IntentBase} from "./IntentBase.mjs";
import * as htmlparser from "node-html-parser";

const { parse } = htmlparser.default;

export class Assignment_SubmissionIntent extends IntentBase {
    constructor(data) {
        super(data);
        this.param = data.with;

        if (!(this.param && this.param.name)) {
            throw new IntentionError({
                message: "missing assignment name",
                intention: `${this.type}: ${this.name} (${this.id})`
            });
        }

        this.activityname = this.param.name;
    }

    async run() {
        const cmid = await this.getAssignment();

        this.expose("assignment", cmid);

        const submissions = await this.getSubmissions(cmid);
        // now get the submissions into the environment

        // submissions.forEach(s => console.log(s));
        this.expose("submissions", submissions);
    }

    async getAssignment() {
        const courseid = this.context.course.course.id;
        const activityname = this.activityname;

        const ccontent = await this.api.mod_assign.assignments.get({
            "courseids[0]": courseid
        });

        const result = ccontent.courses
            .map((section)=> section.assignments)
            .flat()
            .filter((activity) => activity.name === activityname);

        if (!result.length) {
            throw new IntentionError({
                message: "Assignment not found!",
                intention: `${this.type}: ${this.name} (${this.id})`
            });
        }

        if (result.length > 1) {
            throw new IntentionError({
                message: "Too many assignments found!",
                intention: `${this.type}: ${this.name} (${this.id})`
            });
        }

        const assignment = result.pop();

        // Moodle's very limited documentation is not precise about which value to use.
        // The docs suggest the cmid field, while the actual api wants the normal id.
        const cmid = assignment.id;

        this.checkNoSubmission(assignment);

        return cmid;
    }

    checkNoSubmission(assignment) {
        const aconfigs = assignment.configs
            .filter((cfg) => cfg.value === "1" &&
                            cfg.subtype === "assignsubmission" &&
                            cfg.name === "enabled")
            .map((cfg) => cfg.plugin);

        if (!aconfigs.length) {
            throw new IntentionError({
                message: "Assignment accepts no submissions!",
                intention: `${this.type}: ${this.name} (${this.id})`
            });
        }
    }

    async getSubmissions(cmid) {
        const subs = await this.api
            .mod_assign
            .submissions
            .get({
                "status": "submitted",
                "assignmentids[0]": cmid
            });

        if (!subs.assignments.length && subs.warnings.length) {
            throw new IntentionError({
                message: "No assignment submissions found!",
                intention: `${this.type}: ${this.name} (${this.id})`
            });
        }

        // concatenate all submissions
        const submissions = subs.assignments
            .map((assignment) => assignment.submissions)
            .flat();

        return submissions
            .map((subm) => {
                subm.data = subm.plugins
                    .map((pl) => {
                        if (pl.fileareas && pl.fileareas.length) {
                            pl.fileareas = pl.fileareas[0];
                            pl.files = [];

                            if (pl.fileareas.files.length) {
                                pl.files = pl.fileareas.files;
                            }

                            delete pl.fileareas;
                        }
                        if (pl.editorfields && pl.editorfields.length) {
                            // flatten the editor fields.
                            const {text, format} = pl.editorfields[0];

                            delete pl.editorfields;

                            pl.text = text;
                            pl.format = format;

                            pl.rawtext = parse(pl.text)
                                .querySelectorAll("h1,h2,h3,h4,h5,p,li")
                                .map((e) => e.textContent.trim())
                                .join("\n\n");
                        }
                        return pl;
                    })
                    .filter((pl) => pl.type !== "comments");

                delete subm.plugins;

                return subm;
            });
    }
}
