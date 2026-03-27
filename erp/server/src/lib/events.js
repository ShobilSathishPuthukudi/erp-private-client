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

// Standard Institutional Consumers
erpEvents.on('STUDENT_APPROVED', (data) => {
    // Notify Finance or process automation
    console.log('[CONSUMER] Student Approved - Triggering Finance Alert');
});

erpEvents.on('PAYMENT_VERIFIED', (data) => {
    // Trigger Automated Invoice Generation or Admission Finalization
    console.log('[CONSUMER] Payment Verified - Processing Admission Readiness');
});

erpEvents.on('TASK_OVERDUE', (data) => {
    // Trigger Automatic Escalation
    console.log('[CONSUMER] Task Overdue - Init Escalation Protocol');
});

export default erpEvents;
