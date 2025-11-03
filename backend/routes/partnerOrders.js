const express = require("express");
const router = express.Router();
const db = require("../db");

const query = (sql, params = []) => db.promise().query(sql, params);

// --- Generate Order Number ---
const generateOrderNumber = () => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${timestamp}${random}`;
};

// --- Determine item type based on item name ---
const getItemType = (itemName) => {
  const name = itemName.toLowerCase();
  
  if (name.includes('pcb') || name.includes('lock') || name.includes('button')) {
    return 'other';
  }
  
  if (name.includes('partner') || name.includes('staff')) return 'partner_rfid';
  if (name.includes('member') || name.includes('wristband')) return 'member_rfid';
  if (name.includes('day pass') || name.includes('keyfob')) return 'daypass_rfid';
  
  return 'other';
};

// ========================================
// GET AVAILABLE INVENTORY FOR ORDER CREATION
// ========================================
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
// ========================================
// CREATE NEW ORDER (Partner) - Updated to use inventory prices
// ========================================
router.post("/create", async (req, res) => {
  const conn = await db.promise().getConnection();
  try {
    await conn.beginTransaction();

    const { admin_id, items, notes } = req.body;

    // Validate
    if (!admin_id || !items || items.length === 0) {
      await conn.rollback();
      return res.status(400).json({ error: "Admin ID and items are required" });
    }

    // Validate inventory availability and prices
    for (const item of items) {
      const [[inventoryItem]] = await conn.query(`
        SELECT id, name, quantity, selling_price 
        FROM SuperAdminInventory 
        WHERE name = ?
      `, [item.item_name]);

      if (!inventoryItem) {
        await conn.rollback();
        return res.status(400).json({ 
          error: `Item "${item.item_name}" not found in inventory` 
        });
      }

      if (inventoryItem.quantity < item.quantity) {
        await conn.rollback();
        return res.status(400).json({ 
          error: `Insufficient stock for "${item.item_name}". Available: ${inventoryItem.quantity}` 
        });
      }

      // Override with actual selling price from inventory
      item.unit_price = inventoryItem.selling_price;
    }

    // Calculate total from inventory prices
    const total_amount = items.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_price);
    }, 0);

    const order_number = generateOrderNumber();

    // Create order with unpaid status
    const [orderResult] = await conn.query(`
      INSERT INTO PartnerOrders 
      (order_number, admin_id, order_type, total_amount, payment_status, notes, status)
      VALUES (?, ?, 'reorder', ?, 'unpaid', ?, 'pending')
    `, [order_number, admin_id, total_amount, notes || null]);

    const order_id = orderResult.insertId;

    // Create order items with inventory prices
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

// ========================================
// MARK AS RECEIVED (Partner) - Updated flow
// ========================================
// --- Partner clicks "Received" ---
router.put("/:id/receive", async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await query(`
      UPDATE PartnerOrders
      SET status = 'received',
          received_at = NOW()
      WHERE id = ? AND status = 'delivering'
    `, [id]);

    if (result.affectedRows === 0) {
      const [[order]] = await query(`SELECT id, status FROM PartnerOrders WHERE id = ?`, [id]);
      if (!order) return res.status(404).json({ error: "Order not found" });
      return res.status(400).json({
        error: `Order cannot be marked as received (current status: ${order.status})`,
      });
    }

    res.json({ message: "Order marked as received successfully." });
  } catch (err) {
    console.error("Receive order error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// ========================================
// COMPLETE ORDER WITH PAYMENT (SuperAdmin) - New endpoint
// ========================================
router.put("/:id/complete-with-payment", async (req, res) => {
  const conn = await db.promise().getConnection();
  try {
    await conn.beginTransaction();

    const { id } = req.params;
    const { payment_method, reference_number } = req.body;

    // Get order details
    const [[order]] = await conn.query(`
      SELECT * FROM PartnerOrders 
      WHERE id = ? AND status = 'received'
    `, [id]);

    if (!order) {
      await conn.rollback();
      return res.status(404).json({ 
        error: "Order not found or not in received status" 
      });
    }

    // Check if it's initial package (already paid)
    if (order.order_type === 'initial_package') {
      // Skip payment, just complete
      await conn.query(`
        UPDATE PartnerOrders 
        SET status = 'completed',
            completed_at = NOW()
        WHERE id = ?
      `, [id]);

      // Update RFIDs to in_use
      await conn.query(`
        UPDATE RegisteredRfid 
        SET status = 'in_use'
        WHERE order_id = ? AND status = 'allocated'
      `, [id]);

      await conn.commit();
      return res.json({ 
        message: "Order completed (payment already recorded at signup)",
        skipped_payment: true
      });
    }

    // For reorders, require payment info
    if (!payment_method) {
      await conn.rollback();
      return res.status(400).json({ 
        error: "Payment method is required" 
      });
    }

    // If not cash, require reference number
    if (payment_method.toLowerCase() !== 'cash' && !reference_number) {
      await conn.rollback();
      return res.status(400).json({ 
        error: "Reference number is required for non-cash payments" 
      });
    }

    // Create SuperAdmin transaction
// Create SuperAdmin transaction
const [txnResult] = await conn.query(`
  INSERT INTO SuperAdminTransactions 
  (admin_id, order_id, transaction_type, amount, payment_method, reference_number)
  VALUES (?, ?, 'Order Payment', ?, ?, ?)
