const cron = require('node-cron');
const db = require('../db');

const expireSubscriptionMembers = async () => {
  let connection;
  try {
    console.log('🔄 Checking for expired subscription members...');

    connection = await db.promise().getConnection();
    
    const [dateCheck] = await connection.query('SELECT CURDATE() as db_current_date, NOW() as db_current_datetime');
    console.log('📅 Database current date:', dateCheck[0]);

    const [shouldExpire] = await connection.query(`
      SELECT id, full_name, rfid_tag, subscription_expiry, status, 
             DATEDIFF(CURDATE(), subscription_expiry) as days_overdue
      FROM MembersAccounts
      WHERE system_type = 'subscription'
        AND subscription_expiry < CURDATE()
        AND status = 'active'
    `);
    console.log(`🔍 Found ${shouldExpire.length} member(s) that should be expired:`, shouldExpire);

    if (shouldExpire.length === 0) {
      console.log('✅ No subscription members to expire in MembersAccounts');
      return;
    }

    await connection.beginTransaction();
    
    const query = `
      UPDATE MembersAccounts
      SET status = 'inactive'
      WHERE system_type = 'subscription'
        AND subscription_expiry < CURDATE()
        AND status = 'active'
    `;
    const [result] = await connection.query(query);
    
    await connection.commit();
    
    console.log(`✅ Expired ${result.affectedRows} subscription member(s) in MembersAccounts`);
    console.log(`   Changed Rows: ${result.changedRows}, Info: ${result.info}`);
    
    const [verifyExpired] = await connection.query(`
      SELECT id, full_name, rfid_tag, subscription_expiry, status
      FROM MembersAccounts
      WHERE id IN (${shouldExpire.map(m => m.id).join(',')})
    `);
    console.log('✅ Verification - Updated members status:', verifyExpired);
    
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('❌ Error expiring subscription members:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

const expireDayPassGuests = async () => {
  let connection;
  try {
    console.log('🔄 Checking for expired day pass guests...');

    connection = await db.promise().getConnection();

    const [shouldExpire] = await connection.query(`
      SELECT id, guest_name, rfid_tag, expires_at, status,
             TIMESTAMPDIFF(HOUR, expires_at, NOW()) as hours_overdue
      FROM DayPassGuests
      WHERE expires_at <= NOW()
        AND status = 'active'
    `);
    console.log(`🔍 Found ${shouldExpire.length} guest(s) that should be expired:`, shouldExpire);

    if (shouldExpire.length === 0) {
      console.log('✅ No day pass guests to expire');
      return;
    }

    await connection.beginTransaction();
    
    const query = `
      UPDATE DayPassGuests
      SET status = 'expired'
      WHERE expires_at <= NOW()
        AND status = 'active'
    `;
    const [result] = await connection.query(query);
    
    await connection.commit();
    
    console.log(`✅ Expired ${result.affectedRows} day pass guest(s)`);
    console.log(`   Changed Rows: ${result.changedRows}, Info: ${result.info}`);
    
    const [verifyExpired] = await connection.query(`
      SELECT id, guest_name, rfid_tag, expires_at, status
      FROM DayPassGuests
      WHERE id IN (${shouldExpire.map(g => g.id).join(',')})
    `);
    console.log('✅ Verification - Updated guests status:', verifyExpired);
    
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('❌ Error expiring day pass guests:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

const runExpiryChecks = async () => {
  console.log('\n⏰ ========== RUNNING EXPIRY CHECKS ==========');
  console.log(`📅 Current time: ${new Date().toLocaleString()}`);
  await expireSubscriptionMembers();
  await expireDayPassGuests();
  console.log('⏰ ========== EXPIRY CHECKS COMPLETED ==========\n');
};

// Run immediately on server start (2 seconds delay)
setTimeout(() => {
  console.log('🚀 Running initial expiry check after 2 seconds...');
  runExpiryChecks();
}, 2000);

// Schedule for 11:59 PM daily (ONE check per day)
cron.schedule('59 23 * * *', () => {
  console.log('\n🕐 Daily expiry check at 11:59 PM triggered');
  runExpiryChecks();
});

console.log('✅ Auto-expiry cron job initialized');
console.log('   - Daily check at 11:59 PM');
console.log('   - Initial check 2 seconds after server start');

module.exports = {
  runExpiryChecks,
  expireSubscriptionMembers,
  expireDayPassGuests
};
