type BooleanResolvable = boolean | (() => boolean); // Accepts a boolean or a function returning a boolean

export default class Boolean {
    // Private Properties
    private readonly resolvable: BooleanResolvable;

    // Constructor
    constructor(resolvable: BooleanResolvable) {
        this.resolvable = resolvable;
    }

    // Public Getters
    public get value(): boolean {
        return typeof this.resolvable === 'function' ? this.resolvable() : this.resolvable;
    }

    // Public Methods
    public isTrue(): boolean {
        return this.value === true;
    }

    public isFalse(): boolean {
        return this.value === false;
    }
}