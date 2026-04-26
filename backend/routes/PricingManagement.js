const express = require("express");
const router = express.Router();
const dbSuperAdmin = require("../db");
const logAudit = require("../middleware/auditLogger");

router.post("/add-pricing", async (req, res) => {
  const { admin_id, system_type, plan_name, amount_to_pay, duration_in_days, amount_to_credit } = req.body;

  try {
    let sql, values;

    if (system_type === "subscription") {
      sql = `INSERT INTO AdminPricingOptions (admin_id, system_type, plan_name, amount_to_pay, duration_in_days, is_deletable) VALUES (?, ?, ?, ?, ?, 1)`;
      values = [admin_id, system_type, plan_name, amount_to_pay, duration_in_days || null];
    } else if (system_type === "prepaid_entry") {
      sql = `INSERT INTO AdminPricingOptions (admin_id, system_type, plan_name, amount_to_pay, amount_to_credit, is_deletable) VALUES (?, ?, ?, ?, ?, 1)`;
      values = [admin_id, system_type, plan_name, amount_to_pay, amount_to_credit];
    } else {
      return res.status(400).json({ message: "Invalid system_type" });
    }

    const [result] = await dbSuperAdmin.promise().query(sql, values);

    await logAudit({
      req,
      action: "CREATE",
      module: "Pricing",
      target: plan_name,
      target_id: result.insertId,
      description: `Added plan ${plan_name} ₱${amount_to_pay}`,
      payload: { admin_id, system_type, plan_name, amount_to_pay, duration_in_days, amount_to_credit },
    });

    res.status(200).json({ message: "Plan added successfully" });
  } catch (err) {
    console.error("Error adding pricing plan:", err);
    res.status(500).json({ message: "Server error while adding plan" });
  }
});

router.get("/get-pricing/:admin_id", async (req, res) => {
  const { admin_id } = req.params;

  try {
    const [adminRows] = await dbSuperAdmin.promise().query(
      `SELECT system_type FROM AdminAccounts WHERE id = ?`,
      [admin_id]
    );

    if (adminRows.length === 0) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const system_type = adminRows[0].system_type;

    const [plans] = await dbSuperAdmin.promise().query(
      `SELECT * FROM AdminPricingOptions WHERE system_type = ? AND admin_id = ? ORDER BY is_deletable ASC, plan_name ASC`,
      [system_type, admin_id]
    );

    res.json(plans);
  } catch (err) {
    console.error("Error fetching pricing plans:", err);
    res.status(500).json({ message: "Server error while fetching plans" });
  }
});

router.put("/update-pricing/:id", async (req, res) => {
  const { id } = req.params;
  const { system_type, plan_name, amount_to_pay, duration_in_days, amount_to_credit } = req.body;

  try {
    const [rows] = await dbSuperAdmin.promise().query(
      `SELECT is_deletable, plan_name FROM AdminPricingOptions WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Plan not found" });
    }

    const isDeletable = rows[0].is_deletable;
    const currentPlanName = rows[0].plan_name;

    if (isDeletable === 0 && plan_name !== currentPlanName) {
      return res.status(403).json({ message: "Cannot change the name of a system default plan." });
    }

    let sql, values;

    if (system_type === "subscription") {
      sql = `UPDATE AdminPricingOptions SET plan_name = ?, amount_to_pay = ?, duration_in_days = ? WHERE id = ?`;
      values = [plan_name, amount_to_pay, duration_in_days || null, id];
    } else if (system_type === "prepaid_entry") {
      sql = `UPDATE AdminPricingOptions SET plan_name = ?, amount_to_pay = ?, amount_to_credit = ? WHERE id = ?`;
      values = [plan_name, amount_to_pay, amount_to_credit, id];
    } else {
      return res.status(400).json({ message: "Invalid system_type" });
    }

    await dbSuperAdmin.promise().query(sql, values);

    await logAudit({
      req,
      action: "UPDATE",
      module: "Pricing",
      target: plan_name,
      target_id: parseInt(id),
      description: `Edited plan ${plan_name} ₱${amount_to_pay}`,
      payload: { system_type, plan_name, amount_to_pay, duration_in_days, amount_to_credit },
    });

    res.status(200).json({ message: "Plan updated successfully" });

  } catch (err) {
    console.error("Error updating pricing plan:", err);
    res.status(500).json({ message: "Server error while updating plan" });
  }
});

router.delete("/delete-pricing/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await dbSuperAdmin.promise().query(
      `SELECT is_deletable, plan_name, amount_to_pay FROM AdminPricingOptions WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Plan not found" });
    }

    if (rows[0].is_deletable === 0) {
      return res.status(403).json({ error: "Cannot delete system default plans." });
    }

    const planName = rows[0].plan_name;
    const amountToPay = rows[0].amount_to_pay;

    await dbSuperAdmin.promise().query(
      `DELETE FROM AdminPricingOptions WHERE id = ?`,
      [id]
    );

    await logAudit({
      req,
      action: "DELETE",
      module: "Pricing",
      target: planName,
      target_id: parseInt(id),
      description: `Deleted plan ${planName}`,
      payload: { plan_id: parseInt(id), plan_name: planName, amount_to_pay: amountToPay },
    });

    res.status(200).json({ message: "Plan deleted successfully" });
  } catch (err) {
    console.error("Error deleting pricing plan:", err);
    res.status(500).json({ message: "Server error while deleting plan" });
  }
});

router.post("/add-payment-method", async (req, res) => {
  const { admin_id, name, reference_number } = req.body;

  if (!admin_id || !name) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const sql = `INSERT INTO AdminPaymentMethods (admin_id, name, reference_number) VALUES (?, ?, ?)`;
    const values = [admin_id, name, reference_number || null];

    await dbSuperAdmin.promise().query(sql, values);
    res.status(200).json({ message: "Payment method added successfully" });
  } catch (err) {
    console.error("Error adding payment method:", err);
    res.status(500).json({ message: "Server error while adding payment method" });
  }
});

router.get("/payment-methods/:admin_id", async (req, res) => {
  const { admin_id } = req.params;

  try {
    const [methods] = await dbSuperAdmin.promise().query(
      `SELECT * FROM AdminPaymentMethods WHERE admin_id = ? AND is_enabled = 1 ORDER BY sort_order ASC`,
      [admin_id]
    );
    res.json(methods);
  } catch (err) {
    console.error("Error fetching payment methods:", err);
    res.status(500).json({ message: "Server error while fetching payment methods" });
  }
});

module.exports = router;