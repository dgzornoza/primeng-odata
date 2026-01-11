import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { OdataConfiguration } from './odata-configuration';
import { DeleteOperation, GetOperation, PatchOperation, PostOperation, PutOperation } from './odata-operation';
import { OdataQuery } from './odata-query';
import { OdataUtils } from './odata-utils';

export class OdataService<T> {
    private _entitiesUri: string;

    constructor(private _typeName: string, private _http: HttpClient, private config: OdataConfiguration) {
        this._entitiesUri = config.getEntitiesUri(_typeName);
    }

    public get TypeName(): string {
        return this._typeName;
    }

    public Get(key: string): GetOperation<T> {
        return new GetOperation<T>(this._typeName, this.config, this._http, key);
    }

    public Post<T>(entity: T): PostOperation<T> {
        return new PostOperation<T>(this._typeName, this.config, this._http, entity);
    }

    public Patch<T>(entity: T, key: string): PatchOperation<T> {
        return new PatchOperation<T>(this._typeName, this.config, this._http, key, entity);
    }

    public Put<T>(entity: T, key: string): PutOperation<T> {
        return new PutOperation<T>(this._typeName, this.config, this._http, key, entity);
    }

    public Delete(key: string): DeleteOperation<T> {
        return new DeleteOperation<T>(this._typeName, this.config, this._http, key);
    }

    public CustomAction<T>(key: string, actionName: string, postdata: T): Observable<T> {
        const body = postdata ? JSON.stringify(postdata) : null;
        return this._http.post(`${this.getEntityUri(key)}/${actionName}`, body, this.config.customRequestOptions).pipe(map(resp => resp as T));
    }

    public CustomCollectionAction<T>(actionName: string, postdata: T): Observable<T> {
        const body = postdata ? JSON.stringify(postdata) : null;
        return this._http.post(`${this._entitiesUri}/${actionName}`, body, this.config.customRequestOptions).pipe(map(resp => resp as T));
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public CustomFunction<T>(key: string, functionName: string, parameters?: any): Observable<T> {
        if (parameters) {
            const params: string = OdataUtils.convertObjectToString(parameters);
            functionName = `${functionName}(${params})`;
        } else if (!functionName.endsWith(')') && !functionName.endsWith('()')) {
            functionName = `${functionName}()`;
        }
        return this._http.get(`${this.getEntityUri(key)}/${functionName}`, this.config.defaultRequestOptions).pipe(map(resp => resp as T));
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public CustomCollectionFunction<T>(functionName: string, parameters?: any): Observable<T> {
        if (parameters) {
            const params: string = OdataUtils.convertObjectToString(parameters);
            functionName = `${functionName}(${params})`;
        } else if (!functionName.endsWith(')') && !functionName.endsWith('()')) {
            functionName = `${functionName}()`;
        }
        return this._http.get(`${this._entitiesUri}/${functionName}`, this.config.defaultRequestOptions).pipe(map(resp => resp as T));
    }

    public ItemProperty<T>(key: string, propertyName: string): Observable<T | null> {
        return this._http.get<T>(`${this.getEntityUri(key)}/${propertyName}`, this.config.defaultRequestOptions)
            .pipe(map(r => r.body));
    }

    public Query(): OdataQuery<T> {
        return new OdataQuery<T>(this.TypeName, this.config, this._http);
    }

    protected getEntityUri(key: string): string {
        return this.config.getEntityUri(key, this._typeName);
    }

    protected handleResponse<TResponse>(entity: Observable<HttpResponse<TResponse>>): Observable<TResponse> {
        return entity
            .pipe(
                map(this.extractData),
                catchError((error: unknown, caught: Observable<TResponse>) => {
                    if (this.config.handleError) {
                        this.config.handleError(error, caught);
                    }
                    return throwError(() => error);
                })
            );
    }

    private extractData<TResponse>(res: HttpResponse<TResponse>): TResponse {
        if (res.status < 200 || res.status >= 300) {
            throw new Error('Bad response status: ' + res.status);

        }
        return res.body || {} as TResponse;
    }
}
