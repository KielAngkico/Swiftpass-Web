async function handleStaffScan(rfid_tag, location, admin_id, allocation, helpers) {
  const { getStaffByRfid, getAdminByRfid, getMemberByRfid, broadcastToClients, dbSuperAdmin } = helpers;

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

  if (allocation.role === 'DayPass') {
    console.log("🔍 Checking if Day Pass guest exists...");
    
    const [dayPassRows] = await dbSuperAdmin.promise().query(
      `SELECT id, guest_name, gender, mobile_number, email, profile_image_url, rfid_tag, expires_at, 
              status, system_type, staff_name, paid_amount, admin_id
       FROM DayPassGuests 
       WHERE rfid_tag = ? AND admin_id = ? AND status IN ('active', 'expired')
       LIMIT 1`,
      [rfid_tag, admin_id]
    );

    if (dayPassRows.length > 0) {
      const guest = dayPassRows[0];
      console.log(`Day Pass guest found: ${guest.guest_name}`);
      
      let imageUrl = guest.profile_image_url;
      if (imageUrl && !imageUrl.startsWith('http')) {
        imageUrl = `https://swiftpasstech.com/${imageUrl}`;
      }
      
const [renewRfidRow] = await dbSuperAdmin.promise().query(
        `SELECT customer_number_display FROM RegisteredRfid WHERE rfid_tag = ? AND role = 'DayPass' LIMIT 1`,
        [rfid_tag]
      );
      const renewCustomerDisplay = renewRfidRow.length > 0 ? renewRfidRow[0].customer_number_display : null;

      broadcastToClients({
        type: "staff-scan",
        data: {
          rfid_tag,
          status: "daypass_renewal",
          full_name: guest.guest_name,
          customer_number_display: renewCustomerDisplay,
          guest_data: {
            id: guest.id,
            guest_name: guest.guest_name,
            gender: guest.gender,
            mobile_number: guest.mobile_number,
            email: guest.email,
            profile_image_url: imageUrl,
            rfid_tag: guest.rfid_tag,
            expires_at: guest.expires_at,
            status: guest.status,
            system_type: guest.system_type,
            staff_name: guest.staff_name,
            paid_amount: guest.paid_amount,
            admin_id: guest.admin_id
          },
          rfid_type: allocation.rfid_type,
          role: allocation.role,
          location,
          admin_id,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }
    // Fetch customer_number_display for new DayPass registration
    const [dpRfidRow] = await dbSuperAdmin.promise().query(
      `SELECT customer_number_display FROM RegisteredRfid WHERE rfid_tag = ? AND role = 'DayPass' LIMIT 1`,
      [rfid_tag]
    );
    const dpCustomerDisplay = dpRfidRow.length > 0 ? dpRfidRow[0].customer_number_display : null;
    console.log("⚠️ Day Pass RFID not assigned yet - route to new registration");
  }

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

const memberCheck = await getMemberByRfid(rfid_tag, admin_id);
  if (memberCheck) {
const [foundRfidRow] = await dbSuperAdmin.promise().query(
      `SELECT customer_number_display FROM RegisteredRfid WHERE rfid_tag = ? AND role = 'Member' LIMIT 1`,
      [rfid_tag]
    );
    const foundCustomerDisplay = foundRfidRow.length > 0 ? foundRfidRow[0].customer_number_display : null;

    broadcastToClients({
      type: "staff-scan",
      data: {
        rfid_tag,
        member_id: memberCheck.id,
        status: "member_found",
        full_name: memberCheck.full_name,
        customer_number_display: foundCustomerDisplay,
        location,
        admin_id,
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

// Fetch customer_number_display for new Member registration
  const [memRfidRow] = await dbSuperAdmin.promise().query(
    `SELECT customer_number_display FROM RegisteredRfid WHERE rfid_tag = ? AND role = 'Member' LIMIT 1`,
    [rfid_tag]
  );
  const memCustomerDisplay = memRfidRow.length > 0 ? memRfidRow[0].customer_number_display : null;

  broadcastToClients({
    type: "staff-scan",
    data: {
      rfid_tag,
      status: "unregistered",
      reason: "Ready for new member registration",
      rfid_type: allocation.rfid_type,
      role: allocation.role,
      customer_number_display: allocation.role === 'DayPass' ? dpCustomerDisplay : memCustomerDisplay,
      location,
      admin_id,
      timestamp: new Date().toISOString()
    }
  });
}

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

  const target_admin_id = admin_id;

  console.log(`🔍 Checking StaffAccounts for admin ${target_admin_id}...`);
  const staffMember = await getStaffByRfid(rfid_tag, target_admin_id);
  if (staffMember) {
    console.log(`Staff Found: ${staffMember.staff_name}`);
    await logStaffActivity(rfid_tag, staffMember, location, location.toUpperCase());

broadcastToClients({
      type: "member-update",
      data: {
        rfid_tag,
        full_name: staffMember.staff_name,
        visitor_type: "Staff",
        status: "staff_granted",
        reason: "Staff access - door open",
        location,
        admin_id: staffMember.admin_id,
        timestamp: new Date().toISOString()
      }
    });
    
    console.log(`⏭️ Staff access granted - Arduino notified, dashboard NOT notified`);
    console.log(`===== END HANDLE ENTRY/EXIT =====\n`);
    return;
  }


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
      console.log(`Member Found: ${member.full_name} (Status: ${member.status})`);
      
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

  if (allocation.role === 'DayPass') {
    console.log(`🔍 Checking DayPassGuests for admin ${target_admin_id}...`);
    await handleDayPassGuest(rfid_tag, location, target_admin_id);
    console.log(`===== END HANDLE ENTRY/EXIT =====\n`);
    return;
  }

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

async function handleDayPassGuest(rfid_tag, location, admin_id) {
  const dbSuperAdmin = require("../db");
  const { broadcastToClients } = require("./websocket");

  try {
    console.log(`🔍 Looking up DayPass guest: ${rfid_tag} for admin ${admin_id}`);
    
    const [guestRows] = await dbSuperAdmin.promise().query(
      `SELECT id, guest_name, gender, mobile_number, email, profile_image_url, rfid_tag, 
              system_type, expires_at, staff_name, paid_amount, admin_id, status
       FROM DayPassGuests
       WHERE rfid_tag = ? AND status = 'active' AND admin_id = ?
       LIMIT 1`,
      [rfid_tag, admin_id]
    );

    if (guestRows.length === 0) {
      console.log(`❌ No active DayPass found for ${rfid_tag}`);
      broadcastToClients({
        type: "member-update",
        data: {
          rfid_tag,
          visitor_type: "Day Pass",
          status: "unregistered",
          reason: "Day Pass not registered yet",
          location,
          admin_id,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    const guest = guestRows[0];
    const now = new Date();

    console.log(`DayPass guest found: ${guest.guest_name}`);

    if (guest.expires_at && new Date(guest.expires_at) < now) {
      console.log(`❌ DayPass expired for ${guest.guest_name}`);
      broadcastToClients({
        type: "member-update",
        data: {
          rfid_tag,
          full_name: guest.guest_name,
          profile_image_url: guest.profile_image_url,
          visitor_type: "Day Pass",
          system_type: guest.system_type,
          status: "denied",
          reason: "Day pass expired",
          location,
          admin_id: guest.admin_id,
          timestamp: now.toISOString()
        }
      });
      return;
    }

    if (["ENTRY", "EXIT"].includes(location.toUpperCase())) {
      const isEntry = location.toUpperCase() === "ENTRY";

const [lastLogRows] = await dbSuperAdmin.promise().query(
        `SELECT id, member_status, entry_time, exit_time
         FROM AdminEntryLogs
         WHERE (member_id = ? OR rfid_tag = ?) AND admin_id = ?
         ORDER BY id DESC LIMIT 1`,
        [guest.id, rfid_tag, admin_id]
      );

      const lastLog = lastLogRows[0] || {};
      const isCurrentlyInside = lastLogRows.length && lastLog.member_status === "inside";
      
      let accessGranted = false;
      let reason = "";
      let logId = null;

      if (isEntry && isCurrentlyInside) {
        reason = "Already inside";
        accessGranted = false;
      } else if (!isEntry && !isCurrentlyInside) {
        reason = "Already outside";
        accessGranted = false;
      } else {
        accessGranted = true;
      }

const memberStatus = accessGranted ? (isEntry ? "inside" : "outside") : "denied";      const entryTime = accessGranted && isEntry ? new Date() : (lastLog.entry_time || null);
      const exitTime = accessGranted && !isEntry ? new Date() : (lastLog.exit_time || null);

      if (accessGranted) {
        if (isEntry) {
          const [result] = await dbSuperAdmin.promise().query(
            `INSERT INTO AdminEntryLogs
             (rfid_tag, full_name, admin_id, staff_name, visitor_type, system_type, 
              deducted_amount, member_status, entry_time, location)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [rfid_tag, guest.guest_name, guest.admin_id, guest.staff_name, 
             "Day Pass", guest.system_type, guest.paid_amount, memberStatus, entryTime, location]
          );
          logId = result.insertId;
          console.log(`💾 Entry log created with ID: ${logId}`);
        } else {
          await dbSuperAdmin.promise().query(
            `UPDATE AdminEntryLogs
             SET member_status = ?, exit_time = ?, location = ?
             WHERE id = ?`,
            [memberStatus, exitTime, location, lastLog.id]
          );
          logId = lastLog.id;
          console.log(`💾 Exit log updated with ID: ${logId}`);
        }
      }

const [dpGuestRfidRow] = await dbSuperAdmin.promise().query(
        `SELECT customer_number_display FROM RegisteredRfid WHERE rfid_tag = ? AND role = 'DayPass' LIMIT 1`,
        [rfid_tag]
      );
      const dpGuestCustomerDisplay = dpGuestRfidRow.length > 0 ? dpGuestRfidRow[0].customer_number_display : null;

      const broadcastData = {
        type: "member-update",
        data: {
          id: logId || lastLog.id,
          rfid_tag,
          full_name: guest.guest_name,
          profile_image_url: guest.profile_image_url,
          customer_number_display: dpGuestCustomerDisplay,
          visitor_type: "Day Pass",
          system_type: guest.system_type,
          status: memberStatus,
          member_status: memberStatus,
          reason: reason || (accessGranted ? (isEntry ? "Entry granted" : "Exit granted") : "Access denied"),
          entry_time: entryTime ? (entryTime instanceof Date ? entryTime.toISOString() : new Date(entryTime).toISOString()) : null,
          exit_time: exitTime ? (exitTime instanceof Date ? exitTime.toISOString() : new Date(exitTime).toISOString()) : null,
          deducted_amount: null,
          staff_name: guest.staff_name,
          location,
          admin_id: guest.admin_id,
          action: isEntry ? "entry" : "exit", 
          last_activity: (isEntry ? entryTime : exitTime) ? 
            ((isEntry ? entryTime : exitTime) instanceof Date ? 
              (isEntry ? entryTime : exitTime).toISOString() : 
              new Date(isEntry ? entryTime : exitTime).toISOString()) : 
            now.toISOString(),
          timestamp: now.toISOString()
        }
      };

      console.log(`📡 Broadcasting DayPass ${isEntry ? 'entry' : 'exit'}:`, JSON.stringify(broadcastData, null, 2));
      broadcastToClients(broadcastData);

      if (!accessGranted) {
        broadcastToClients({
          type: "dashboard-alert",
          data: {
            full_name: guest.guest_name,
            reason: reason || "Access denied",
            admin_id: guest.admin_id,
            timestamp: new Date().toISOString()
          }
        });
      }
    }

  } catch (error) {
    console.error(`❌ DayPass handler error:`, error.message);
    console.error(error.stack);
    broadcastToClients({
      type: "member-update",
      data: {
        rfid_tag,
        visitor_type: "Day Pass",
        status: "error",
        reason: error.message,
        location,
        admin_id,
        timestamp: new Date().toISOString()
      }
    });
  }
}

async function handleMember(member, rfid_tag, location) {
  const dbSuperAdmin = require("../db");
  const { broadcastToClients } = require("./websocket");

  try {
    const [adminRows] = await dbSuperAdmin.promise().query(
      `SELECT id, admin_name, system_type, session_fee, grace_period_minutes 
       FROM AdminAccounts WHERE id = ? LIMIT 1`,
      [member.admin_id]
    );

    if (adminRows.length === 0) {
      console.error(" Admin not found for member:", member.admin_id);
      return;
    }

    const admin = adminRows[0];

    // Only apply grace period logic for prepaid_entry gyms
    if (admin.system_type !== 'prepaid_entry') {
      // ---- SUBSCRIPTION LOGIC (unchanged) ----
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
         WHERE (member_id = ? OR rfid_tag = ?) AND admin_id = ?
         ORDER BY id DESC LIMIT 1`,
        [member.id, rfid_tag, member.admin_id]
      );
      const lastLog = lastLogRows[0];
      const isCurrentlyInside = lastLog && lastLog.member_status === 'inside';

      let accessGranted = false;
      let reason = "";
      let logId = null;

      if (isEntry) {
        if (isCurrentlyInside) {
          reason = "Already inside";
          accessGranted = false;
        } else {
          if (member.subscription_expiry) {
            const expiryDate = new Date(member.subscription_expiry);
            const now = new Date();
            if (expiryDate < now) {
              reason = "Subscription expired";
              accessGranted = false;
            } else {
              accessGranted = true;
            }
          } else {
            accessGranted = true;
          }

          if (accessGranted) {
            try {
              const [logResult] = await dbSuperAdmin.promise().query(
                `INSERT INTO AdminEntryLogs
                 (member_id, rfid_tag, full_name, admin_id, staff_name, visitor_type, system_type, member_status, entry_time, location)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [member.id, rfid_tag, member.full_name, member.admin_id, staff_name, "Member", admin.system_type, "inside", new Date(), location]
              );
              logId = logResult.insertId;
            } catch (logError) {
              console.error("❌ Subscription entry log failed:", logError.message);
            }
          }
        }
      } else {
        if (!isCurrentlyInside) {
          reason = "Not inside - cannot exit";
          accessGranted = false;
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
      const [memberRfidRow] = await dbSuperAdmin.promise().query(
        `SELECT customer_number_display FROM RegisteredRfid WHERE rfid_tag = ? AND role = 'Member' LIMIT 1`,
        [rfid_tag]
      );
      const memberCustomerDisplay = memberRfidRow.length > 0 ? memberRfidRow[0].customer_number_display : null;

      broadcastToClients({
        type: "member-update",
        data: {
          id: logId || lastLog?.id,
          rfid_tag,
          full_name: member.full_name,
          profile_image_url: member.profile_image_url,
          customer_number_display: memberCustomerDisplay,
          visitor_type: "Member",
          system_type: admin.system_type,
          status: finalStatus,
          member_status: finalStatus,
          reason: reason || (accessGranted ? (isEntry ? "Entry granted" : "Exit granted") : "Access denied"),
          deducted_amount: null,
          current_balance: null,
          remaining_balance: null,
          entry_time: isEntry && accessGranted ? new Date().toISOString() : (lastLog?.entry_time ? new Date(lastLog.entry_time).toISOString() : null),
          exit_time: !isEntry && accessGranted ? new Date().toISOString() : (lastLog?.exit_time ? new Date(lastLog.exit_time).toISOString() : null),
          location,
          admin_id: member.admin_id,
          action: isEntry ? "entry" : "exit",
          last_activity: new Date().toISOString(),
          timestamp: new Date().toISOString()
        }
      });

      if (!accessGranted) {
        broadcastToClients({
          type: "dashboard-alert",
          data: {
            full_name: member.full_name,
            reason: reason || "Access denied",
            admin_id: member.admin_id,
            timestamp: new Date().toISOString()
          }
        });
      }
      return;
    }

    // ---- PREPAID ENTRY GRACE PERIOD LOGIC ----
    const isEntry = location.toUpperCase() === "ENTRY";
    const gracePeriodMs = (admin.grace_period_minutes || 60) * 60 * 1000;
    const sessionFee = parseFloat(admin.session_fee || 0);

    console.log(`\nPrepaid Entry — Grace Period: ${admin.grace_period_minutes} min | Fee: ₱${sessionFee}`);

// Find existing open session for this member (exclude grace re-entries)
    const [openSessionRows] = await dbSuperAdmin.promise().query(
      `SELECT * FROM AdminEntryLogs
       WHERE member_id = ? AND admin_id = ?
         AND session_closed = 0
         AND is_grace_reentry = 0
       ORDER BY id DESC LIMIT 1
       FOR UPDATE`,
      [member.id, member.admin_id]
    );
    const openSession = openSessionRows[0] || null;

    const [memberRfidRow] = await dbSuperAdmin.promise().query(
      `SELECT customer_number_display FROM RegisteredRfid WHERE rfid_tag = ? AND role = 'Member' LIMIT 1`,
      [rfid_tag]
    );
    const memberCustomerDisplay = memberRfidRow.length > 0 ? memberRfidRow[0].customer_number_display : null;

    // ---- ENTRY ----
    if (isEntry) {

// Check for open grace re-entry (member already inside)
      const [openGraceRows] = await dbSuperAdmin.promise().query(
        `SELECT * FROM AdminEntryLogs
         WHERE member_id = ? AND admin_id = ?
           AND session_closed = 0
           AND is_grace_reentry = 1
         ORDER BY id DESC LIMIT 1`,
        [member.id, member.admin_id]
      );
      const openGraceSession = openGraceRows[0] || null;
// Block if parent session itself shows member is still inside
      if (openSession && openSession.member_status === 'inside') {
        console.log(`Entry blocked — parent session still open and inside`);
        broadcastToClients({
          type: "member-update",
          data: {
            rfid_tag,
            full_name: member.full_name,
            profile_image_url: member.profile_image_url,
            customer_number_display: memberCustomerDisplay,
            visitor_type: "Member",
            system_type: admin.system_type,
            status: "denied",
            member_status: "denied",
            reason: "Already inside",
            location,
            admin_id: member.admin_id,
            action: "entry",
            timestamp: new Date().toISOString()
          }
        });
        return;
      }
      // Block if grace re-entry is open and member is inside
      if (openGraceSession && openGraceSession.member_status === 'inside') {
        console.log(`Entry blocked — member already inside via grace re-entry`);
        broadcastToClients({
          type: "member-update",
          data: {
            rfid_tag,
            full_name: member.full_name,
            profile_image_url: member.profile_image_url,
            customer_number_display: memberCustomerDisplay,
            visitor_type: "Member",
            system_type: admin.system_type,
            status: "denied",
            member_status: "denied",
            reason: "Already inside",
            location,
            admin_id: member.admin_id,
            action: "entry",
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Block if payment pending on parent
      if (openSession && openSession.payment_pending === 1) {
        console.log(`Entry blocked — payment pending for ${member.full_name}`);
        broadcastToClients({
          type: "member-update",
          data: {
            rfid_tag,
            full_name: member.full_name,
            profile_image_url: member.profile_image_url,
            customer_number_display: memberCustomerDisplay,
            visitor_type: "Member",
            system_type: admin.system_type,
            status: "denied",
            member_status: "denied",
            reason: "Insufficient balance — please top up at the front desk",
            location,
            admin_id: member.admin_id,
            action: "entry",
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

 // Free re-entry within active grace window
      if (openSession && new Date() < new Date(openSession.grace_expires_at)) {
        console.log(`Free re-entry within grace window for ${member.full_name}`);

        const [reentryResult] = await dbSuperAdmin.promise().query(
          `INSERT INTO AdminEntryLogs
           (member_id, rfid_tag, full_name, admin_id, visitor_type, system_type,
            member_status, entry_time, location,
            sessions_deducted, grace_expires_at, session_closed, payment_pending,
            is_grace_reentry, parent_session_id)
           VALUES (?, ?, ?, ?, 'Member', ?, 'inside', ?, ?, 0, ?, 0, 0, 1, ?)`,
          [
            member.id, rfid_tag, member.full_name, member.admin_id,
            admin.system_type, new Date(), location,
            openSession.grace_expires_at,
            openSession.id
          ]
        );

        broadcastToClients({
          type: "member-update",
          data: {
            id: reentryResult.insertId,
            rfid_tag,
            full_name: member.full_name,
            profile_image_url: member.profile_image_url,
            customer_number_display: memberCustomerDisplay,
            visitor_type: "Member",
            system_type: admin.system_type,
            status: "inside",
            member_status: "inside",
            reason: "Free re-entry within grace window",
            current_balance: member.current_balance,
            remaining_balance: member.current_balance,
            entry_time: new Date().toISOString(),
            location,
            admin_id: member.admin_id,
            action: "entry",
            is_grace_reentry: true,
            last_activity: new Date().toISOString(),
            timestamp: new Date().toISOString()
          }
        });
        return;
      }
      // New session — create log and set grace window
      const graceExpiresAt = new Date(Date.now() + gracePeriodMs);
      console.log(` New session for ${member.full_name} — grace expires at ${graceExpiresAt}`);

      const [logResult] = await dbSuperAdmin.promise().query(
        `INSERT INTO AdminEntryLogs
         (member_id, rfid_tag, full_name, admin_id, visitor_type, system_type,
          member_status, entry_time, location,
          sessions_deducted, grace_expires_at, session_closed, payment_pending)
         VALUES (?, ?, ?, ?, 'Member', ?, 'inside', ?, ?, 0, ?, 0, 0)`,
        [
          member.id, rfid_tag, member.full_name, member.admin_id,
          admin.system_type, new Date(), location, graceExpiresAt
        ]
      );
      const logId = logResult.insertId;

      broadcastToClients({
        type: "member-update",
        data: {
          id: logId,
          rfid_tag,
          full_name: member.full_name,
          profile_image_url: member.profile_image_url,
          customer_number_display: memberCustomerDisplay,
          visitor_type: "Member",
          system_type: admin.system_type,
          status: "inside",
          member_status: "inside",
          reason: "Entry granted — grace period started",
          current_balance: member.current_balance,
          remaining_balance: member.current_balance,
          entry_time: new Date().toISOString(),
          location,
          admin_id: member.admin_id,
          action: "entry",
          last_activity: new Date().toISOString(),
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // ---- EXIT ----
    if (!isEntry) {

// No open parent session — check for open grace re-entry
      if (!openSession) {
        const [openGraceExitRows] = await dbSuperAdmin.promise().query(
          `SELECT * FROM AdminEntryLogs
           WHERE member_id = ? AND admin_id = ?
             AND session_closed = 0
             AND is_grace_reentry = 1
           ORDER BY id DESC LIMIT 1`,
          [member.id, member.admin_id]
        );
        const openGraceExit = openGraceExitRows[0] || null;

        if (!openGraceExit || openGraceExit.member_status !== 'inside') {
          console.log(`Exit denied — no open session for ${member.full_name}`);
          broadcastToClients({
            type: "member-update",
            data: {
              rfid_tag,
              full_name: member.full_name,
              profile_image_url: member.profile_image_url,
              visitor_type: "Member",
              system_type: admin.system_type,
              status: "denied",
              member_status: "denied",
              reason: "Not inside — cannot exit",
              location,
              admin_id: member.admin_id,
              action: "exit",
              timestamp: new Date().toISOString()
            }
          });
          return;
        }

        // Found open grace re-entry — check parent for payment_pending
        const [parentRows] = await dbSuperAdmin.promise().query(
          `SELECT * FROM AdminEntryLogs WHERE id = ? LIMIT 1`,
          [openGraceExit.parent_session_id]
        );
        const parentSession = parentRows[0] || null;

        // Check balance using parent's grace window
        const [pricingRowsG] = await dbSuperAdmin.promise().query(
          `SELECT amount_to_pay AS session_fee 
           FROM AdminPricingOptions 
           WHERE admin_id = ? AND plan_name = 'Daily Session' AND is_active = 1
           LIMIT 1`,
          [member.admin_id]
        );
        const graceExitFee = pricingRowsG.length > 0 ? parseFloat(pricingRowsG[0].session_fee) : 0;
        const graceCurrentBalance = parseFloat(member.current_balance || 0);
        const graceExpiresAt2 = new Date(openGraceExit.grace_expires_at);
        const now2 = new Date();
        const timePastExpiry2 = now2 - graceExpiresAt2;
        const missedWindows2 = timePastExpiry2 > 0
          ? Math.max(1, Math.floor(timePastExpiry2 / gracePeriodMs) + 1)
          : 0;
        const totalOwed2 = missedWindows2 * graceExitFee;
        const minimumRequired2 = totalOwed2 + graceExitFee;

        if (graceExitFee > 0 && graceCurrentBalance < minimumRequired2) {
          const denyReason2 = totalOwed2 > 0
            ? `Unpaid: ₱${totalOwed2.toFixed(2)} + ₱${graceExitFee.toFixed(2)} next session. Minimum top-up: ₱${minimumRequired2.toFixed(2)}`
            : `Insufficient balance — minimum ₱${graceExitFee.toFixed(2)} required`;

          broadcastToClients({
            type: "member-update",
            data: {
              rfid_tag,
              full_name: member.full_name,
              profile_image_url: member.profile_image_url,
              customer_number_display: memberCustomerDisplay,
              visitor_type: "Member",
              system_type: admin.system_type,
              status: "denied",
              member_status: "denied",
              reason: denyReason2,
              current_balance: graceCurrentBalance,
              location,
              admin_id: member.admin_id,
              action: "exit",
              timestamp: new Date().toISOString()
            }
          });
          broadcastToClients({
            type: "dashboard-alert",
            data: {
              full_name: member.full_name,
              reason: denyReason2,
              admin_id: member.admin_id,
              timestamp: new Date().toISOString()
            }
          });
          return;
        }

        // Allow exit — close grace re-entry row
        await dbSuperAdmin.promise().query(
          `UPDATE AdminEntryLogs
           SET member_status = 'outside', exit_time = ?, session_closed = 1
           WHERE id = ?`,
          [new Date(), openGraceExit.id]
        );

        console.log(`Exit granted for ${member.full_name} — grace re-entry session closed`);

        broadcastToClients({
          type: "member-update",
          data: {
            id: openGraceExit.id,
            rfid_tag,
            full_name: member.full_name,
            profile_image_url: member.profile_image_url,
            customer_number_display: memberCustomerDisplay,
            visitor_type: "Member",
            system_type: admin.system_type,
            status: "outside",
            member_status: "outside",
            reason: "Exit granted",
            current_balance: member.current_balance,
            remaining_balance: member.current_balance,
            entry_time: openGraceExit.entry_time ? new Date(openGraceExit.entry_time).toISOString() : null,
            exit_time: new Date().toISOString(),
            location,
            admin_id: member.admin_id,
            action: "exit",
            last_activity: new Date().toISOString(),
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Block exit if payment pending


// Check balance before allowing exit
      const [pricingRows] = await dbSuperAdmin.promise().query(
        `SELECT amount_to_pay AS session_fee 
         FROM AdminPricingOptions 
         WHERE admin_id = ? AND plan_name = 'Daily Session' AND is_active = 1
         LIMIT 1`,
        [member.admin_id]
      );

const exitSessionFee = pricingRows.length > 0 ? parseFloat(pricingRows[0].session_fee) : 0;
      const currentBalance = parseFloat(member.current_balance || 0);
      const gracePeriodMs2 = (admin.grace_period_minutes || 2) * 60 * 1000;
      const graceExpiresAt = new Date(openSession.grace_expires_at);
      const now = new Date();
      const timePastExpiry = now - graceExpiresAt;

      const missedWindows = timePastExpiry > 0
        ? Math.max(1, Math.floor(timePastExpiry / gracePeriodMs2) + 1)
        : 0;
      const totalOwed = missedWindows * exitSessionFee;
      const minimumRequired = totalOwed + exitSessionFee;

      if (exitSessionFee > 0 && currentBalance < minimumRequired) {
        const denyReason = totalOwed > 0
          ? `Unpaid: ₱${totalOwed.toFixed(2)} + ₱${exitSessionFee.toFixed(2)} next session. Minimum top-up: ₱${minimumRequired.toFixed(2)}`
          : `Insufficient balance — minimum ₱${exitSessionFee.toFixed(2)} required`;

        console.log(`Exit denied — ${denyReason}`);

        broadcastToClients({
          type: "member-update",
          data: {
            rfid_tag,
            full_name: member.full_name,
            profile_image_url: member.profile_image_url,
            customer_number_display: memberCustomerDisplay,
            visitor_type: "Member",
            system_type: admin.system_type,
            status: "denied",
            member_status: "denied",
            reason: denyReason,
            current_balance: currentBalance,
            remaining_balance: currentBalance,
            location,
            admin_id: member.admin_id,
            action: "exit",
            timestamp: new Date().toISOString()
          }
        });

        broadcastToClients({
          type: "dashboard-alert",
          data: {
            full_name: member.full_name,
            reason: denyReason,
            admin_id: member.admin_id,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Balance sufficient — allow exit
      await dbSuperAdmin.promise().query(
        `UPDATE AdminEntryLogs
         SET member_status = 'outside', exit_time = ?
         WHERE id = ?`,
        [new Date(), openSession.id]
      );

      console.log(`Exit granted for ${member.full_name} — cron will handle deduction at window expiry`);

      broadcastToClients({
        type: "member-update",
        data: {
          id: openSession.id,
          rfid_tag,
          full_name: member.full_name,
          profile_image_url: member.profile_image_url,
          customer_number_display: memberCustomerDisplay,
          visitor_type: "Member",
          system_type: admin.system_type,
          status: "outside",
          member_status: "outside",
          reason: "Exit granted",
          current_balance: member.current_balance,
          remaining_balance: member.current_balance,
          entry_time: openSession.entry_time ? new Date(openSession.entry_time).toISOString() : null,
          exit_time: new Date().toISOString(),
          location,
          admin_id: member.admin_id,
          action: "exit",
          last_activity: new Date().toISOString(),
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

  } catch (error) {
    console.error(" Member handler error:", error.message);
    console.error(error.stack);

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