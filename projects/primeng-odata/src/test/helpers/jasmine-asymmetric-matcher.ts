export interface IAsymmetricMatcher {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asymmetricMatch(options: any): boolean;

    jasmineToString(): string;
}
