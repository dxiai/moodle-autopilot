import {IntentionError} from "../errors.mjs";
import { IntentBase } from "./IntentBase.mjs";

export class ScriptIntent extends IntentBase {
    constructor(data) {
        super(data);
        this.param = data.with;

        if (!(this.param && this.param.script)) {
            throw new IntentionError({
                message: "missing script",
                intention: `${this.type}: ${this.name} (${this.id})`
            });
        }

        this.script = this.param.script;
    }

    async run() {
        await super.run();
        const self = this;
        const op = new Function("output", "context", "api", this.script);

        op.call(op, (n, v) => self.expose(n,v), this.context, this.api);
    }
}
