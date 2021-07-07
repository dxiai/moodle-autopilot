export class MoodleError extends Error {
    constructor(mobject, ...params) {
        super(mobject.message, ...params);
        this.code = mobject.code;
        this.info = mobject.info;
        this.url = mobject.url;
    }
}

export class IntentionError extends Error {
    constructor(mobject, ...params) {
        super(mobject.message, ...params);
        if (mobject.intention) {
            this.intention = mobject.intention;
        }
    }
}
