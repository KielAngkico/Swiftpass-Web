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
  if (name.includes('partner') || name.includes('staff')) return 'partner_rfid';
  if (name.includes('member') || name.includes('wristband')) return 'member_rfid';
  if (name.includes('day pass') || name.includes('keyfob')) return 'daypass_rfid';
  return 'other'; // For PCBs, locks, buttons, etc.
};

// ========================================
// CREATE NEW ORDER (Partner)
// ========================================
router.post("/create", async (req, res) => {
  const conn = await db.promise().getConnection();
  try {
    await conn.beginTransaction();

    const { admin_id, items, payment_status, notes } = req.body;

    // Validate
    if (!admin_id || !items || items.length === 0) {
      await conn.rollback();
      return res.status(400).json({ error: "Admin ID and items are required" });
    }

    // Calculate total
    const total_amount = items.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_price);
    }, 0);

    const order_number = generateOrderNumber();

    // Create order
    const [orderResult] = await conn.query(`
      INSERT INTO PartnerOrders 
      (order_number, admin_id, order_type, total_amount, payment_status, notes, status)
      VALUES (?, ?, 'reorder', ?, ?, ?, 'pending')
    `, [order_number, admin_id, total_amount, payment_status || 'unpaid', notes || null]);

    const order_id = orderResult.insertId;

    // Create order items
    for (const item of items) {
      const subtotal = item.quantity * item.unit_price;
      await conn.query(`
        INSERT INTO PartnerOrderItems 
        (order_id, item_name, item_type, quantity, unit_price, subtotal, status)
        VALUES (?, ?, ?, ?, ?, ?, 'pending')
      `, [order_id, item.item_name, item.item_type, item.quantity, item.unit_price, subtotal]);
    }

    await conn.commit();

    res.status(201).json({
      message: "Order created successfully",
      order_id,
      order_number,
      total_amount
    });

  } catch (err) {
    await conn.rollback();
    console.error("Create order error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  } finally {
    conn.release();
  }
});

