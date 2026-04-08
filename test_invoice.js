import { models } from './server/src/models/index.js';
const { Invoice, Student, Payment } = models;

async function test() {
  try {
    const invoices = await Invoice.findAll({
      include: [
        { model: Student, attributes: ['name', 'uid'], required: false },
        { model: Payment, required: false }
      ],
      offset: 0,
      limit: 1
    });
    console.log("Success:", JSON.stringify(invoices, null, 2));
  } catch (error) {
    console.error("Test Error:", error);
  }
}

test();
