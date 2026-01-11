import { HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { OdataUtils } from './odata-utils';
import { OdataPagedResponseModel, OdataResponseModel } from './odata-models';

export class KeyConfigs {
    public filter = '$filter';
    public top = '$top';
    public skip = '$skip';
    public orderBy = '$orderby';
    public select = '$select';
    public search = '$search';
    public expand = '$expand';
    public apply = '$apply';
    public count = '$count';
    public maxPerPage = 'odata.maxpagesize';
}

@Injectable()
export class OdataConfiguration {
    private readonly _postHeaders = new HttpHeaders({ 'Content-Type': 'application/json; charset=utf-8' });
    private _baseUrl = 'http://localhost/odata';

    public keys: KeyConfigs = new KeyConfigs();

    public defaultRequestOptions: {
        headers: HttpHeaders;
        observe: 'response';
        params?: HttpParams;
        reportProgress?: boolean;
        responseType?: 'json';
        withCredentials?: boolean;
    } = { headers: new HttpHeaders(), observe: 'response' };

    public postRequestOptions: {
        headers: HttpHeaders;
        observe: 'response';
        params?: HttpParams;
        reportProgress?: boolean;
        responseType?: 'json';
        withCredentials?: boolean;
    } = { headers: this._postHeaders, observe: 'response' };

    public customRequestOptions: {
        headers: HttpHeaders;
        observe: 'response';
        params?: HttpParams;
        reportProgress?: boolean;
        responseType?: 'json';
        withCredentials?: boolean;
    } = { headers: new HttpHeaders(), observe: 'response' };

    set baseUrl(baseUrl: string) {
        this._baseUrl = baseUrl.replace(/\/+$/, '');
    }

    get baseUrl(): string {
        return this._baseUrl;
    }

    public getEntitiesUri(typeName: string): string {
        if (typeName) {
            return `${this.baseUrl}/${this.sanitizeTypeName(typeName)}`;
        }
        return this.baseUrl;
    }

    public getEntityUri(key: unknown, typeName: string): string {
        return `${this.getEntitiesUri(typeName)}(${OdataUtils.quoteValue(key)})`;
    }

    public handleError(err: unknown, caught: unknown): void {
        console.warn('OData error: ', err, caught);
    }

    public extractQueryResultDataAsNumber(res: HttpResponse<number>): number {
        if (res.status < 200 || res.status >= 300) {
            throw new Error('Bad response status: ' + res.status);
        }

        return (res && res.body) as number;
    }

    public extractQueryResultData<T>(res: HttpResponse<OdataResponseModel<T>>): T[] {
        if (res.status < 200 || res.status >= 300) {
            throw new Error('Bad response status: ' + res.status);
        }

        return (res && res.body && res.body.value) as T[];
    }

    public extractQueryResultDataWithCount<T>(response: HttpResponse<OdataResponseModel<T>>): OdataPagedResponseModel<T> {
        const pagedResult: OdataPagedResponseModel<T> = {
            data: [],
            count: 0,
            nextLink: ''
        };

        if (response.status < 200 || response.status >= 300) {
            throw new Error('Bad response status: ' + response.status);
        }

        const body: OdataResponseModel<T> = response.body as OdataResponseModel<T>;
        const entities: T[] = body.value;

        pagedResult.data = entities;

        const parseResult = OdataUtils.tryParseInt(body['@odata.count']);
        if (parseResult.valid) {
            pagedResult.count = parseResult.value;
        } else {
            console.warn('Cannot determine OData entities count. Falling back to collection length.');
            pagedResult.count = entities.length;
        }

        if (body['@odata.nextLink']) {
            pagedResult.nextLink = body['@odata.nextLink'];
        }

        return pagedResult;
    }

    private sanitizeTypeName(typeName: string): string {
        return typeName.replace(/\/+$/, '').replace(/^\/+/, '');
    }
}
