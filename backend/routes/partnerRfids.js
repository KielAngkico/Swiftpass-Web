const express = require("express");
const router = express.Router();
const db = require("../db");

const query = (sql, params = []) => db.promise().query(sql, params);

// ========================================
// GET PARTNER'S RFID INVENTORY
// ========================================
router.get("/inventory/:admin_id", async (req, res) => {
  try {
    const { admin_id } = req.params;

    // Get all RFIDs owned by this partner
    const [rfids] = await query(`
      SELECT 
        id,
        rfid_tag,
        warehouse_number,
        rfid_type,
        role,
        status,
        customer_number,
        customer_number_display,
        assigned_to_name,
        assignment_date,
        allocation_date,
        created_at
      FROM RegisteredRfid
      WHERE allocated_to_admin = ?
      ORDER BY role, customer_number
    `, [admin_id]);

    // Calculate KPI stats
    const stats = {
      total: rfids.length,
      staff_left: rfids.filter(r => r.role === 'Partner' && !r.assigned_to_name).length,
      member_left: rfids.filter(r => r.role === 'Member' && !r.assigned_to_name).length,
      daypass_left: rfids.filter(r => r.role === 'DayPass' && !r.assigned_to_name).length,
      
      // Additional stats
      staff_total: rfids.filter(r => r.role === 'Partner').length,
      member_total: rfids.filter(r => r.role === 'Member').length,
      daypass_total: rfids.filter(r => r.role === 'DayPass').length,
      
      in_use: rfids.filter(r => r.assigned_to_name).length,
      available: rfids.filter(r => !r.assigned_to_name).length
    };

    res.json({
      stats,
      rfids
    });

  } catch (err) {
    console.error("Get RFID inventory error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// ========================================
// ASSIGN RFID TO MEMBER/STAFF
// ========================================
router.put("/:rfid_id/assign", async (req, res) => {
  try {
    const { rfid_id } = req.params;
    const { assigned_to_name, admin_id } = req.body;

    if (!assigned_to_name || !assigned_to_name.trim()) {
      return res.status(400).json({ error: "Name is required" });
    }

    // Verify RFID belongs to this admin
    const [[rfid]] = await query(`
      SELECT id, allocated_to_admin, warehouse_number, role
      FROM RegisteredRfid
      WHERE id = ?
    `, [rfid_id]);

    if (!rfid) {
      return res.status(404).json({ error: "RFID not found" });
    }

    if (rfid.allocated_to_admin !== admin_id) {
      return res.status(403).json({ error: "You don't own this RFID" });
    }

    // Assign RFID
    const [result] = await query(`
      UPDATE RegisteredRfid
      SET assigned_to_name = ?,
          assignment_date = NOW()
      WHERE id = ?
    `, [assigned_to_name.trim(), rfid_id]);

    if (result.affectedRows === 0) {
      return res.status(400).json({ error: "Failed to assign RFID" });
    }

    res.json({ 
      message: "RFID assigned successfully",
      rfid_id,
      assigned_to: assigned_to_name.trim()
    });

  } catch (err) {
    console.error("Assign RFID error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// ========================================
// UNASSIGN RFID (Make Available)
// ========================================
router.put("/:rfid_id/unassign", async (req, res) => {
  try {
    const { rfid_id } = req.params;
    const { admin_id } = req.body;

    // Verify RFID belongs to this admin
    const [[rfid]] = await query(`
      SELECT id, allocated_to_admin, assigned_to_name
      FROM RegisteredRfid
      WHERE id = ?
    `, [rfid_id]);

    if (!rfid) {
      return res.status(404).json({ error: "RFID not found" });
    }

    if (rfid.allocated_to_admin !== admin_id) {
      return res.status(403).json({ error: "You don't own this RFID" });
    }

    // Unassign RFID
    const [result] = await query(`
      UPDATE RegisteredRfid
      SET assigned_to_name = NULL,
          assignment_date = NULL
      WHERE id = ?
    `, [rfid_id]);

    if (result.affectedRows === 0) {
      return res.status(400).json({ error: "Failed to unassign RFID" });
    }

    res.json({ 
      message: "RFID unassigned successfully",
      rfid_id
    });

  } catch (err) {
    console.error("Unassign RFID error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// ========================================
// GET RFID DETAILS
// ========================================
router.get("/:rfid_id", async (req, res) => {
  try {
    const { rfid_id } = req.params;
    const { admin_id } = req.query;

    const [[rfid]] = await query(`
      SELECT 
        id,
        rfid_tag,
        warehouse_number,
        rfid_type,
        role,
        status,
        customer_number,
        customer_number_display,
        assigned_to_name,
        assignment_date,
        allocation_date,
        order_id,
        created_at
      FROM RegisteredRfid
      WHERE id = ? AND allocated_to_admin = ?
    `, [rfid_id, admin_id]);

    if (!rfid) {
      return res.status(404).json({ error: "RFID not found" });
    }

    res.json(rfid);

  } catch (err) {
    console.error("Get RFID details error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

module.exports = router;