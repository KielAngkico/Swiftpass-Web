const cron = require('node-cron');
const db = require('../db');

const expireSubscriptionMembers = async () => {
  let connection;
  try {

    connection = await db.promise().getConnection();
    
    const [dateCheck] = await connection.query('SELECT CURDATE() as db_current_date, NOW() as db_current_datetime');

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
    
 
    
    const [verifyExpired] = await connection.query(`
      SELECT id, guest_name, rfid_tag, expires_at, status
      FROM DayPassGuests
      WHERE id IN (${shouldExpire.map(g => g.id).join(',')})
    `);
    
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

const expirePartnerSubscriptions = async () => {
  let connection;
  try {
    connection = await db.promise().getConnection();

    const [shouldExpire] = await connection.query(`
      SELECT id, admin_name, gym_name, subscription_end_date, is_archived
      FROM AdminAccounts
      WHERE subscription_end_date IS NOT NULL
        AND subscription_end_date < CURDATE()
        AND is_archived = 0
    `);
    console.log(`🔍 Found ${shouldExpire.length} partner(s) with expired subscriptions:`, shouldExpire);

    if (shouldExpire.length === 0) {
      return;
    }

    await connection.beginTransaction();
    
    const query = `
      UPDATE AdminAccounts
      SET is_archived = 1
      WHERE subscription_end_date < CURDATE()
        AND is_archived = 0
    `;
    const [result] = await connection.query(query);
    
    await connection.commit();
    
    const [verifyExpired] = await connection.query(`
      SELECT id, admin_name, gym_name, subscription_end_date, is_archived
      FROM AdminAccounts
      WHERE id IN (${shouldExpire.map(p => p.id).join(',')})
    `);
    console.log('✅ Verification - Archived partner accounts:', verifyExpired);
    
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('❌ Error expiring partner subscriptions:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

const runExpiryChecks = async () => {
  await expireSubscriptionMembers();
  await expireDayPassGuests();
  await expirePartnerSubscriptions();
};

// Run immediately on server start (2 seconds delay)
setTimeout(() => {
  runExpiryChecks();
}, 2000);

// Schedule for 11:59 PM daily (ONE check per day)
cron.schedule('59 23 * * *', () => {
  runExpiryChecks();
});

module.exports = {
  runExpiryChecks,
  expireSubscriptionMembers,
  expireDayPassGuests,
  expirePartnerSubscriptions
};