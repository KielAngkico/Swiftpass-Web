const roleLabel = {
  Member: 'Member',
  DayPass: 'Day Pass',
  Partner: 'Personnel'
};

async function assignCustomerNumbers(conn, adminId, rfidIds, role) {
  for (let i = 0; i < rfidIds.length; i++) {
    const [[{ existingCount }]] = await conn.query(`
      SELECT COUNT(*) as existingCount
      FROM RegisteredRfid
      WHERE allocated_to_admin = ?
        AND role = ?
        AND status != 'replaced'
        AND id != ?
        AND customer_number IS NOT NULL
    `, [adminId, role, rfidIds[i]]);

    const customerNumber = existingCount + 1;
    const display = `${roleLabel[role]} #${customerNumber}`;

    await conn.query(`
      UPDATE RegisteredRfid
      SET customer_number = ?, customer_number_display = ?
      WHERE id = ?
    `, [customerNumber, display, rfidIds[i]]);
  }
}

module.exports = assignCustomerNumbers;