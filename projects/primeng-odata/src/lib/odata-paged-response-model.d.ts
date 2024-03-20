interface OdataPagedResponseModel<T> {
    data: T[];
    count: number;
    nextLink: string;
}
