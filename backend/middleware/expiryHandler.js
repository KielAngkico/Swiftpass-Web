const cron = require('node-cron');
const db = require('../db');

const expireSubscriptionMembers = async () => {
  try {
    console.log('🔄 Checking for expired subscription members...');
    
    const query = `
      UPDATE membersaccounts 
      SET status = 'inactive'
      WHERE system_type = 'subscription'
        AND subscription_expiry < CURDATE()
        AND status = 'active'
    `;
    
    const [result] = await db.promise().query(query);
    
    if (result.affectedRows > 0) {
      console.log(`✅ Expired ${result.affectedRows} subscription member(s)`);
      
      const [expired] = await db.promise().query(`
        SELECT id, full_name, rfid_tag, subscription_expiry 
        FROM membersaccounts 
        WHERE status = 'inactive' 
          AND subscription_expiry < CURDATE()
          AND system_type = 'subscription'
        ORDER BY subscription_expiry DESC 
        LIMIT 10
      `);
      
      console.log('Recently expired members:', expired);
    } else {
      console.log('✅ No subscription members to expire');
    }
    
  } catch (error) {
    console.error('❌ Error expiring subscription members:', error);
  }
};

const expireDayPassGuests = async () => {
  try {
    console.log('🔄 Checking for expired day pass guests...');
    
    const query = `
      UPDATE daypassguests 
      SET status = 'expired'
      WHERE expires_at <= NOW()
        AND status = 'active'
    `;
    
    const [result] = await db.promise().query(query);
    
    if (result.affectedRows > 0) {
      console.log(`✅ Expired ${result.affectedRows} day pass guest(s)`);
      
      const [expired] = await db.promise().query(`
        SELECT id, guest_name, rfid_tag, expires_at 
        FROM daypassguests 
        WHERE status = 'expired' 
          AND expires_at <= NOW()
        ORDER BY expires_at DESC 
        LIMIT 10
      `);
      
      console.log('Recently expired guests:', expired);
    } else {
      console.log('✅ No day pass guests to expire');
    }
    
  } catch (error) {
    console.error('❌ Error expiring day pass guests:', error);
  }
};

const runExpiryChecks = async () => {
  console.log('\n⏰ ========== RUNNING EXPIRY CHECKS ==========');
  console.log(`📅 Current time: ${new Date().toLocaleString()}`);
  
  await expireSubscriptionMembers();
  await expireDayPassGuests();
  
  console.log('⏰ ========== EXPIRY CHECKS COMPLETED ==========\n');
};

cron.schedule('59 23 * * *', () => {
  console.log('\n🕐 Scheduled check at 11:59 PM triggered');
  runExpiryChecks();
});

cron.schedule('0 0 * * *', () => {
  console.log('\n🕐 Scheduled check at 12:00 AM triggered');
  runExpiryChecks();
});

cron.schedule('0 * * * *', () => {
  console.log('\n🕐 Hourly expiry check triggered');
  runExpiryChecks();
});

console.log('✅ Auto-expiry cron jobs initialized');
console.log('   - Daily checks at 11:59 PM and 12:00 AM');
console.log('   - Hourly safety checks');

module.exports = { 
  runExpiryChecks,
  expireSubscriptionMembers,
  expireDayPassGuests
};
