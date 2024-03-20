interface OdataResponseModel<T> {
    '@odata.context': string;

    '@odata.count'?: number;

    '@odata.nextLink'?: string;

    value: T[];
}
