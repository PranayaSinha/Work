import pool from '../../../config/db.js';

/**
 * Create a new item instance in the database
 * @param {Object} item - The item details to insert
 * @returns {number} - The ID of the created item
 */
export const createItem = async (item) => {
    const client = await pool.connect();
    try {
        const query = `
            INSERT INTO item_instances (type, owner_id, in_market, created_at, updated_at, 
                                        origin_lootbox_id, flagged, flagged_at, unflagged_at, 
                                        can_trade, pending, verified_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id;
        `;
        const values = [
            item.type,
            item.owner_id,
            item.in_market || false,
            item.created_at || new Date(),
            item.updated_at || new Date(),
            item.origin_lootbox_id || null,
            item.flagged || false,
            item.flagged_at || null,
            item.unflagged_at || null,
            item.can_trade || false,
            item.pending || true,
            item.verified_at || null,
        ];
        const res = await client.query(query, values);
        return res.rows[0].id;
    } catch (err) {
        console.error('Error creating item', err);
        throw err;
    } finally {
        client.release();
    }
};

/**
 * Update the verification status of an item
 * @param {number} itemId - The ID of the item to update
 * @param {boolean} isVerified - Whether the item is verified
 * @returns {Object} - The updated item
 */
export const updateItemVerification = async (itemId, isVerified) => {
    const client = await pool.connect();
    try {
        const query = `
            UPDATE item_instances
            SET pending = $1, verified_at = $2, updated_at = $3
            WHERE id = $4
            RETURNING *;
        `;
        const values = [!isVerified, isVerified ? new Date() : null, new Date(), itemId];
        const res = await client.query(query, values);
        return res.rows[0];
    } catch (err) {
        console.error('Error updating item verification', err);
        throw err;
    } finally {
        client.release();
    }
};

/**
 * Flag an item
 * @param {number} itemId - The ID of the item to flag
 * @param {boolean} canTrade - Whether the flagged item can still be traded
 * @returns {Object} - The updated item
 */
export const flagItem = async (itemId, canTrade = false) => {
    const client = await pool.connect();
    try {
        const query = `
            UPDATE item_instances
            SET flagged = true, flagged_at = $1, can_trade = $2, updated_at = $3
            WHERE id = $4
            RETURNING *;
        `;
        const values = [new Date(), canTrade, new Date(), itemId];
        const res = await client.query(query, values);
        return res.rows[0];
    } catch (err) {
        console.error('Error flagging item', err);
        throw err;
    } finally {
        client.release();
    }
};

/**
 * Unflag an item
 * @param {number} itemId - The ID of the item to unflag
 * @returns {Object} - The updated item
 */
export const unflagItem = async (itemId) => {
    const client = await pool.connect();
    try {
        const query = `
            UPDATE item_instances
            SET flagged = false, unflagged_at = $1, updated_at = $2
            WHERE id = $3
            RETURNING *;
        `;
        const values = [new Date(), new Date(), itemId];
        const res = await client.query(query, values);
        return res.rows[0];
    } catch (err) {
        console.error('Error unflagging item', err);
        throw err;
    } finally {
        client.release();
    }
};

/**
 * Find an item by ID
 * @param {number} itemId - The ID of the item to find
 * @returns {Object} - The item details
 */
export const findItemById = async (itemId) => {
    const client = await pool.connect();
    try {
        const query = `SELECT * FROM item_instances WHERE id = $1`;
        const res = await client.query(query, [itemId]);
        return res.rows[0];
    } catch (err) {
        console.error('Error finding item by ID', err);
        throw err;
    } finally {
        client.release();
    }
};

/**
 * Find all items owned by a player
 * @param {number} ownerId - The ID of the owner
 * @returns {Array<Object>} - A list of items owned by the player
 */
export const findItemsByOwner = async (ownerId) => {
    const client = await pool.connect();
    try {
        const query = `SELECT * FROM item_instances WHERE owner_id = $1`;
        const res = await client.query(query, [ownerId]);
        return res.rows;
    } catch (err) {
        console.error('Error finding items by owner', err);
        throw err;
    } finally {
        client.release();
    }
};