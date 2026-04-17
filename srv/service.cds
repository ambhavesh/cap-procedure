namespace zleavemgmt.srv.service;

using {zleavemgmt.db.schema as db} from '../db/schema';


service ZLEAVE_MGMT_SRV @(path: '/srv') {
    entity EmployeeSet     as projection on db.Employee;
    entity LeaveBalanceSet as projection on db.LeaveBalance;

    @cds.redirection.target
    entity LeaveRequestSet as
        projection on db.LeaveRequest {
            *,
            case
                when leaveType = 'SL'
                     then 'Sick Leave'
                when leaveType = 'CL'
                     then 'Casual Leave'
                when leaveType = 'PL'
                     then 'Paid Leave'
                else leaveType
            end as leaveTypeDesc : String
        };

    entity PriorityVHSet   as
        select from db.LeaveRequest distinct {
            key priority @(title: 'Priority')
        };

    entity LeaveTypeVHSet  as
        select from db.LeaveRequest distinct {
            key leaveType @(title: 'Leave Type'),
                case
                    when leaveType = 'SL'
                         then 'Sick Leave'
                    when leaveType = 'CL'
                         then 'Casual Leave'
                    when leaveType = 'PL'
                         then 'Paid Leave'
                    else leaveType
                end as leaveTypeDesc @(title: 'Leave Type Desc') : String
        };

    annotate service.ZLEAVE_MGMT_SRV.LeaveRequestSet with {
        priority  @Common: {ValueList: {
            $Type         : 'Common.ValueListType',
            CollectionPath: 'PriorityVHSet',
            Parameters    : [{
                $Type            : 'Common.ValueListParameterInOut',
                LocalDataProperty: priority,
                ValueListProperty: 'priority'
            }]
        }}

        leaveType @Common: {ValueList: {
            $Type         : 'Common.ValueListType',
            CollectionPath: 'LeaveTypeVHSet',
            Parameters    : [
                {
                    $Type            : 'Common.ValueListParameterInOut',
                    LocalDataProperty: leaveType,
                    ValueListProperty: 'leaveType'
                },
                {
                    $Type            : 'Common.ValueListParameterInOut',
                    LocalDataProperty: leaveTypeDesc,
                    ValueListProperty: 'leaveTypeDesc'
                }
            ]
        }}
    };

    function getAllF4Items(email: String)                                           returns {};
    action   approveLeave(leaveRequestId: String, leaveType: String, empId: String) returns Result;
    action   rejectLeave(leaveRequestId: String, leaveType: String, empId: String)  returns Result;
}

type Result {
    status  : String;
    message : String;
}
