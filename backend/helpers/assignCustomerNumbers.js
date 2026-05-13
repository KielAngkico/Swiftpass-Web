const roleLabel = {
  Member: 'Member',
  DayPass: 'Day Pass',
  Partner: 'Personnel'
};

async function assignCustomerNumbers(conn, adminId, rfidIds, role) {
  const [[{ existingCount }]] = await conn.query(`
    SELECT COUNT(*) as existingCount
    FROM RegisteredRfid
    WHERE allocated_to_admin = ?
      AND role = ?
      AND status != 'replaced'
      AND id NOT IN (?)
  `, [adminId, role, rfidIds]);

  for (let i = 0; i < rfidIds.length; i++) {
    const customerNumber = existingCount + i + 1;
    const display = `${roleLabel[role]} #${customerNumber}`;
    await conn.query(`
      UPDATE RegisteredRfid
      SET customer_number = ?, customer_number_display = ?
      WHERE id = ?
    `, [customerNumber, display, rfidIds[i]]);
  }
}

module.exports = assignCustomerNumbers;