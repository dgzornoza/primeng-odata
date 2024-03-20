import { HttpClient, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { OdataReturnType } from '../infrastructure';
import { OdataConfiguration } from './odata-configuration';
import { OdataOperation } from './odata-operation';
import { OdataPagedResponseModel, OdataResponseModel } from './odata-models';

export class OdataQuery<T> extends OdataOperation<T> {

    private _filter: string = '';
    private _top: number = 0;
    private _skip: number = 0;
    private _search: string = '';
    private _orderBy: string[] = [];
    private _apply: string[] = [];
    private _entitiesUri: string;
    private _maxPerPage: number = 0;
    private _customQueryOptions: Record<string, string> = {};

    constructor(typeName: string, config: OdataConfiguration, http: HttpClient) {
        super(typeName, config, http);

        this._entitiesUri = config.getEntitiesUri(this.typeName);
    }

    public filter(filter: string): OdataQuery<T> {
        if (filter) {
            this._filter = filter;
        }
        return this;
    }

    public search(search: string): OdataQuery<T> {
        if (search) {
            this._search = search;
        }
        return this;
    }

    public top(top: number): OdataQuery<T> {
        if (top > 0) {
            this._top = top;
        }
        return this;
    }

    public skip(skip: number): OdataQuery<T> {
        if (skip > 0) {
            this._skip = skip;
        }
        return this;
    }

    public orderBy(orderBy: string | string[]): OdataQuery<T> {
        if (orderBy) {
            this._orderBy = this.toStringArray(orderBy);
        }
        return this;
    }

    public maxPerPage(maxPerPage: number): OdataQuery<T> {
        if (maxPerPage > 0) {
            this._maxPerPage = maxPerPage;
        }
        return this;
    }

    public apply(apply: string | string[]): OdataQuery<T> {
        if (apply) {
            this._apply = this.toStringArray(apply);
        }
        return this;
    }

    public customQueryOptions(customOptions: Record<string, string>): OdataQuery<T> {
        if (customOptions) {
            this._customQueryOptions = customOptions;
        }
        return this;
    }

    public getUrl(returnType?: OdataReturnType): string {
        let url: string = this._entitiesUri;
        if (returnType === OdataReturnType.Count) {
            url = `${url}/${this.config.keys.count}`;
        }

        const params: HttpParams = this.getQueryParams(returnType === OdataReturnType.PagedResult);
        if (params.keys().length > 0) {
            return `${url}?${params}`;
        }

        return url;
    }

    public exec(): Observable<T[]>;
    public exec(returnType: OdataReturnType.Count): Observable<number>;
    public exec(returnType: OdataReturnType.PagedResult): Observable<OdataPagedResponseModel<T>>;
    public exec(returnType?: OdataReturnType): Observable<T[] | OdataPagedResponseModel<T> | number> {
        const requestOptions: {
            headers?: HttpHeaders;
            observe: 'response';
            params?: HttpParams;
            reportProgress?: boolean;
            responseType?: 'json';
            withCredentials?: boolean;
        } = this.getQueryRequestOptions(returnType === OdataReturnType.PagedResult);

        switch (returnType) {
            case OdataReturnType.Count:
                return this.execGetCount(requestOptions);

            case OdataReturnType.PagedResult:
                return this.execGetArrayDataWithCount(this._entitiesUri, requestOptions);

            default:
                return this.execGetArrayData(requestOptions);
        }
    }

    public execWithCount(): Observable<OdataPagedResponseModel<T>> {
        return this.exec(OdataReturnType.PagedResult);
    }

    public nextPage(pagedResult: OdataPagedResponseModel<T>): Observable<OdataPagedResponseModel<T>> {
        const requestOptions: {
            headers?: HttpHeaders;
            observe: 'response';
            params?: HttpParams;
            reportProgress?: boolean;
            responseType?: 'json';
            withCredentials?: boolean;
        } = this.getQueryRequestOptions(false);

        return this.execGetArrayDataWithCount(pagedResult.nextLink, requestOptions);
    }

    private execGetCount(requestOptions: {
        headers?: HttpHeaders;
        observe: 'response';
        params?: HttpParams;
        reportProgress?: boolean;
        responseType?: 'json';
        withCredentials?: boolean;
    }): Observable<number> {
        const countUrl = `${this._entitiesUri}/${this.config.keys.count}`;
        return this.http.get<number>(countUrl, requestOptions)
            .pipe(
                map(res => this.extractDataAsNumber(res, this.config)),
                catchError((err: unknown, caught: Observable<number>) => {
                    if (this.config.handleError) {
                        this.config.handleError(err, caught);
                    }
                    return throwError(err);
                })
            );
    }

    private execGetArrayDataWithCount(url: string, requestOptions: {
        headers?: HttpHeaders;
        observe: 'response';
        params?: HttpParams;
        reportProgress?: boolean;
        responseType?: 'json';
        withCredentials?: boolean;
    }): Observable<OdataPagedResponseModel<T>> {
        return this.http.get<OdataResponseModel<T>>(url, requestOptions)
            .pipe(
                map(res => this.extractArrayDataWithCount(res, this.config)),
                catchError((err: unknown, caught: Observable<OdataPagedResponseModel<T>>) => {
                    if (this.config.handleError) {
                        this.config.handleError(err, caught);
                    }
                    return throwError(err);
                })
            );
    }

    private execGetArrayData(requestOptions: {
        headers?: HttpHeaders;
        observe: 'response';
        params?: HttpParams;
        reportProgress?: boolean;
        responseType?: 'json';
        withCredentials?: boolean;
    }): Observable<T[]> {
        return this.http.get<OdataResponseModel<T>>(this._entitiesUri, requestOptions)
            .pipe(
                map(res => this.extractArrayData(res, this.config)),
                catchError((err: unknown, caught: Observable<Array<T>>) => {
                    if (this.config.handleError) {
                        this.config.handleError(err, caught);
                    }
                    return throwError(err);
                })
            );
    }

    private getQueryRequestOptions(odata4: boolean): {
        headers?: HttpHeaders;
        observe: 'response';
        params?: HttpParams;
        reportProgress?: boolean;
        responseType?: 'json';
        withCredentials?: boolean;
    } {
        const options = Object.assign({}, this.config.defaultRequestOptions);
        options.params = this.getQueryParams(odata4);

        if (this._maxPerPage > 0) {
            if (!options.headers) {
                options.headers = new HttpHeaders();
            }
            options.headers = options.headers.set('Prefer', `${this.config.keys.maxPerPage}=${this._maxPerPage}`);
        }

        return options;
    }

    private getQueryParams(odata4: boolean): HttpParams {
        let params = super.getParams();

        if (this._filter) {
            params = params.append(this.config.keys.filter, this._filter);
        }

        if (this._search) {
            params = params.append(this.config.keys.search, this._search);
        }

        if (this._top > 0) {
            params = params.append(this.config.keys.top, this._top.toString());
        }

        if (this._skip > 0) {
            params = params.append(this.config.keys.skip, this._skip.toString());
        }

        if (this._orderBy.length > 0) {
            params = params.append(this.config.keys.orderBy, this.toCommaString(this._orderBy));
        }

        if (this._apply.length > 0) {
            params = params.append(this.config.keys.apply, this.toCommaString(this._apply));
        }

        if (this._customQueryOptions) {
            for (const [key, value] of Object.entries(this._customQueryOptions)) {
                params = params.append(this.checkReservedCustomQueryOptionKey(key), value);
            }
        }

        // OData v4 only
        if (odata4) {
            params = params.append('$count', 'true');
        }

        return params;
    }

    private extractDataAsNumber(res: HttpResponse<number>, config: OdataConfiguration): number {
        return config.extractQueryResultDataAsNumber(res);
    }

    private extractArrayData(res: HttpResponse<OdataResponseModel<T>>, config: OdataConfiguration): T[] {
        return config.extractQueryResultData(res);
    }

    private extractArrayDataWithCount(res: HttpResponse<OdataResponseModel<T>>, config: OdataConfiguration): OdataPagedResponseModel<T> {
        return config.extractQueryResultDataWithCount(res);
    }

    private checkReservedCustomQueryOptionKey(key: string): string {
        if (key === null || key === undefined) {
            throw new Error('Custom query options MUST NOT be null or undefined.');
        }
        if (key.indexOf('$') === 0 || key.indexOf('@') === 0) {
            throw new Error('Custom query options MUST NOT begin with a $ or @ character.');
        }
        return key;
    }
}
