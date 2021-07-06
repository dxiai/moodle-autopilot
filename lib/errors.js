class MoodleError extends Error {
    constructor(mobject, ...params) {
        super(mobject.message, ...params);
        this.code = mobject.code;
        this.info = mobject.info;
        this.url = mobject.url;
    }
}

class IntentionError extends Error {
    constructor(mobject, ...params) {
        super(mobject.message, ...params);
        if (mobject.intention) {
            
        }
    }
}

module.exports = {
    MoodleError,
    IntentionError
}