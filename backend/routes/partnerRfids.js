const express = require("express");
const router = express.Router();
const db = require("../db");
const logAudit = require("../middleware/auditLogger");

const query = (sql, params = []) => db.promise().query(sql, params);

router.get("/inventory/:admin_id", async (req, res) => {
  try {
    const { admin_id } = req.params;

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

const stats = {
  total: rfids.filter(r => r.status !== 'replaced' && r.status !== 'deactivated').length,
  staff_left: rfids.filter(r => r.role === 'Partner' && r.status === 'allocated').length,
  member_left: rfids.filter(r => r.role === 'Member' && r.status === 'allocated').length,
  daypass_left: rfids.filter(r => r.role === 'DayPass' && r.status === 'allocated').length,
  staff_total: rfids.filter(r => r.role === 'Partner' && r.status !== 'replaced' && r.status !== 'deactivated').length,
  member_total: rfids.filter(r => r.role === 'Member' && r.status !== 'replaced' && r.status !== 'deactivated').length,
  daypass_total: rfids.filter(r => r.role === 'DayPass' && r.status !== 'replaced' && r.status !== 'deactivated').length,
  in_use: rfids.filter(r => r.status === 'in_use').length,
  available: rfids.filter(r => r.status === 'allocated').length
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

router.put("/:rfid_id/assign", async (req, res) => {
  try {
    const { rfid_id } = req.params;
    const { assigned_to_name, admin_id } = req.body;

    if (!assigned_to_name || !assigned_to_name.trim()) {
      return res.status(400).json({ error: "Name is required" });
    }

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

    const [result] = await query(`
      UPDATE RegisteredRfid
      SET assigned_to_name = ?,
          assignment_date = NOW()
      WHERE id = ?
    `, [assigned_to_name.trim(), rfid_id]);

    if (result.affectedRows === 0) {
      return res.status(400).json({ error: "Failed to assign RFID" });
    }

    await logAudit({
      req,
      action: "UPDATE",
      module: "PartnerRFID",
      target: assigned_to_name.trim(),
      target_id: parseInt(rfid_id),
      description: `Assigned RFID to ${assigned_to_name.trim()}`,
      payload: req.body,
    });

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

router.put("/:rfid_id/unassign", async (req, res) => {
  try {
    const { rfid_id } = req.params;
    const { admin_id } = req.body;

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

    const [result] = await query(`
      UPDATE RegisteredRfid
      SET assigned_to_name = NULL,
          assignment_date = NULL
      WHERE id = ?
    `, [rfid_id]);

    if (result.affectedRows === 0) {
      return res.status(400).json({ error: "Failed to unassign RFID" });
    }

    await logAudit({
      req,
      action: "UPDATE",
      module: "PartnerRFID",
      target: rfid.assigned_to_name || "Unknown",
      target_id: parseInt(rfid_id),
      description: `Unassigned RFID from ${rfid.assigned_to_name || "Unknown"}`,
      payload: req.body,
    });

    res.json({
      message: "RFID unassigned successfully",
      rfid_id
    });

  } catch (err) {
    console.error("Unassign RFID error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

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