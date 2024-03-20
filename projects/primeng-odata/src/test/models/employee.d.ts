interface EmployeeModel {
    EmployeeID: number;
    FirstName: string;
    LastName: string;
    City: string;
    BirthDate?: Date;
    Boss?: EmployeeModel;
    Orders?: IOrder[];
}
