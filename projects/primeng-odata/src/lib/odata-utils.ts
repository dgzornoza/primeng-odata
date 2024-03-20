/* eslint-disable @typescript-eslint/no-explicit-any */
export class OdataUtils {

    public static convertObjectToString(obj: any): string {
        const properties: string[] = [];

        for (const prop in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, prop) && obj[prop] !== undefined) {
                const value: any = OdataUtils.quoteValue(obj[prop]);

                properties.push(`${prop}=${value}`);
            }
        }
        return properties.join(', ');
    }

    public static quoteValue(value: number | string | boolean | any): string {
        // check if GUID (UUID) type
        if (OdataUtils.isString(value) && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
            return value;
        }

        // check if string
        if (OdataUtils.isString(value)) {
            const escaped = value.replace(/'/g, '\'\'');
            return `'${escaped}'`;
        }

        // check if boolean or number
        if (OdataUtils.isBoolean(value) || OdataUtils.isNumber(value)) {
            return `${value}`;
        }

        const parts: string[] = [];
        Object.getOwnPropertyNames(value).forEach((propertyName: string) => {
            const propertyValue: unknown = value[propertyName];
            parts.push(`${propertyName}=${OdataUtils.quoteValue(propertyValue)}`);
        });

        return parts.length > 0 ? parts.join(', ') : `${value}`;
    }

    public static tryParseInt(input?: any): { valid: boolean, value: number } {
        if (input !== null && !isNaN(input)) {
            const parsed: number = parseInt(input, 10);
            return {
                valid: !isNaN(parsed),
                value: parsed
            };
        }

        return {
            valid: false,
            value: NaN
        };
    }

    private static isString(data: unknown): data is string {
        return typeof data === 'string';
    }

    private static isNumber(data: unknown): data is number {
        return typeof data === 'number';
    }

    private static isBoolean(data: unknown): data is boolean {
        return typeof data === 'boolean';
    }
}
