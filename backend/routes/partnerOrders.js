const express = require("express");
const router = express.Router();
const db = require("../db");
const logAudit = require("../middleware/auditLogger");

const query = (sql, params = []) => db.promise().query(sql, params);

const generateOrderNumber = () => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${timestamp}${random}`;
};

const getItemType = (itemName) => {
  const name = itemName.toLowerCase();
  if (name.includes('pcb') || name.includes('lock') || name.includes('button')) return 'other';
  if (name.includes('partner') || name.includes('staff')) return 'partner_rfid';
  if (name.includes('member') || name.includes('wristband')) return 'member_rfid';
  if (name.includes('day pass') || name.includes('keyfob')) return 'daypass_rfid';
  return 'other';
};

async function resolveItems(conn, packageId, visited = new Set()) {
  if (visited.has(packageId)) return [];
  visited.add(packageId);

  const [items] = await conn.query(
    "SELECT * FROM PackageItems WHERE package_id = ?", [packageId]
  );

  let resolved = [];
  for (const item of items) {
    if (item.sub_package_id) {
      const childItems = await resolveItems(conn, item.sub_package_id, visited);
      resolved.push(...childItems);
    } else {
      resolved.push(item);
    }
  }
  return resolved;
}

router.get("/available-inventory", async (req, res) => {
  try {
    const [items] = await query(`
      SELECT 
        id,
        name,
        quantity as available_quantity,
        selling_price,
        type as category,
        updated_at
      FROM SuperAdminInventory
      ORDER BY type, name
    `);
    res.json(items);
  } catch (err) {
    console.error("Get available inventory error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

router.get("/available-packages", async (req, res) => {
  try {
    const [packages] = await db.promise().query(`
      SELECT sp.*, 
        JSON_ARRAYAGG(
          JSON_OBJECT('item_name', pi.item_name, 'quantity', pi.quantity, 
                      'sub_package_id', pi.sub_package_id,
                      'sub_package_name', sp2.name)
        ) as items
      FROM SubscriptionPackages sp
      LEFT JOIN PackageItems pi ON pi.package_id = sp.id
      LEFT JOIN SubscriptionPackages sp2 ON sp2.id = pi.sub_package_id
      WHERE sp.package_type IN ('subscription', 'hardware_module', 'rfid_bundle')
      GROUP BY sp.id
      ORDER BY sp.package_type, sp.name
    `);

    // Clean up null items arrays
    const cleaned = packages.map(pkg => ({
      ...pkg,
      items: pkg.items?.filter(i => i.item_name || i.sub_package_name) || []
    }));

    res.json(cleaned);
  } catch (err) {
    console.error("Get available packages error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/order-package", async (req, res) => {
  const conn = await db.promise().getConnection();
  try {
    await conn.beginTransaction();

    const { admin_id, package_id, notes } = req.body;
    if (!admin_id || !package_id) {
      await conn.rollback();
      return res.status(400).json({ error: "Admin ID and Package ID required" });
    }

    const [[pkg]] = await conn.query(
      "SELECT * FROM SubscriptionPackages WHERE id = ?", [package_id]
    );
    if (!pkg) {
      await conn.rollback();
      return res.status(404).json({ error: "Package not found" });
    }

    const order_type = pkg.package_type === "subscription" ? "renewal" : "package_order";
    const order_number = generateOrderNumber();

    const [orderResult] = await conn.query(`
      INSERT INTO PartnerOrders 
      (order_number, admin_id, order_type, package_id, total_amount, payment_status, notes, status)
      VALUES (?, ?, ?, ?, ?, 'unpaid', ?, 'pending')
    `, [order_number, admin_id, order_type, package_id, pkg.price, notes || null]);

    const order_id = orderResult.insertId;

    // Flatten package items and store them as order items
    const resolvedItems = await resolveItems(conn, package_id);

    for (const item of resolvedItems) {
      await conn.query(`
        INSERT INTO PartnerOrderItems 
        (order_id, item_name, item_type, quantity, unit_price, subtotal, status)
        VALUES (?, ?, ?, ?, ?, ?, 'pending')
      `, [order_id, item.item_name, getItemType(item.item_name), item.quantity, 0, 0]);
    }

    await conn.commit();

    await logAudit({
      req,
      action: 'CREATE',
      module: 'Orders',
      target: order_number,
      target_id: order_id,
      description: `Created ${order_type} order ${order_number} for package "${pkg.name}"`,
      payload: req.body,
    });

    res.status(201).json({
      message: "Order created successfully",
      order_id,
      order_number,
      order_type,
      total_amount: pkg.price,
    });

  } catch (err) {
    await conn.rollback();
    console.error("Order package error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  } finally {
    conn.release();
  }
});

router.post("/create", async (req, res) => {
  const conn = await db.promise().getConnection();
  try {
    await conn.beginTransaction();

    const { admin_id, items, notes } = req.body;

    if (!admin_id || !items || items.length === 0) {
      await conn.rollback();
      return res.status(400).json({ error: "Admin ID and items are required" });
    }

    for (const item of items) {
      const [[inventoryItem]] = await conn.query(`
        SELECT id, name, quantity, selling_price 
        FROM SuperAdminInventory 
        WHERE name = ?
      `, [item.item_name]);

      if (!inventoryItem) {
        await conn.rollback();
        return res.status(400).json({ error: `Item "${item.item_name}" not found in inventory` });
      }

      if (inventoryItem.quantity < item.quantity) {
        await conn.rollback();
        return res.status(400).json({ error: `Insufficient stock for "${item.item_name}". Available: ${inventoryItem.quantity}` });
      }

      item.unit_price = inventoryItem.selling_price;
    }

    const total_amount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const order_number = generateOrderNumber();

    const [orderResult] = await conn.query(`
      INSERT INTO PartnerOrders 
      (order_number, admin_id, order_type, total_amount, payment_status, notes, status)
      VALUES (?, ?, 'reorder', ?, 'unpaid', ?, 'pending')
    `, [order_number, admin_id, total_amount, notes || null]);

    const order_id = orderResult.insertId;

    for (const item of items) {
      const subtotal = item.quantity * item.unit_price;
      const itemType = getItemType(item.item_name);

      await conn.query(`
        INSERT INTO PartnerOrderItems 
        (order_id, item_name, item_type, quantity, unit_price, subtotal, status)
        VALUES (?, ?, ?, ?, ?, ?, 'pending')
      `, [order_id, item.item_name, itemType, item.quantity, item.unit_price, subtotal]);
    }

    await conn.commit();

    await logAudit({
      req,
      action: 'CREATE',
      module: 'Orders',
      target: order_number,
      target_id: order_id,
      description: `Created order ${order_number} for admin ${admin_id}`,
      payload: req.body,
    });

    res.status(201).json({
      message: "Order created successfully",
      order_id,
      order_number,
      total_amount,
      payment_status: 'unpaid'
    });

  } catch (err) {
    await conn.rollback();
    console.error("Create order error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  } finally {
    conn.release();
  }
});

router.put("/:id/complete-with-payment", async (req, res) => {
  const conn = await db.promise().getConnection();
  try {
    await conn.beginTransaction();

    const { id } = req.params;
    const { payment_method, reference_number } = req.body;

    const [[order]] = await conn.query(`
      SELECT * FROM PartnerOrders 
      WHERE id = ? AND status = 'processing'
    `, [id]);

    if (!order) {
      await conn.rollback();
      return res.status(404).json({ error: "Order not found or not in processing status" });
    }

    if (order.order_type === 'initial_package') {
      await conn.query(`
        UPDATE PartnerOrders 
        SET status = 'completed', completed_at = NOW()
        WHERE id = ?
      `, [id]);

      await conn.commit();

      await logAudit({
        req,
        action: 'UPDATE',
        module: 'Orders',
        target: order.order_number,
        target_id: parseInt(id),
        description: `Completed order ${order.order_number} (initial package)`,
        payload: req.body,
      });

      return res.json({
        message: "Order completed (payment already recorded at signup)",
        skipped_payment: true
      });
    }

    if (!payment_method) {
      await conn.rollback();
      return res.status(400).json({ error: "Payment method is required" });
    }

    if (payment_method.toLowerCase() !== 'cash' && !reference_number) {
      await conn.rollback();
      return res.status(400).json({ error: "Reference number is required for non-cash payments" });
    }

    const [txnResult] = await conn.query(`
      INSERT INTO SuperAdminTransactions 
      (admin_id, order_id, transaction_type, amount, payment_method, reference_number)
      VALUES (?, ?, 'Order Payment', ?, ?, ?)
    `, [order.admin_id, id, order.total_amount, payment_method, reference_number || null]);

    const transaction_id = txnResult.insertId;

    const [orderItems] = await conn.query(`
      SELECT item_name, quantity, unit_price, subtotal FROM PartnerOrderItems WHERE order_id = ?
    `, [id]);

    for (const item of orderItems) {
      await conn.query(`
        INSERT INTO SuperAdminTransactionItems
        (transaction_id, item_name, quantity, unit_price, total_price)
        VALUES (?, ?, ?, ?, ?)
      `, [transaction_id, item.item_name, item.quantity, item.unit_price, item.subtotal]);
    }

    await conn.query(`
      UPDATE PartnerOrders 
      SET status = 'completed', payment_status = 'paid', completed_at = NOW()
      WHERE id = ?
    `, [id]);

await conn.query(`
      UPDATE RegisteredRfid 
      SET status = 'in_use'
      WHERE order_id = ? AND status = 'allocated'
    `, [id]);

    // ── Extend subscription if this order has a package with duration_days ──
    if (order.package_id) {
      const [[pkg]] = await conn.query(
        "SELECT duration_days FROM SubscriptionPackages WHERE id = ?",
        [order.package_id]
      );

      if (pkg?.duration_days > 0) {
        const [[admin]] = await conn.query(
          "SELECT subscription_end_date FROM AdminAccounts WHERE id = ?",
          [order.admin_id]
        );

        const now = new Date();
        const currentEnd = admin?.subscription_end_date
          ? new Date(admin.subscription_end_date)
          : now;
        const baseDate = currentEnd > now ? currentEnd : now;
        const newEnd = new Date(baseDate);
        newEnd.setDate(baseDate.getDate() + pkg.duration_days);

        await conn.query(
          `UPDATE AdminAccounts 
           SET subscription_end_date = ?, package_id = ?
           WHERE id = ?`,
          [newEnd, order.package_id, order.admin_id]
        );
      }
    }

    await conn.commit();

    await logAudit({
      req,
      action: 'UPDATE',
      module: 'Orders',
      target: order.order_number,
      target_id: parseInt(id),
      description: `Completed order ${order.order_number} with payment`,
      payload: req.body,
    });

    res.json({
      message: "Order completed and payment recorded successfully",
      transaction_id,
      payment_method,
      amount_paid: order.total_amount
    });

  } catch (err) {
    await conn.rollback();
    console.error("Complete order with payment error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  } finally {
    conn.release();
  }
});

router.get("/payment-options", async (req, res) => {
  try {
    const [options] = await query(`
      SELECT * FROM SuperAdminPaymentOptions 
      WHERE is_enabled = 1
      ORDER BY is_default DESC, payment_method ASC
    `);
    res.json(options);
  } catch (err) {
    console.error("Get payment options error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/partner/:admin_id", async (req, res) => {
  try {
    const { admin_id } = req.params;
    const { status } = req.query;

    let whereClause = `WHERE po.admin_id = ?`;
    const params = [admin_id];

    if (status && status !== 'all') {
      whereClause += ` AND po.status = ?`;
      params.push(status);
    }

    const [orders] = await query(`
      SELECT 
        po.id, po.order_number, po.order_type, po.order_date, po.status,
        po.total_amount, po.payment_status, po.notes, po.processed_at, po.completed_at
      FROM PartnerOrders po
      ${whereClause}
      ORDER BY po.order_date DESC
    `, params);

    for (let order of orders) {
      const [items] = await query(`
        SELECT item_name, item_type, quantity, unit_price, subtotal, allocated_quantity, status
        FROM PartnerOrderItems WHERE order_id = ?
      `, [order.id]);
      order.items = items;

      const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
      const allocatedItems = items.reduce((sum, item) => sum + item.allocated_quantity, 0);
      order.completion_percentage = totalItems > 0 ? Math.round((allocatedItems / totalItems) * 100) : 0;
    }

    res.json(orders);
  } catch (err) {
    console.error("Get partner orders error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/all", async (req, res) => {
  try {
    const { status } = req.query;

    let whereClause = status && status !== 'all' ? `WHERE po.status = ?` : '';
    const params = status && status !== 'all' ? [status] : [];

    const [orders] = await query(`
      SELECT 
        po.id, po.order_number, po.order_type, po.order_date, po.status,
        po.total_amount, po.payment_status, po.notes, po.processed_at, po.completed_at,
        po.admin_id, aa.gym_name, aa.admin_name, aa.email
      FROM PartnerOrders po
      JOIN AdminAccounts aa ON po.admin_id = aa.id
      ${whereClause}
      ORDER BY po.order_date DESC
    `, params);

    for (let order of orders) {
      const [items] = await query(`
        SELECT item_name, item_type, quantity, unit_price, subtotal, allocated_quantity, status
        FROM PartnerOrderItems WHERE order_id = ?
      `, [order.id]);
      order.items = items;

      const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
      const allocatedItems = items.reduce((sum, item) => sum + item.allocated_quantity, 0);
      order.completion_percentage = totalItems > 0 ? Math.round((allocatedItems / totalItems) * 100) : 0;
    }

    res.json(orders);
  } catch (err) {
    console.error("Get all orders error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/:id/process", async (req, res) => {
  const conn = await db.promise().getConnection();
  try {
    await conn.beginTransaction();

    const { id } = req.params;

    const [[order]] = await conn.query(
      `SELECT * FROM PartnerOrders WHERE id = ? AND status = 'pending'`, [id]
    );

    if (!order) {
      await conn.rollback();
      return res.status(404).json({ error: "Order not found or already processed" });
    }
    if (order.order_type === 'renewal') {
  const { payment_method, reference_number } = req.body;

  if (!payment_method) {
    await conn.rollback();
    return res.status(400).json({ error: "Payment method is required for renewals" });
  }

  // Extend subscription
  if (order.package_id) {
    const [[pkg]] = await conn.query(
      "SELECT duration_days FROM SubscriptionPackages WHERE id = ?",
      [order.package_id]
    );

    if (pkg?.duration_days > 0) {
      const [[admin]] = await conn.query(
        "SELECT subscription_end_date FROM AdminAccounts WHERE id = ?",
        [order.admin_id]
      );

      const now = new Date();
      const currentEnd = admin?.subscription_end_date
        ? new Date(admin.subscription_end_date) : now;
      const baseDate = currentEnd > now ? currentEnd : now;
      const newEnd = new Date(baseDate);
      newEnd.setDate(baseDate.getDate() + pkg.duration_days);

      await conn.query(
        `UPDATE AdminAccounts 
         SET subscription_end_date = ?, package_id = ?, is_archived = 0
         WHERE id = ?`,
        [newEnd, order.package_id, order.admin_id]
      );
    }
  }

  // Record transaction
  const [txnResult] = await conn.query(`
    INSERT INTO SuperAdminTransactions 
    (admin_id, order_id, transaction_type, amount, payment_method, reference_number)
    VALUES (?, ?, 'Renewal Payment', ?, ?, ?)
  `, [order.admin_id, id, order.total_amount, payment_method, reference_number || null]);

  const transaction_id = txnResult.insertId;

  await conn.query(`
    INSERT INTO SuperAdminTransactionItems
    (transaction_id, item_name, quantity, unit_price, total_price)
    VALUES (?, ?, ?, ?, ?)
  `, [transaction_id, 'Subscription Renewal', 1, order.total_amount, order.total_amount]);

  // Go straight to completed
  await conn.query(`
    UPDATE PartnerOrders 
    SET status = 'completed', payment_status = 'paid', 
        processed_at = NOW(), completed_at = NOW()
    WHERE id = ?
  `, [id]);

  await conn.commit();

  await logAudit({
    req,
    action: 'UPDATE',
    module: 'Orders',
    target: order.order_number,
    target_id: parseInt(id),
    description: `Processed renewal order ${order.order_number} — subscription extended`,
    payload: req.body,
  });

  return res.json({
    message: "Renewal processed and subscription extended successfully",
    transaction_id,
    payment_method,
    amount_paid: order.total_amount
  });
}
    const [orderItems] = await conn.query(
      `SELECT * FROM PartnerOrderItems WHERE order_id = ? AND status != 'fully_allocated'`, [id]
    );

    let allocationResults = [];

    for (const item of orderItems) {
      const remainingQty = item.quantity - item.allocated_quantity;
      if (remainingQty <= 0) continue;

      if (item.item_type.includes('rfid')) {
        let rfidRole = 'Member';
        if (item.item_type === 'partner_rfid') rfidRole = 'Partner';
        else if (item.item_type === 'daypass_rfid') rfidRole = 'DayPass';

        const [availableRfids] = await conn.query(`
          SELECT id, rfid_tag FROM RegisteredRfid 
          WHERE status = 'in_stock' AND role = ? LIMIT ?
        `, [rfidRole, remainingQty]);

        if (availableRfids.length === 0) {
          allocationResults.push({ item: item.item_name, requested: remainingQty, allocated: 0, error: `No ${rfidRole} RFIDs available` });
          continue;
        }

        for (const rfid of availableRfids) {
          await conn.query(`
            UPDATE RegisteredRfid 
            SET status = 'allocated', allocated_to_admin = ?, order_id = ?, allocation_date = NOW()
            WHERE id = ?
          `, [order.admin_id, id, rfid.id]);
        }

        await conn.query(`
          UPDATE SuperAdminInventory 
          SET quantity = GREATEST(0, quantity - ?), updated_at = NOW()
          WHERE name = ?
        `, [availableRfids.length, item.item_name]);

        const newAllocated = item.allocated_quantity + availableRfids.length;
        const newStatus = newAllocated >= item.quantity ? 'fully_allocated' : 'partially_allocated';

        await conn.query(`
          UPDATE PartnerOrderItems SET allocated_quantity = ?, status = ? WHERE id = ?
        `, [newAllocated, newStatus, item.id]);

        allocationResults.push({
          item: item.item_name, type: 'RFID', requested: remainingQty,
          allocated: availableRfids.length, rfids: availableRfids.map(r => r.rfid_tag)
        });

      } else {
        const [[inventoryItem]] = await conn.query(`
          SELECT id, name, quantity FROM SuperAdminInventory WHERE name = ?
        `, [item.item_name]);

        if (!inventoryItem || inventoryItem.quantity < remainingQty) {
          allocationResults.push({ item: item.item_name, requested: remainingQty, allocated: 0, error: `Insufficient stock (Available: ${inventoryItem?.quantity || 0})` });
          continue;
        }

        await conn.query(`
          UPDATE SuperAdminInventory 
          SET quantity = quantity - ?, updated_at = NOW()
          WHERE id = ? AND quantity >= ?
        `, [remainingQty, inventoryItem.id, remainingQty]);

        await conn.query(`
          UPDATE PartnerOrderItems SET allocated_quantity = quantity, status = 'fully_allocated' WHERE id = ?
        `, [item.id]);

        allocationResults.push({ item: item.item_name, type: 'Inventory', requested: remainingQty, allocated: remainingQty });
      }
    }

    await conn.query(`
      UPDATE PartnerOrders SET status = 'processing', processed_at = NOW() WHERE id = ?
    `, [id]);

    await conn.commit();

    await logAudit({
      req,
      action: 'UPDATE',
      module: 'Orders',
      target: order.order_number,
      target_id: parseInt(id),
      description: `Processed order ${order.order_number}`,
      payload: req.body,
    });

    res.json({ message: "Order processed successfully", allocation_results: allocationResults });

  } catch (err) {
    await conn.rollback();
    console.error("Process order error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  } finally {
    conn.release();
  }
});

router.put("/:id/cancel", async (req, res) => {
  const conn = await db.promise().getConnection();
  try {
    await conn.beginTransaction();

    const { id } = req.params;

    const [[order]] = await conn.query(`SELECT * FROM PartnerOrders WHERE id = ?`, [id]);

    if (!order) {
      await conn.rollback();
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.status === 'completed') {
      await conn.rollback();
      return res.status(400).json({ error: "Cannot cancel completed order" });
    }

    const [orderItems] = await conn.query(`
      SELECT item_name, allocated_quantity FROM PartnerOrderItems 
      WHERE order_id = ? AND allocated_quantity > 0
    `, [id]);

    for (const item of orderItems) {
      await conn.query(`
        UPDATE SuperAdminInventory SET quantity = quantity + ?, updated_at = NOW() WHERE name = ?
      `, [item.allocated_quantity, item.item_name]);
    }

    await conn.query(`
      UPDATE RegisteredRfid 
      SET status = 'in_stock', allocated_to_admin = NULL, order_id = NULL, allocation_date = NULL
      WHERE order_id = ?
    `, [id]);

    await conn.query(`
      UPDATE PartnerOrders SET status = 'cancelled', cancelled_at = NOW() WHERE id = ?
    `, [id]);

    await conn.commit();

    await logAudit({
      req,
      action: 'UPDATE',
      module: 'Orders',
      target: order.order_number,
      target_id: parseInt(id),
      description: `Cancelled order ${order.order_number}`,
      payload: req.body,
    });

    res.json({ message: "Order cancelled successfully" });
  } catch (err) {
    await conn.rollback();
    console.error("Cancel order error:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    conn.release();
  }
});

router.get("/:id/allocated-rfids", async (req, res) => {
  try {
    const { id } = req.params;

    const [rfids] = await query(`
      SELECT id, rfid_tag, rfid_type, role, status, allocation_date
      FROM RegisteredRfid WHERE order_id = ? ORDER BY role, rfid_tag
    `, [id]);

    const grouped = rfids.reduce((acc, rfid) => {
      if (!acc[rfid.role]) acc[rfid.role] = [];
      acc[rfid.role].push(rfid);
      return acc;
    }, {});

    res.json({ total: rfids.length, rfids: grouped });
  } catch (err) {
    console.error("Get allocated RFIDs error:", err);
    res.status(500).json({ error: "Server error" });
  }
});



module.exports = router;