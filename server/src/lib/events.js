import { EventEmitter } from 'events';

class ERPEventBus extends EventEmitter {
  constructor() {
    super();
    this.name = 'Institutional ERP Event Bus';
  }

  emit(event, data) {
    console.log(`[EVENT] ${event} emitted with payload:`, data);
    super.emit(event, data);
  }
}

const erpEvents = new ERPEventBus();

// Standard Institutional Consumers (Phase 8 Automation)
erpEvents.on('STUDENT_CREATED', async (data) => {
    const { studentId, centerId } = data;
    console.log(`[CONSUMER] Student ${studentId} created at Center ${centerId} - Initializing Ops Queue`);
    
    // Automation: Automatically move to OPS_PENDING if needed, 
    // or just ensure Ops is notified via Socket.io (if implemented)
});

erpEvents.on('OPS_APPROVED', (data) => {
    const { studentId, subDeptId } = data;
    console.log(`[CONSUMER] Ops Approved for Student ${studentId} (Sub-Dept: ${subDeptId}) - Triggering Finance Alert`);
    
    // Future: Generate automated pro-forma invoice or notify Finance
});

erpEvents.on('FINANCE_APPROVED', (data) => {
    const { studentId, paymentId, invoiceNo } = data;
    console.log(`[CONSUMER] Finance Approved for Student ${studentId} (Invoice: ${invoiceNo}) - Finalizing Admission`);
    
    // Admission is already set to ACTIVE in the route, 
    // but this could trigger welcome emails or LMS sync.
});

export default erpEvents;
