export class EmployeeBuilder {
    private _employee: EmployeeModel;

    constructor() {
        this._employee = {
            EmployeeID: 1,
            FirstName: 'f',
            LastName: 'l',
            City: 'c',
            BirthDate: undefined,
            Orders: undefined,
            Boss: undefined
        };
    }

    public build(): EmployeeModel {
        return this._employee;
    }
}