router.post("/create-initial", async (req, res) => {
  const conn = await db.promise().getConnection();
  try {
    await conn.beginTransaction();

    const { admin_id, package_id } = req.body;

    const [[pkg]] = await conn.query(
      `SELECT * FROM SubscriptionPackages WHERE id = ?`,
      [package_id]
    );

    if (!pkg) {
      await conn.rollback();
      return res.status(404).json({ error: "Package not found" });
    }

    const order_number = generateOrderNumber();

    // Get package items with CORRECTED pricing lookup
    const [packageItems] = await conn.query(`
      SELECT 
        pi.item_name, 
        pi.quantity,
        si.selling_price as unit_price
      FROM PackageItems pi
      INNER JOIN SuperAdminInventory si ON pi.item_name = si.name
      WHERE pi.package_id = ?
    `, [package_id]);

    if (packageItems.length === 0) {
      await conn.rollback();
      return res.status(400).json({ 
        error: "No items found for this package or inventory items don't match package items" 
      });
    }

    // Check for missing prices
    const missingPrices = packageItems.filter(item => !item.unit_price || item.unit_price === 0);
    if (missingPrices.length > 0) {
      await conn.rollback();
      return res.status(400).json({ 
        error: "Some items have no selling price set",
        items: missingPrices.map(i => i.item_name)
      });
    }

    const calculatedTotal = packageItems.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_price);
    }, 0);

    const [orderResult] = await conn.query(`
      INSERT INTO PartnerOrders 
      (order_number, admin_id, order_type, total_amount, payment_status, status)
      VALUES (?, ?, 'initial_package', ?, 'paid', 'pending')
    `, [order_number, admin_id, calculatedTotal]);

    const order_id = orderResult.insertId;

    for (const item of packageItems) {
      const subtotal = item.quantity * item.unit_price;
      const itemType = getItemType(item.item_name); // Auto-detect type
      
      await conn.query(`
        INSERT INTO PartnerOrderItems 
        (order_id, item_name, item_type, quantity, unit_price, subtotal, status)
        VALUES (?, ?, ?, ?, ?, ?, 'pending')
      `, [order_id, item.item_name, itemType, item.quantity, item.unit_price, subtotal]);
    }

    await conn.commit();

    res.status(201).json({
      message: "Initial order created successfully",
      order_id,
      order_number,
      package_name: pkg.name,
      total_amount: calculatedTotal,
      items: packageItems
    });

  } catch (err) {
    await conn.rollback();
    console.error("Create initial order error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  } finally {
    conn.release();
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
        po.completed_at
      FROM PartnerOrders po
      ${whereClause}
      ORDER BY po.order_date DESC
    `, params);

    // Get items for each order
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

      // Calculate completion percentage
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

// ========================================
// GET ALL ORDERS (For SuperAdmin)
// ========================================
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

    // Get items for each order
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

      // Calculate completion percentage
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

// ========================================
// GET SINGLE ORDER DETAILS
// ========================================
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [[order]] = await query(`
      SELECT 
        po.*,
        aa.gym_name,
        aa.admin_name,
        aa.email
      FROM PartnerOrders po
      JOIN AdminAccounts aa ON po.admin_id = aa.id
      WHERE po.id = ?
    `, [id]);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Get items
    const [items] = await query(`
      SELECT * FROM PartnerOrderItems WHERE order_id = ?
    `, [id]);
    order.items = items;

    res.json(order);
  } catch (err) {
    console.error("Get order details error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ========================================
// PROCESS ORDER (SuperAdmin) - Auto-allocate RFID + Deduct Inventory
// ========================================
router.put("/:id/process", async (req, res) => {
  const conn = await db.promise().getConnection();
  try {
    await conn.beginTransaction();

    const { id } = req.params;

    // Get order details
    const [[order]] = await conn.query(
      `SELECT * FROM PartnerOrders WHERE id = ? AND status = 'pending'`,
      [id]
    );

    if (!order) {
      await conn.rollback();
      return res.status(404).json({ error: "Order not found or already processed" });
    }

    // Get order items that need allocation
    const [orderItems] = await conn.query(
      `SELECT * FROM PartnerOrderItems WHERE order_id = ? AND status != 'fully_allocated'`,
      [id]
    );

    let allocationResults = [];
    let inventoryDeductions = [];

    for (const item of orderItems) {
      const remainingQty = item.quantity - item.allocated_quantity;
      
      if (remainingQty <= 0) continue;

      // --- HANDLE RFID ITEMS ---
      if (item.item_type.includes('rfid')) {
        // Determine RFID role based on item type
        let rfidRole = 'Member';
        if (item.item_type === 'partner_rfid') rfidRole = 'Partner';
        else if (item.item_type === 'daypass_rfid') rfidRole = 'DayPass';

        // Find available RFIDs from RegisteredRfid table
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

        // Update order item
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
      } 
      // --- HANDLE NON-RFID ITEMS (PCBs, locks, buttons, etc.) ---
      else {
        // Check inventory availability
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

        // Deduct from inventory
        await conn.query(`
          UPDATE SuperAdminInventory 
          SET quantity = quantity - ?,
              updated_at = NOW()
          WHERE id = ?
        `, [remainingQty, inventoryItem.id]);

        // Update order item
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

        inventoryDeductions.push({
          item: item.item_name,
          deducted: remainingQty,
          remaining: inventoryItem.quantity - remainingQty
        });
      }
    }

    // Update order status
    await conn.query(`
      UPDATE PartnerOrders 
      SET status = 'processing',
          processed_at = NOW()
      WHERE id = ?
    `, [id]);

    await conn.commit();

    res.json({
      message: "Order processed successfully",
      allocation_results: allocationResults,
      inventory_deductions: inventoryDeductions
    });

  } catch (err) {
    await conn.rollback();
    console.error("Process order error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  } finally {
    conn.release();
  }
});

// ========================================
// MARK AS DELIVERING (SuperAdmin)
// ========================================
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

// ========================================
// MARK AS COMPLETED (Partner)
// ========================================
router.put("/:id/complete", async (req, res) => {
  const conn = await db.promise().getConnection();
  try {
    await conn.beginTransaction();

    const { id } = req.params;

    // Update order status
    const [result] = await conn.query(`
      UPDATE PartnerOrders 
      SET status = 'completed',
          completed_at = NOW()
      WHERE id = ? AND status = 'delivering'
    `, [id]);

    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ error: "Order not found or not in delivering status" });
    }

    // Update allocated RFIDs to 'in_use'
    await conn.query(`
      UPDATE RegisteredRfid 
      SET status = 'in_use'
      WHERE order_id = ? AND status = 'allocated'
    `, [id]);

    await conn.commit();

    res.json({ message: "Order completed successfully" });
  } catch (err) {
    await conn.rollback();
    console.error("Complete order error:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    conn.release();
  }
});

// ========================================
// CANCEL ORDER
// ========================================
router.put("/:id/cancel", async (req, res) => {
  const conn = await db.promise().getConnection();
  try {
    await conn.beginTransaction();

    const { id } = req.params;

    // Get order
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

    // Get allocated items to restore inventory
    const [orderItems] = await conn.query(`
      SELECT item_name, item_type, allocated_quantity 
      FROM PartnerOrderItems 
      WHERE order_id = ? AND allocated_quantity > 0
    `, [id]);

    // Restore inventory for non-RFID items
    for (const item of orderItems) {
      if (!item.item_type.includes('rfid')) {
        await conn.query(`
          UPDATE SuperAdminInventory 
          SET quantity = quantity + ?,
              updated_at = NOW()
          WHERE name = ?
        `, [item.allocated_quantity, item.item_name]);
      }
    }

    // Release allocated RFIDs back to stock
    await conn.query(`
      UPDATE RegisteredRfid 
      SET status = 'in_stock',
          allocated_to_admin = NULL,
          order_id = NULL,
          allocation_date = NULL
      WHERE order_id = ?
    `, [id]);

    // Update order
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

// ========================================
// GET ALLOCATED RFIDs FOR ORDER
// ========================================
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

    // Group by role
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

// ========================================
// DEBUGGING ENDPOINT - Check inventory prices
// ========================================
router.get("/debug/inventory-prices", async (req, res) => {
  try {
    const [inventory] = await query(`
      SELECT id, name, quantity, purchase_price, selling_price 
      FROM SuperAdminInventory 
      ORDER BY name
    `);
    
    const [packageItems] = await query(`
      SELECT pi.*, sp.name as package_name
      FROM PackageItems pi
      JOIN SubscriptionPackages sp ON pi.package_id = sp.id
    `);

    res.json({
      inventory,
      packageItems,
      note: "Check if item names match exactly between PackageItems and SuperAdminInventory"
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;