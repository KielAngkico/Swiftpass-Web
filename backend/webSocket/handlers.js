

  async function handleStaffScan(rfid_tag, location, admin_id, allocation, helpers) {
    const { isRfidRegistered, getStaffByRfid, getAdminByRfid, getMemberByRfid, broadcastToClients, dbSuperAdmin } = helpers;

    // Check if RFID is registered in RegisteredRfid
    const isRegistered = await isRfidRegistered(rfid_tag);
    if (!isRegistered) {
      broadcastToClients({
        type: "staff-scan",
        data: {
          rfid_tag,
          status: "unregistered",
          reason: "RFID not registered with SwiftPass company",
          location,
          admin_id,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // Validate allocation
    if (!allocation || !allocation.isValid) {
      broadcastToClients({
        type: "staff-scan",
        data: {
          rfid_tag,
          status: "unregistered",
          reason: allocation ? allocation.reason : "RFID allocation not found",
          location,
          admin_id,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // Check allocation matches the admin
    if (allocation.allocated_to_admin !== admin_id) {
      broadcastToClients({
        type: "staff-scan",
        data: {
          rfid_tag,
          status: "unregistered",
          reason: `This ${allocation.role} RFID is allocated to a different gym`,
          location,
          admin_id,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // ✅ NEW: Check if DayPass RFID is already registered in DayPassGuests
if (allocation.role === 'DayPass') {
  console.log("🔍 Checking if Day Pass guest exists...");
  
  const [dayPassRows] = await dbSuperAdmin.promise().query(
    `SELECT id, guest_name, gender, profile_image_url, rfid_tag, expires_at, status, system_type, staff_name, paid_amount
    FROM DayPassGuests 
    WHERE rfid_tag = ? AND admin_id = ? AND status IN ('active', 'expired')
    LIMIT 1`,
    [rfid_tag, admin_id]
  );
      if (dayPassRows.length > 0) {
        const guest = dayPassRows[0];
        console.log(`✅ Day Pass guest found: ${guest.guest_name}`);
        
        // Route to DayPassRenewal
        broadcastToClients({
          type: "staff-scan",
          data: {
            rfid_tag,
            status: "daypass_renewal",
            full_name: guest.guest_name,
            guest_data: guest,
            rfid_type: allocation.rfid_type,
            role: allocation.role,
            location,
            admin_id,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }
      
      console.log("⚠️ Day Pass RFID not assigned yet - route to new registration");
      // Will continue to the "All checks passed" section below
    }

    // Check for duplicates in StaffAccounts
    const staffMember = await getStaffByRfid(rfid_tag, admin_id);
    if (staffMember) {
      broadcastToClients({
        type: "staff-scan",
        data: {
          rfid_tag,
          status: "unregistered",
          reason: `Duplicate RFID - already assigned to ${staffMember.staff_name}`,
          location,
          admin_id,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // Check for duplicates in AdminAccounts
    const adminMember = await getAdminByRfid(rfid_tag);
    if (adminMember) {
      broadcastToClients({
        type: "staff-scan",
        data: {
          rfid_tag,
          status: "unregistered",
          reason: `Duplicate RFID - already assigned to Admin ${adminMember.admin_name}`,
          location,
          admin_id,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // Check for duplicates in MembersAccounts
    const memberCheck = await getMemberByRfid(rfid_tag, admin_id);
    if (memberCheck) {
      broadcastToClients({
        type: "staff-scan",
        data: {
          rfid_tag,
          status: "member_found",
          full_name: memberCheck.full_name,
          location,
          admin_id,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // All checks passed - RFID is ready for registration
    broadcastToClients({
      type: "staff-scan",
      data: {
        rfid_tag,
        status: "unregistered",
        reason: "Ready for new member registration",
        rfid_type: allocation.rfid_type,
        role: allocation.role,
        location,
        admin_id,
        timestamp: new Date().toISOString()
      }
    });
  }

  // ============= ENTRY/EXIT HANDLER =============
  async function handleEntryExit(rfid_tag, location, admin_id, allocation, helpers) {
    const { 
      isRfidRegistered, 
      getStaffByRfid, 
      getAdminByRfid, 
      logStaffActivity, 
      broadcastToClients,
      handleDayPassGuest,
      handleMember,
      dbSuperAdmin
    } = helpers;

    console.log(`\n🎯 ===== HANDLE ENTRY/EXIT =====`);
    console.log(`   RFID: ${rfid_tag}`);
    console.log(`   Location: ${location}`);
    console.log(`   Target Admin ID: ${admin_id}`);

    // ✅ admin_id parameter is already from allocation.allocated_to_admin
    const target_admin_id = admin_id;

    // Check for staff member using allocation's admin_id
    console.log(`🔍 Checking StaffAccounts for admin ${target_admin_id}...`);
    const staffMember = await getStaffByRfid(rfid_tag, target_admin_id);
    if (staffMember) {
      console.log(`✅ Staff Found: ${staffMember.staff_name}`);
      await logStaffActivity(rfid_tag, staffMember, location, location.toUpperCase());

      broadcastToClients({
        type: "member-update",
        data: {
          rfid_tag,
          full_name: staffMember.staff_name,
          status: "staff_granted",
          reason: "Staff access - door open",
          location,
          admin_id: staffMember.admin_id,
          timestamp: new Date().toISOString()
        }
      });
      console.log(`===== END HANDLE ENTRY/EXIT =====\n`);
      return;
    }

    // Check for admin member
    console.log(`🔍 Checking AdminAccounts...`);
    const adminMember = await getAdminByRfid(rfid_tag);
    if (adminMember) {
      console.log(`✅ Admin Found: ${adminMember.admin_name}`);
      broadcastToClients({
        type: "member-update",
        data: {
          rfid_tag,
          full_name: adminMember.admin_name,
          status: "admin_granted",
          reason: "Admin access - door open",
          location,
          admin_id: target_admin_id,
          timestamp: new Date().toISOString()
        }
      });
      console.log(`===== END HANDLE ENTRY/EXIT =====\n`);
      return;
    }

    // Check for member - only if RFID role is Member
    if (allocation.role === 'Member') {
      console.log(`🔍 Checking MembersAccounts for admin ${target_admin_id}...`);
      const [memberRows] = await dbSuperAdmin.promise().query(
        `SELECT id, full_name, profile_image_url, system_type, current_balance, subscription_expiry, admin_id, status
        FROM MembersAccounts
        WHERE rfid_tag = ? AND admin_id = ?
        LIMIT 1`,
        [rfid_tag, target_admin_id]
      );

      if (memberRows.length > 0) {
        const member = memberRows[0];
        console.log(`✅ Member Found: ${member.full_name} (Status: ${member.status})`);
        
        if (member.status === 'inactive') {
          console.log(`❌ Member is inactive`);
          broadcastToClients({
            type: "member-update",
            data: {
              rfid_tag,
              full_name: member.full_name,
              profile_image_url: member.profile_image_url,
              status: "denied",
              reason: "Member account is inactive",
              location,
              admin_id: member.admin_id,
              timestamp: new Date().toISOString()
            }
          });
          console.log(`===== END HANDLE ENTRY/EXIT =====\n`);
          return;
        }

        console.log(`📞 Calling handleMember...`);
        await handleMember(member, rfid_tag, location);
        console.log(`===== END HANDLE ENTRY/EXIT =====\n`);
        return;
      } else {
        console.log(`⚠️ No member found with this RFID for admin ${target_admin_id}`);
      }
    }

    // Check for DayPass guest - only if RFID role is DayPass
    if (allocation.role === 'DayPass') {
      console.log(`🔍 Checking DayPassGuests for admin ${target_admin_id}...`);
      await handleDayPassGuest(rfid_tag, location, target_admin_id);
      console.log(`===== END HANDLE ENTRY/EXIT =====\n`);
      return;
    }

    // RFID is allocated but not assigned to anyone yet
    console.log(`⚠️ RFID allocated but not assigned to any member/staff`);
    broadcastToClients({
      type: "member-update",
      data: {
        rfid_tag,
        visitor_type: allocation.role,
        status: "unregistered",
        reason: `${allocation.role} RFID not assigned to anyone yet`,
        location,
        admin_id: target_admin_id,
        timestamp: new Date().toISOString()
      }
    });
    console.log(`===== END HANDLE ENTRY/EXIT =====\n`);
  }

  // ============= DAY PASS GUEST HANDLER =============

  async function handleDayPassGuest(rfid_tag, location, admin_id) {
    const dbSuperAdmin = require("../db");
    const { broadcastToClients } = require("./websocket");

    try {
      const [guestRows] = await dbSuperAdmin.promise().query(
        `SELECT id, guest_name, gender, rfid_tag, system_type, expires_at, staff_name, paid_amount, admin_id, status
        FROM DayPassGuests
        WHERE rfid_tag = ? AND status = 'active' AND admin_id = ?
        LIMIT 1`,
        [rfid_tag, admin_id]
      );

      if (guestRows.length === 0) {
        broadcastToClients({
          type: "member-update",
          data: {
            rfid_tag,
            visitor_type: "Day Pass",
            status: "unregistered",
            reason: "Day Pass not registered yet",
            location,
            entry_time: null,
            exit_time: null,
            profile_image_url: null,
            admin_id,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const guest = guestRows[0];
      const now = new Date();

      if (guest.expires_at && new Date(guest.expires_at) < now) {
        broadcastToClients({
          type: "member-update",
          data: {
            rfid_tag,
            full_name: guest.guest_name,
            profile_image_url: null,
            visitor_type: "Day Pass",
            system_type: guest.system_type,
            status: "denied",
            reason: "Day pass expired",
            location,
            entry_time: null,
            exit_time: null,
            admin_id: guest.admin_id,
            timestamp: now.toISOString()
          }
        });
        return;
      }

      if (["ENTRY", "EXIT"].includes(location.toUpperCase())) {
        const isEntry = location.toUpperCase() === "ENTRY";

        const [lastLogRows] = await dbSuperAdmin.promise().query(
          `SELECT id, member_status, entry_time
          FROM AdminEntryLogs
          WHERE rfid_tag = ?
          ORDER BY id DESC LIMIT 1`,
          [rfid_tag]
        );

        const lastLog = lastLogRows[0] || {};
        const isCurrentlyInside = lastLogRows.length && lastLog.member_status === "inside";
        let accessGranted = false;
        let reason = "";

        if (isEntry && isCurrentlyInside) reason = "Already inside";
        else if (!isEntry && !isCurrentlyInside) reason = "Already outside";
        else accessGranted = true;

        const memberStatus = accessGranted ? (isEntry ? "inside" : "outside") : "denied";
        const entryTime = accessGranted && isEntry ? new Date() : lastLog.entry_time || null;
        const exitTime = accessGranted && !isEntry ? new Date() : null;

        if (accessGranted) {
          if (isEntry) {
            await dbSuperAdmin.promise().query(
              `INSERT INTO AdminEntryLogs
              (rfid_tag, full_name, admin_id, staff_name, visitor_type, system_type, deducted_amount, member_status, entry_time, location)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [rfid_tag, guest.guest_name, guest.admin_id, guest.staff_name, "Day Pass", guest.system_type, guest.paid_amount, memberStatus, entryTime, location]
            );
          } else {
            await dbSuperAdmin.promise().query(
              `UPDATE AdminEntryLogs
              SET member_status = ?, exit_time = ?, location = ?
              WHERE rfid_tag = ? AND member_status = 'inside'
              ORDER BY id DESC LIMIT 1`,
              [memberStatus, exitTime, location, rfid_tag]
            );
          }
        }

        broadcastToClients({
          type: "member-update",
          data: {
            rfid_tag,
            full_name: guest.guest_name,
            profile_image_url: null,
            visitor_type: "Day Pass",
            system_type: guest.system_type,
            status: memberStatus,
            reason,
            entry_time: entryTime ? new Date(entryTime).toISOString() : null,
            exit_time: exitTime ? exitTime.toISOString() : null,
            location,
            admin_id: guest.admin_id,
            timestamp: now.toISOString()
          }
        });
      }

    } catch (error) {
      console.error(`❌ Guest error: ${error.message}`);
      broadcastToClients({
        type: "member-update",
        data: {
          rfid_tag,
          visitor_type: "Day Pass",
          status: "error",
          profile_image_url: null,
          location,
          admin_id,
          timestamp: new Date().toISOString(),
          error_message: error.message
        }
      });
    }
  }

  // ============= MEMBER HANDLER =============

  async function handleMember(member, rfid_tag, location) {
    const dbSuperAdmin = require("../db");
    const { broadcastToClients } = require("./websocket");

    try {
      const [adminRows] = await dbSuperAdmin.promise().query(
        `SELECT id, admin_name, system_type FROM AdminAccounts WHERE id = ? LIMIT 1`,
        [member.admin_id]
      );
      
      if (adminRows.length === 0) {
        console.error("❌ Admin not found for member:", member.admin_id);
        return;
      }
      
      const admin = adminRows[0];

      const [staffRows] = await dbSuperAdmin.promise().query(
        `SELECT staff_name FROM StaffSessionLogs
        WHERE admin_id = ? AND status = 'online'
        ORDER BY login_time DESC LIMIT 1`,
        [admin.id]
      );
      const staff_name = staffRows.length ? staffRows[0].staff_name : null;

      const isEntry = location.toUpperCase() === "ENTRY";
      
      const [lastLogRows] = await dbSuperAdmin.promise().query(
        `SELECT * FROM AdminEntryLogs
        WHERE rfid_tag = ? AND admin_id = ?
        ORDER BY id DESC LIMIT 1`,
        [rfid_tag, member.admin_id]
      );
      const lastLog = lastLogRows[0];
      
      const isCurrentlyInside = lastLog && lastLog.member_status === 'inside';

      let accessGranted = false;
      let reason = "";
      let deductedAmount = null;
      let remainingBalance = member.current_balance ?? 0;
      let logId = null;

      if (isEntry) {
        if (isCurrentlyInside) {
          reason = "Already inside";
          accessGranted = false;
        } else if (admin.system_type === "prepaid_entry") {
          const [pricingRows] = await dbSuperAdmin.promise().query(
            `SELECT amount_to_pay FROM AdminPricingOptions
            WHERE admin_id = ? AND plan_name = 'Daily Session' AND is_active = 1
            LIMIT 1`,
            [admin.id]
          );

          if (pricingRows.length === 0) {
            reason = "Daily Session price not configured";
            accessGranted = false;
          } else {
            const price = parseFloat(pricingRows[0].amount_to_pay);
            console.log(`💰 Daily Session Price: ₱${price}`);

            let isGracePeriod = false;
            if (lastLog && lastLog.exit_time) {
              const exitTime = new Date(lastLog.exit_time);
              const now = new Date();
              const timeDiff = (now - exitTime) / 1000;

              if (timeDiff <= 60) {
                isGracePeriod = true;
                console.log(`⏱️ Grace period active - ${timeDiff.toFixed(1)}s since last exit`);
              }
            }

            if (!isGracePeriod && remainingBalance < price) {
              reason = "Insufficient balance";
              accessGranted = false;
              console.log(`❌ Insufficient balance: ₱${remainingBalance} < ₱${price}`);
            } else {
              accessGranted = true;
              
              if (isGracePeriod) {
                deductedAmount = 0;
                reason = "Grace period - no charge";
              } else {
                deductedAmount = price;
                remainingBalance -= price;

                await dbSuperAdmin.promise().query(
                  `UPDATE MembersAccounts SET current_balance = ? WHERE id = ?`,
                  [remainingBalance, member.id]
                );
                console.log(`💾 Balance updated in database`);

                try {
                  const [transResult] = await dbSuperAdmin.promise().query(
                    `INSERT INTO AdminMembersTransactions
                    (member_id, admin_id, transaction_type, amount, payment_method, staff_name, description, transaction_date)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                      member.id,
                      member.admin_id,
                      'session_deduction',
                      -deductedAmount,
                      'balance',
                      staff_name || 'System',
                      'Session Fee',
                      new Date()
                    ]
                  );
                  console.log(`💾 Transaction logged with ID: ${transResult.insertId} (Session Fee: -₱${deductedAmount})`);
                } catch (transError) {
                  console.error("❌ Transaction logging failed:", transError.message);
                }
              }

              try {
                const [logResult] = await dbSuperAdmin.promise().query(
                  `INSERT INTO AdminEntryLogs
                  (rfid_tag, full_name, admin_id, staff_name, visitor_type, system_type, deducted_amount, member_status, entry_time, location)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    rfid_tag, 
                    member.full_name, 
                    member.admin_id, 
                    isGracePeriod ? "Entry Grace Period" : staff_name, 
                    "Member", 
                    admin.system_type, 
                    deductedAmount,
                    "inside", 
                    new Date(), 
                    location
                  ]
                );
                logId = logResult.insertId;
                console.log(`💾 Entry log created with ID: ${logId}${isGracePeriod ? ' (Grace Period)' : ''}`);
              } catch (logError) {
                console.error("❌ Entry log creation failed:", logError.message);
              }
            }
          }
        } else {
          accessGranted = true;
          try {
            const [logResult] = await dbSuperAdmin.promise().query(
              `INSERT INTO AdminEntryLogs
              (rfid_tag, full_name, admin_id, staff_name, visitor_type, system_type, member_status, entry_time, location)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [rfid_tag, member.full_name, member.admin_id, staff_name, "Member", admin.system_type, "inside", new Date(), location]
            );
            logId = logResult.insertId;
            console.log(`💾 Subscription entry logged with ID: ${logId}`);
          } catch (logError) {
            console.error("❌ Subscription entry log failed:", logError.message);
          }
        }
      } else {
        if (!isCurrentlyInside) {
          reason = "Not inside - cannot exit";
          accessGranted = false;
          console.log(`❌ Exit denied - member not inside`);
        } else {
          accessGranted = true;
          
          try {
            await dbSuperAdmin.promise().query(
              `UPDATE AdminEntryLogs 
              SET member_status = ?, exit_time = ?, location = ? 
              WHERE id = ?`,
              ["outside", new Date(), location, lastLog.id]
            );
            logId = lastLog.id;
          } catch (logError) {
            console.error("❌ Exit log update failed:", logError.message);
          }
        }
      }

      const finalStatus = accessGranted ? (isEntry ? "inside" : "outside") : "denied";

      const broadcastData = {
        type: "member-update",
        data: {
          id: logId,
          rfid_tag,
          full_name: member.full_name,
          profile_image_url: member.profile_image_url,
          visitor_type: "Member",
          system_type: admin.system_type,
          status: finalStatus,
          member_status: finalStatus,
          reason: reason || (accessGranted ? (isEntry ? "Entry granted" : "Exit granted") : "Access denied"),
          deducted_amount: deductedAmount,
          current_balance: remainingBalance,
          remaining_balance: remainingBalance,
          entry_time: isEntry && accessGranted ? new Date().toISOString() : (lastLog?.entry_time ? new Date(lastLog.entry_time).toISOString() : null),
          exit_time: !isEntry && accessGranted ? new Date().toISOString() : (lastLog?.exit_time ? new Date(lastLog.exit_time).toISOString() : null),
          location,
          admin_id: member.admin_id,
          timestamp: new Date().toISOString()
        }
      };

      broadcastToClients(broadcastData);
      
      console.log(`✅ Broadcast complete\n`);

    } catch (error) {
      console.error("❌ Member handler error:", error.message);
      
      broadcastToClients({
        type: "member-update",
        data: {
          rfid_tag,
          full_name: member?.full_name || "Unknown",
          status: "error",
          reason: "System error: " + error.message,
          location,
          admin_id: member?.admin_id,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  module.exports = {
    handleStaffScan,
    handleEntryExit,
    handleDayPassGuest,
    handleMember
  };