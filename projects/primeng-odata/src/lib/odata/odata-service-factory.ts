import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { OdataConfiguration } from './odata-configuration';
import { OdataService } from './odata-service';

@Injectable()
export class OdataServiceFactory {

    constructor(private http: HttpClient, private config: OdataConfiguration) {
    }

    public CreateService<T>(typeName: string, config?: OdataConfiguration): OdataService<T> {
        return new OdataService<T>(typeName, this.http, config ? config : this.config);
    }
}
