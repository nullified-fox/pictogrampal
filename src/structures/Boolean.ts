type BooleanResolvable = boolean | (() => boolean); // Accepts a boolean or a function returning a boolean

export default class Boolean {
    private readonly resolvable: BooleanResolvable;

    constructor(resolvable: BooleanResolvable) {
        this.resolvable = resolvable;
    }

    public get value(): boolean {
        return typeof this.resolvable === 'function' ? this.resolvable() : this.resolvable;
    }

    public isTrue(): boolean {
        return this.value === true;
    }

    public isFalse(): boolean {
        return this.value === false;
    }
}