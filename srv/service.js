const cds = require("@sap/cds");
const { calculateDaysDifference, formatDate, formatTime } = require('./utils/external');

module.exports = (srv => {

    let { EmployeeSet, LeaveBalanceSet, LeaveRequestSet, PriorityVHSet } = srv.entities;

    srv.before("CREATE", EmployeeSet, async (req) => {
        let db = await cds.connect.to('db');
        let tx = db.tx();
        try {
            const { id } = req.data;
            const totalMonth = 12 - new Date().getMonth();
            const sickLeave = (totalMonth * 0.5);
            const casualLeave = (totalMonth * 0.5);
            const paidLeave = (totalMonth * 1.5);
            const totalCount = (sickLeave + casualLeave + paidLeave);

            await tx.run(
                INSERT.into(LeaveBalanceSet).entries({
                    id: cds.utils.uuid(),
                    sickLeave: sickLeave,
                    casualLeave: casualLeave,
                    paidLeave: paidLeave,
                    total: totalCount,
                    used: 0,
                    remaining: totalCount,
                    employee_id: id,
                })
            );
            await tx.commit();
        } catch (error) {
            console.log(error);
        }
    });

    srv.before("CREATE", LeaveRequestSet, async (req) => {
        let db = await cds.connect.to('db');
        let tx = db.tx();

        try {
            const allowedPriority = ['High', 'Medium', 'Low'];
            if (req.data.priority && !allowedPriority.includes(req.data.priority)) {
                req.error(400, `Invalid priority: ${req.data.priority}`);
            }

            const { id, employee_id, fromDate, toDate, leaveType, isHalfDay } = req.data;

            const leaveBalance = await tx.run(
                SELECT.from(LeaveBalanceSet).where({ employee_id })
            );

            if (!leaveBalance) return req.error(400, 'Leave balance not found for employee');

            const totalDaysOfLeave = isHalfDay ? 0.5 : calculateDaysDifference(fromDate, toDate) + 1;

            let leaveField;

            if (leaveType === 'SL') leaveField = 'sickLeave';
            else if (leaveType === 'CL') leaveField = 'casualLeave';
            else if (leaveType === 'PL') leaveField = 'paidLeave';
            else return req.error(400, 'Invalid leave type');

            if (parseFloat(leaveBalance[leaveField]) < totalDaysOfLeave) {
                return req.error(400, `Insufficient ${leaveType}`);
            }

            req.data.status = 'Pending';
            await tx.update(LeaveBalanceSet, id).with(req.data);
            await tx.commit();

        } catch (err) {
            console.error('Error creating leave request:', err);
            return req.error(500, 'Failed to create leave request');
        }
    });

    srv.on("approveLeave", async (req) => {
        let db = await cds.connect.to('db');
        let tx = db.tx();
        try {
            let { leaveRequestId, leaveType, empId } = req.data;

            const leaveToApprove = await SELECT.from(LeaveRequestSet).where({ id: leaveRequestId, leaveType: leaveType, employee_id: empId });
            if (!leaveToApprove || leaveToApprove.length === 0) return req.error(400, `Leave request not found for leave request id = ${leaveRequestId}`);

            const leaveBalance = await SELECT.from(LeaveBalanceSet).where({ employee_id: empId });

            if (leaveToApprove.length > 0) {
                let totalDaysOfLeave;
                if (leaveToApprove[0].isHalfDay) {
                    totalDaysOfLeave = 0.5;
                } else {
                    totalDaysOfLeave = calculateDaysDifference(leaveToApprove[0].fromDate, leaveToApprove[0].toDate) + 1;
                }

                if (parseFloat(leaveBalance[0].remaining) < totalDaysOfLeave) {
                    return req.error(400, `Insufficient leave, you have total ${leaveBalance[0].remaining} leave`);
                }
                else {
                    if (leaveType === 'SL') {
                        if (leaveBalance[0].sickLeave >= totalDaysOfLeave) {
                            leaveBalance[0].sickLeave = leaveBalance[0].sickLeave - totalDaysOfLeave;
                        }
                    } else if (leaveType === 'CL') {
                        if (leaveBalance[0].casualLeave >= totalDaysOfLeave) {
                            leaveBalance[0].casualLeave = leaveBalance[0].casualLeave - totalDaysOfLeave;
                        }
                    } else if (leaveType === 'PL') {
                        if (leaveBalance[0].paidLeave >= totalDaysOfLeave) {
                            leaveBalance[0].paidLeave = leaveBalance[0].paidLeave - totalDaysOfLeave;
                        }
                    }
                    else return req.error(400, 'Invalid leave type');

                    leaveBalance[0].used =
                        parseFloat(leaveBalance[0].used) + totalDaysOfLeave;

                    leaveBalance[0].remaining =
                        parseFloat(leaveBalance[0].remaining) - totalDaysOfLeave;
                }
            } else {
                return req.error(500, `Leave request for id = '${leaveRequestId}' not found`)
            }
            const updatedStatus = await tx.update(LeaveBalanceSet, leaveBalance[0].id).with(leaveBalance[0]);
            if (updatedStatus === 1) {
                leaveToApprove[0].status = 'Approved';
                await tx.update(LeaveRequestSet, leaveRequestId).with(leaveToApprove[0]);
            }
            await tx.commit();
            let { res } = req.http;
            res.send({
                "status": "SUCCESS",
                "message": `Leave approved for employee id = ${empId}`
            });
        } catch (error) {
            await tx.rollback(error);
        }
    });

    srv.on("rejectLeave", async (req) => {
        let db = await cds.connect.to('db');
        let tx = db.tx();
        try {
            let { leaveRequestId, leaveType, empId } = req.data;
            const leaveToReject = await SELECT.from(LeaveRequestSet).where({ id: leaveRequestId, leaveType: leaveType, employee_id: empId });
            if (!leaveToReject || leaveToReject.length === 0) return req.error(400, `Leave request not found for leave request id = ${leaveRequestId}`);

            leaveToReject[0].status = 'Rejected';
            await await tx.update(LeaveRequestSet, leaveRequestId).with(leaveToReject[0]);
            await tx.commit();
            var oResponse = {
                "status": "SUCCESS",
                "message": `Leave rejected for employee id = ${empId}`
            };
            let { res } = req.http;
            res.send(oResponse);
        } catch (error) {

        }
    });

    // function to call procedure
    srv.on("getAllF4Items", async (req) => {
        try {
            const { email, gender } = req.data;
            const query = `CALL "getF4ByProcedure"(?, ?, ?, ?, ?, ? )`;
            const result = await cds.run(query, [email, gender]);

            const data = {
                "status": "SUCCESS",
                "leaveTypeF4": result.LEAVE_TYPE_F4,
                "priorityF4": result.PRIORITY_F4,
                "loggedInUser": result.LOGGED_IN_USER,
                "employeeAsPerGender": result.EMPLOYEE_AS_PER_GENDER
            };

            return data;
        } catch (error) {
            console.log(error.message);

        }
    });

});