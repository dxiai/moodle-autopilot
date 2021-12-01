import {IntentionError} from "../errors.mjs";
import { IntentBase } from "./IntentBase.mjs";

export class CourseIntent extends IntentBase {
    constructor(data) {
        super(data);

        if (!(this.param && this.param.name)) {
            throw new IntentionError({
                message: "missing course name",
                intention: `${this.type}: ${this.name} (${this.id})`
            });
        }

        this.coursename = this.param.name;
    }

    getEndpoints() {
        return super.getEndpoints().push(
            "core_course_get_enrolled_courses_by_timeline_classification"
        );
    }

    async run() {
        const classification = this.param.status ? this.param.status : "inprogress";
        const coursename = this.param.name;

        const courses = await this.api.core_course.get.enrolled_courses({classification});

        // console.log(courses);

        const result = courses.courses.filter((course) => course.shortname === coursename || course.fullname === coursename);

        if (!result.length) {
            throw new IntentionError({
                message: "Course not found!",
                intention: `${this.type}: ${this.name} (${this.id})`
            });
        }

        if (result.length > 1) {
            throw new IntentionError({
                message: "Too many courses found!",
                intention: `${this.type}: ${this.name} (${this.id})`
            });
        }

        const course = result.pop();

        delete course.courseimage;

        // provide a simpler notation for following intentions
        // this.expose("course", course);
        this.output = course;
    }
}
