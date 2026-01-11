export interface OdataPagedResponseModel<T> {
    data: T[];
    count: number;
    nextLink: string;
}

export interface OdataResponseModel<T> {
    '@odata.context': string;

    '@odata.count'?: number;

    '@odata.nextLink'?: string;

    value: T[];
}
