const roleLabel = {
  Member: 'Member',
  DayPass: 'Day Pass',
  Partner: 'Personnel'
};

async function assignCustomerNumbers(conn, adminId, rfidIds, role) {
  console.log(`\n📋 ===== assignCustomerNumbers =====`);
  console.log(`   Role: ${role}`);
  console.log(`   Admin ID: ${adminId}`);
  console.log(`   RFID IDs: ${JSON.stringify(rfidIds)}`);

  if (!rfidIds || rfidIds.length === 0) {
    console.log('   No RFID IDs provided, skipping.');
    return;
  }

  // Normalize: accept both a raw pool (dbSuperAdmin.promise()) and a real connection.
  // pool.query returns [rows, fields]; connection.query does too — same API.
  // The difference is pool.query() is called directly, conn.query() is also direct.
  // Both work the same way, so we just call conn.query() consistently.
  // The real problem was the destructuring pattern — let's use a safe helper.
  const q = (sql, params) => conn.query(sql, params);

  // Count existing numbered RFIDs for this admin+role, excluding the current batch.
  // Do NOT filter by status — allocated and in_use both count.
  const [countRows] = await q(`
    SELECT COUNT(*) as existingCount
    FROM RegisteredRfid
    WHERE allocated_to_admin = ?
      AND role = ?
      AND customer_number IS NOT NULL
      AND id NOT IN (?)
  `, [adminId, role, rfidIds]);

  const existingCount = countRows[0].existingCount;
  console.log(`   Existing numbered RFIDs (excluding this batch): ${existingCount}`);

  for (let i = 0; i < rfidIds.length; i++) {
    const customerNumber = existingCount + i + 1;
    const display = `${roleLabel[role]} #${customerNumber}`;

    console.log(`   Assigning: ${display} to RegisteredRfid id ${rfidIds[i]}`);

    await q(`
      UPDATE RegisteredRfid
      SET customer_number = ?, customer_number_display = ?
      WHERE id = ?
    `, [customerNumber, display, rfidIds[i]]);

    console.log(`   ✅ Done: id ${rfidIds[i]} => ${display}`);
  }

  console.log(`===== END assignCustomerNumbers =====\n`);
}

module.exports = assignCustomerNumbers;