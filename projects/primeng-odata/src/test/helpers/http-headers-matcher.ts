import { HttpHeaders } from '@angular/common/http';
import { IAsymmetricMatcher } from './jasmine-asymmetric-matcher';

export class HttpHeadersMatcher implements IAsymmetricMatcher {

    constructor(private check: { [name: string]: string }) {
    }

    public asymmetricMatch(options: any): boolean {
        const headers: HttpHeaders = options.headers;

        if (options.observe !== 'response') {
            throw new Error();
        }

        Object.keys(this.check)
            .forEach((key: string) => {
                if (headers.get(key) !== this.check[key]) {
                    throw new Error(`The header '${key}' does not have the correct value`);
                }
            });

        return true;
    }

    public jasmineToString(): string {
        return `<HeaderMatching: ${JSON.stringify(this.check)}>`;
    }
}
