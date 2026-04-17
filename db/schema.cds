namespace zleavemgmt.db.schema;

using {managed} from '@sap/cds/common';


entity Employee : managed {
    key id         : UUID;
        firstName  : String;
        lastName   : String;
        email      : String;
        gender     : String;
        experience : String;
        contact    : Integer64;
};

entity LeaveBalance {
    key id          : UUID;
        sickLeave   : Decimal(4, 2);
        casualLeave : Decimal(4, 2);
        paidLeave   : Decimal(4, 2);
        total       : Decimal(5, 2);
        used        : Decimal(5, 2);
        remaining   : Decimal(5, 2);
        employee    : Association to one Employee;
};

entity LeaveRequest {
    key id        : UUID;
        fromDate  : Date;
        toDate    : Date;
        reason    : String;
        status    : String;
        priority  : String enum {
            High;
            Medium;
            Low
        };
        leaveType : String;
        isHalfDay : Boolean;
        employee  : Association to one Employee;
};
