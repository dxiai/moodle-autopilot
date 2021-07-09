
export class IntentionError extends Error {
    constructor(mobject, ...params) {
        super(mobject.message, ...params);
        if (mobject.intention) {
            this.intention = mobject.intention;
        }
    }
}