`, [order.admin_id, id, order.total_amount, payment_method, reference_number || null]);
    const transaction_id = txnResult.insertId;

    // Get order items for transaction details
    const [orderItems] = await conn.query(`
      SELECT item_name, quantity, unit_price, subtotal
      FROM PartnerOrderItems
      WHERE order_id = ?
    `, [id]);

    // Insert transaction items
    for (const item of orderItems) {
      await conn.query(`
        INSERT INTO SuperAdminTransactionItems
        (transaction_id, item_name, quantity, unit_price, total_price)
        VALUES (?, ?, ?, ?, ?)
      `, [transaction_id, item.item_name, item.quantity, item.unit_price, item.subtotal]);
    }

    // Update order to completed and paid
    await conn.query(`
      UPDATE PartnerOrders 
      SET status = 'completed',
          payment_status = 'paid',
          completed_at = NOW()
      WHERE id = ?
    `, [id]);

    // Update allocated RFIDs to in_use
    await conn.query(`
      UPDATE RegisteredRfid 
      SET status = 'in_use'
      WHERE order_id = ? AND status = 'allocated'
    `, [id]);

    await conn.commit();

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

// ========================================
// GET PAYMENT OPTIONS
// ========================================
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

// Keep existing endpoints: /all, /:id, /process, /ship, /cancel, /allocated-rfids
// (Previous implementations remain the same)

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
        po.id,
        po.order_number,
        po.order_type,
        po.order_date,
        po.status,
        po.total_amount,
        po.payment_status,
        po.notes,
        po.processed_at,
        po.shipped_at,
        po.received_at,
        po.completed_at
      FROM PartnerOrders po
      ${whereClause}
      ORDER BY po.order_date DESC
    `, params);

    for (let order of orders) {
      const [items] = await query(`
        SELECT 
          item_name,
          item_type,
          quantity,
          unit_price,
          subtotal,
          allocated_quantity,
          status
        FROM PartnerOrderItems
        WHERE order_id = ?
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
        po.id,
        po.order_number,
        po.order_type,
        po.order_date,
        po.status,
        po.total_amount,
        po.payment_status,
        po.notes,
        po.processed_at,
        po.shipped_at,
        po.received_at,
        po.completed_at,
        po.admin_id,
        aa.gym_name,
        aa.admin_name,
        aa.email
      FROM PartnerOrders po
      JOIN AdminAccounts aa ON po.admin_id = aa.id
      ${whereClause}
      ORDER BY po.order_date DESC
    `, params);

    for (let order of orders) {
      const [items] = await query(`
        SELECT 
          item_name,
          item_type,
          quantity,
          unit_price,
          subtotal,
          allocated_quantity,
          status
        FROM PartnerOrderItems
        WHERE order_id = ?
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
      `SELECT * FROM PartnerOrders WHERE id = ? AND status = 'pending'`,
      [id]
    );

    if (!order) {
      await conn.rollback();
      return res.status(404).json({ error: "Order not found or already processed" });
    }

    const [orderItems] = await conn.query(
      `SELECT * FROM PartnerOrderItems WHERE order_id = ? AND status != 'fully_allocated'`,
      [id]
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
          WHERE status = 'in_stock' 
          AND role = ?
          LIMIT ?
        `, [rfidRole, remainingQty]);

        if (availableRfids.length === 0) {
          allocationResults.push({
            item: item.item_name,
            requested: remainingQty,
            allocated: 0,
            error: `No ${rfidRole} RFIDs available in stock`
          });
          continue;
        }

        // Allocate RFIDs
        for (const rfid of availableRfids) {
          await conn.query(`
            UPDATE RegisteredRfid 
            SET status = 'allocated',
                allocated_to_admin = ?,
                order_id = ?,
                allocation_date = NOW()
            WHERE id = ?
          `, [order.admin_id, id, rfid.id]);
        }

        // 🔥 UPDATE: Deduct allocated RFIDs from SuperAdminInventory
        await conn.query(`
          UPDATE SuperAdminInventory 
          SET quantity = quantity - ?,
              updated_at = NOW()
          WHERE name = ?
        `, [availableRfids.length, item.item_name]);

        const newAllocated = item.allocated_quantity + availableRfids.length;
        const newStatus = newAllocated >= item.quantity ? 'fully_allocated' : 'partially_allocated';

        await conn.query(`
          UPDATE PartnerOrderItems 
          SET allocated_quantity = ?,
              status = ?
          WHERE id = ?
        `, [newAllocated, newStatus, item.id]);

        allocationResults.push({
          item: item.item_name,
          type: 'RFID',
          requested: remainingQty,
          allocated: availableRfids.length,
          rfids: availableRfids.map(r => r.rfid_tag)
        });
      } else {
        const [[inventoryItem]] = await conn.query(`
          SELECT id, name, quantity FROM SuperAdminInventory 
          WHERE name = ?
        `, [item.item_name]);

        if (!inventoryItem) {
          allocationResults.push({
            item: item.item_name,
            requested: remainingQty,
            allocated: 0,
            error: `Item not found in inventory`
          });
          continue;
        }

        if (inventoryItem.quantity < remainingQty) {
          allocationResults.push({
            item: item.item_name,
            requested: remainingQty,
            allocated: 0,
            error: `Insufficient stock (Available: ${inventoryItem.quantity})`
          });
          continue;
        }

        await conn.query(`
          UPDATE SuperAdminInventory 
          SET quantity = quantity - ?,
              updated_at = NOW()
          WHERE id = ?
        `, [remainingQty, inventoryItem.id]);

        await conn.query(`
          UPDATE PartnerOrderItems 
          SET allocated_quantity = quantity,
              status = 'fully_allocated'
          WHERE id = ?
        `, [item.id]);

        allocationResults.push({
          item: item.item_name,
          type: 'Inventory',
          requested: remainingQty,
          allocated: remainingQty,
          remaining_stock: inventoryItem.quantity - remainingQty
        });
      }
    }

    await conn.query(`
      UPDATE PartnerOrders 
      SET status = 'processing',
          processed_at = NOW()
      WHERE id = ?
    `, [id]);

    await conn.commit();

    res.json({
      message: "Order processed successfully",
      allocation_results: allocationResults
    });

  } catch (err) {
    await conn.rollback();
    console.error("Process order error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  } finally {
    conn.release();
  }
});

