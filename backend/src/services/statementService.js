const PDFDocument = require('pdfkit');
const { Transaction } = require('../models');
const { TRANSACTION_TYPE } = require('../utils/constants');

function isCredit(type, tx, accountId) {
  if (type === TRANSACTION_TYPE.DEPOSIT) return true;
  if (type === TRANSACTION_TYPE.TRANSFER) return String(tx.destinationAccount) === String(accountId);
  return false; // WITHDRAWAL, PAYMENT, and outgoing TRANSFER are debits
}

async function getStatementTransactions(account, startDate, endDate) {
  return Transaction.find({
    $or: [{ account: account._id }, { destinationAccount: account._id }],
    timestamp: { $gte: new Date(startDate), $lte: new Date(endDate) },
  }).sort({ timestamp: 1 });
}

async function generateCsv(customer, account, startDate, endDate) {
  const transactions = await getStatementTransactions(account, startDate, endDate);
  const header = ['Date', 'Type', 'Description', 'Debit', 'Credit', 'Balance After', 'Status'];
  const rows = [header.join(',')];

  transactions.forEach((tx) => {
    const credit = isCredit(tx.type, tx, account._id);
    rows.push(
      [
        new Date(tx.timestamp).toISOString(),
        tx.type,
        `"${(tx.description || '').replace(/"/g, '""')}"`,
        credit ? '' : tx.amount.toFixed(2),
        credit ? tx.amount.toFixed(2) : '',
        tx.balanceAfter != null ? tx.balanceAfter.toFixed(2) : '',
        tx.status,
      ].join(',')
    );
  });

  const meta = [
    `Account Statement for ${customer.name}`,
    `Account Number: ${account.accountNumber}`,
    `Period: ${startDate} to ${endDate}`,
    '',
  ].join('\n');

  return `${meta}\n${rows.join('\n')}\n`;
}

function generatePdf(customer, account, startDate, endDate, transactions) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text('CBA Retail Bank - Account Statement', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10);
    doc.text(`Customer: ${customer.name}`);
    doc.text(`Email: ${customer.email}`);
    doc.text(`Account Number: ${account.accountNumber}`);
    doc.text(`Currency: ${account.currency}`);
    doc.text(`Statement Period: ${new Date(startDate).toDateString()} - ${new Date(endDate).toDateString()}`);
    doc.text(`Current Balance: ${account.currency} ${account.balance.toFixed(2)}`);
    doc.moveDown();

    const tableTop = doc.y;
    const colX = { date: 40, type: 130, desc: 210, debit: 350, credit: 420, balance: 490 };
    doc.font('Helvetica-Bold');
    doc.text('Date', colX.date, tableTop);
    doc.text('Type', colX.type, tableTop);
    doc.text('Description', colX.desc, tableTop);
    doc.text('Debit', colX.debit, tableTop);
    doc.text('Credit', colX.credit, tableTop);
    doc.text('Balance', colX.balance, tableTop);
    doc.font('Helvetica');
    doc.moveDown(0.5);
    let y = doc.y;

    if (!transactions.length) {
      doc.text('No transactions in this period.', 40, y);
    }

    transactions.forEach((tx) => {
      if (y > 760) {
        doc.addPage();
        y = 40;
      }
      const credit = isCredit(tx.type, tx, account._id);
      doc.fontSize(8);
      doc.text(new Date(tx.timestamp).toLocaleString('en-IN'), colX.date, y, { width: 85 });
      doc.text(tx.type, colX.type, y, { width: 75 });
      doc.text((tx.description || '-').slice(0, 40), colX.desc, y, { width: 135 });
      doc.text(credit ? '' : tx.amount.toFixed(2), colX.debit, y, { width: 65 });
      doc.text(credit ? tx.amount.toFixed(2) : '', colX.credit, y, { width: 65 });
      doc.text(tx.balanceAfter != null ? tx.balanceAfter.toFixed(2) : '-', colX.balance, y, { width: 65 });
      y += 16;
    });

    doc.end();
  });
}

async function generateStatement(customer, account, startDate, endDate, format) {
  if (format === 'csv') {
    const csv = await generateCsv(customer, account, startDate, endDate);
    return { buffer: Buffer.from(csv, 'utf-8'), contentType: 'text/csv', extension: 'csv' };
  }
  const transactions = await getStatementTransactions(account, startDate, endDate);
  const buffer = await generatePdf(customer, account, startDate, endDate, transactions);
  return { buffer, contentType: 'application/pdf', extension: 'pdf' };
}

module.exports = { generateStatement };
