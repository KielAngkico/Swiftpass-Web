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

  for (let i = 0; i < rfidIds.length; i++) {
const [[{ existingCount }]] = await conn.query(`
  SELECT COUNT(*) as existingCount
  FROM RegisteredRfid
  WHERE allocated_to_admin = ?
    AND role = ?
    AND status = 'in_use'
    AND customer_number IS NOT NULL
    AND id != ?
`, [adminId, role, rfidIds[i]]);

    console.log(`   Existing count (excluding id ${rfidIds[i]}): ${existingCount}`);

    const customerNumber = existingCount + 1;
    const display = `${roleLabel[role]} #${customerNumber}`;

    console.log(`   Assigning: ${display} to RegisteredRfid id ${rfidIds[i]}`);

    await conn.query(`
      UPDATE RegisteredRfid
      SET customer_number = ?, customer_number_display = ?
      WHERE id = ?
    `, [customerNumber, display, rfidIds[i]]);

    console.log(`   ✅ Done: id ${rfidIds[i]} => ${display}`);
  }

  console.log(`===== END assignCustomerNumbers =====\n`);
}

module.exports = assignCustomerNumbers;