router.put("/:id/ship", async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await query(`
      UPDATE PartnerOrders 
      SET status = 'delivering',
          shipped_at = NOW()
      WHERE id = ? AND status = 'processing'
    `, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Order not found or not in processing status" });
    }

    res.json({ message: "Order marked as delivering" });
  } catch (err) {
    console.error("Ship order error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/:id/cancel", async (req, res) => {
  const conn = await db.promise().getConnection();
  try {
    await conn.beginTransaction();

    const { id } = req.params;

    const [[order]] = await conn.query(
      `SELECT * FROM PartnerOrders WHERE id = ?`,
      [id]
    );

    if (!order) {
      await conn.rollback();
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.status === 'completed') {
      await conn.rollback();
      return res.status(400).json({ error: "Cannot cancel completed order" });
    }

    const [orderItems] = await conn.query(`
      SELECT item_name, item_type, allocated_quantity 
      FROM PartnerOrderItems 
      WHERE order_id = ? AND allocated_quantity > 0
    `, [id]);

    // 🔥 Restore inventory for ALL items (including RFIDs)
    for (const item of orderItems) {
      await conn.query(`
        UPDATE SuperAdminInventory 
        SET quantity = quantity + ?,
            updated_at = NOW()
        WHERE name = ?
      `, [item.allocated_quantity, item.item_name]);
    }

    // Release RFIDs back to in_stock
    await conn.query(`
      UPDATE RegisteredRfid 
      SET status = 'in_stock',
          allocated_to_admin = NULL,
          order_id = NULL,
          allocation_date = NULL
      WHERE order_id = ?
    `, [id]);

    await conn.query(`
      UPDATE PartnerOrders 
      SET status = 'cancelled',
          cancelled_at = NOW()
      WHERE id = ?
    `, [id]);

    await conn.commit();

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
      SELECT 
        id,
        rfid_tag,
        rfid_type,
        role,
        status,
        allocation_date
      FROM RegisteredRfid
      WHERE order_id = ?
      ORDER BY role, rfid_tag
    `, [id]);

    const grouped = rfids.reduce((acc, rfid) => {
      if (!acc[rfid.role]) acc[rfid.role] = [];
      acc[rfid.role].push(rfid);
      return acc;
    }, {});

    res.json({
      total: rfids.length,
      rfids: grouped
    });
  } catch (err) {
    console.error("Get allocated RFIDs error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;