import { HttpClient, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { OdataConfiguration } from './odata-configuration';

export abstract class OdataOperation<T> {
    private _expand: string[] = [];
    private _select: string[] = [];

    constructor(protected typeName: string, protected config: OdataConfiguration, protected http: HttpClient) {
    }

    public Expand(expand: string | string[]) {
        if (expand) {
            this._expand = this.toStringArray(expand);
        }
        return this;
    }

    public Select(select: string | string[]) {
        if (select) {
            this._select = this.toStringArray(select);
        }
        return this;
    }

    protected getParams(): HttpParams {
        const expandData = new Map<string, string[]>();
        const normalSelects: string[] = [];

        this._expand.forEach((name) => expandData.set(name, []));

        this._select.forEach((select: string) => {
            const items: string[] = select.split('/');

            // Expand contains string like: `Boss/Name`
            if (items.length > 1) {
                const expandName = items[0];
                const propertyName = items[1];

                if (!expandData.has(expandName)) {
                    expandData.set(expandName, []);
                }

                expandData.get(expandName)?.push(propertyName);
            }
            else {
                // Expand is just a simple string like: `Boss`
                normalSelects.push(select);
            }
        });

        let params = new HttpParams();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const expands = Array.from(expandData).map((element: any) => {
            if (element.value.any()) {
                return `${element.key}(${this.config.keys.select}=${this.toCommaString(element.value)})`;
            }

            return element.key;
        });

        if (expands.length > 0) {
            params = params.append(this.config.keys.expand, this.toCommaString(expands));
        }

        if (normalSelects.length > 0) {
            params = params.append(this.config.keys.select, this.toCommaString(normalSelects));
        }

        return params;
    }

    protected handleResponse(entity: Observable<HttpResponse<T>>): Observable<T> {
        return entity
            .pipe(
                map(this.extractData),
                catchError((err: unknown, caught: Observable<T>) => {
                    if (this.config.handleError) {
                        this.config.handleError(err, caught);
                    }
                    return throwError(err);
                })
            );
    }

    protected getDefaultRequestOptions(): {
        headers?: HttpHeaders;
        observe: 'response';
        params?: HttpParams;
        reportProgress?: boolean;
        responseType?: 'json';
        withCredentials?: boolean;
    } {
        const options = Object.assign({}, this.config.defaultRequestOptions);
        options.params = this.getParams();

        return options;
    }

    protected getPostRequestOptions(): {
        headers?: HttpHeaders;
        observe: 'response';
        params?: HttpParams;
        reportProgress?: boolean;
        responseType?: 'json';
        withCredentials?: boolean;
    } {
        const options = Object.assign({}, this.config.postRequestOptions);
        options.params = this.getParams();

        return options;
    }

    protected abstract exec(): Observable<unknown>;

    protected abstract getUrl(): string;

    protected GenerateUrl(entitiesUri: string): string {
        const params: HttpParams = this.getParams();
        if (params.keys().length > 0) {
            return `${entitiesUri}?${params}`;
        }

        return entitiesUri;
    }

    protected toStringArray(input: string | string[]): string[] {
        if (!input) {
            return [];
        }

        if (input instanceof String || typeof input === 'string') {
            return input.split(',').map(s => s.trim());
        }

        if (input instanceof Array) {
            return input;
        }

        console.error('Invalid input type');
        return [];
    }

    protected toCommaString(input: string | string[]): string {
        if (input instanceof String || typeof input === 'string') {
            return input as string;
        }

        if (input instanceof Array) {
            return input.join();
        }

        console.error('Invalid input type');
        return '';
    }

    private extractData(res: HttpResponse<T>): T {
        if (res.status < 200 || res.status >= 300) {
            throw new Error('Bad response status: ' + res.status);
        }

        return res.body || {} as T;
    }
}

export abstract class OperationWithKey<T> extends OdataOperation<T> {
    constructor(protected override typeName: string,
        protected override config: OdataConfiguration,
        protected override http: HttpClient,
        protected entityKey: string) {
        super(typeName, config, http);
    }

    protected getEntityUri(): string {
        return this.config.getEntityUri(this.entityKey, this.typeName);
    }

    public getUrl(): string {
        return this.GenerateUrl(this.getEntityUri());
    }
}

export abstract class OperationWithEntity<T> extends OdataOperation<T> {
    constructor(protected override typeName: string,
        protected override config: OdataConfiguration,
        protected override http: HttpClient,
        protected entity: T) {
        super(typeName, config, http);
    }

    protected getEntitiesUri(): string {
        return this.config.getEntitiesUri(this.typeName);
    }

    public getUrl(): string {
        return this.GenerateUrl(this.getEntitiesUri());
    }
}

export abstract class OperationWithKeyAndEntity<T> extends OperationWithKey<T> {
    constructor(protected override typeName: string,
        protected override config: OdataConfiguration,
        protected override http: HttpClient,
        protected override entityKey: string,
        protected entity: T) {
        super(typeName, config, http, entityKey);
    }

    protected override getEntityUri(): string {
        return this.config.getEntityUri(this.entityKey, this.typeName);
    }
}

export class GetOperation<T> extends OperationWithKey<T> {
    public exec(): Observable<T> {
        return super.handleResponse(this.http.get<T>(this.getEntityUri(), this.getDefaultRequestOptions()));
    }
}

export class PostOperation<T> extends OperationWithEntity<T> {
    public exec(): Observable<T> {
        const body = this.entity ? JSON.stringify(this.entity) : null;

        return super.handleResponse(this.http.post<T>(this.getEntitiesUri(), body, this.getPostRequestOptions()));
    }
}

export class PatchOperation<T> extends OperationWithKeyAndEntity<T> {
    public exec(): Observable<T> {
        const body = this.entity ? JSON.stringify(this.entity) : null;

        return super.handleResponse(this.http.patch<T>(this.getEntityUri(), body, this.getPostRequestOptions()));
    }
}

export class PutOperation<T> extends OperationWithKeyAndEntity<T> {
    public exec(): Observable<T> {
        const body = this.entity ? JSON.stringify(this.entity) : null;

        return super.handleResponse(this.http.put<T>(this.getEntityUri(), body, this.getPostRequestOptions()));
    }
}

export class DeleteOperation<T> extends OperationWithKey<T>{
    public exec(): Observable<T> {
        return super.handleResponse(this.http.delete<T>(this.getEntityUri(), this.config.defaultRequestOptions));
    }
}
