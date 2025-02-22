import { knexInstance } from '../../../../../db/knex.js'

export const getItemCosmeticDefinitions = async (itemIds) => {
  try {
    let query = knexInstance("body_cosmetic_definitions as bcd")
      .join("body_cosmetic_instances as bci", "bcd.definition_id", "bci.definition_id")
      .select(
        "bci.instance_id as id",
        "bcd.part",
        "bcd.definition_id",
        "bci.item_id",
        "bci.shimmer",
        "bci.special_effects"
      );

    // Apply filtering by itemIds if provided
    if (itemIds) {
      query = query.whereIn("bci.instance_id", itemIds);
    }

    const res = await query;
    return res; // Return all relevant cosmetic data
  } catch (err) {
    console.error("Error fetching cosmetic definitions:", err);
    throw err;
  }
};

export const getPlayerItemInstances = async (playerId, itemIds = undefined) => {
  try {
    // Base query to fetch owned cosmetic IDs
    let query = knexInstance("item_instances")
      .where({ owner_id: playerId, type: "body_cosmetic" })
      .select("id");

    // If itemIds are provided, add an IN clause to filter
    if (itemIds) {
      query = query.whereIn("id", itemIds);
    }

    // Execute the query and return the result
    const res = await query;
    return res.map(row => row.id); // Return an array of owned cosmetic IDs
  } catch (err) {
    console.error("Error fetching player-owned cosmetic IDs:", err);
    throw err;
  }
};

export const insertPlayerEquippedCosmeticsRow = async (playerId) => {
  try {
    const res = await knexInstance('equipped_cosmetics')
      .insert({
        player_id: playerId,
        head_cosmetic_id: null,
        torso_cosmetic_id: null,
        legs_cosmetic_id: null,
        feet_cosmetic_id: null,
        hands_cosmetic_id: null,
        accessory1_cosmetic_id: null,
        accessory2_cosmetic_id: null
      })
      .returning('*')
    console.log(`Cosmetics initialized for player ID: ${res[0].player_id}`);
  } catch (err) {
    console.error('Error during cosmetics initialization', err);
    throw err;
  }
};

export const setPlayerEquippedCosmetics = async (playerId, cosmetics) => {
  try {
    const partMapping = {
      head: 'head_cosmetic_id',
      chest: 'torso_cosmetic_id',
      legs: 'legs_cosmetic_id',
      feet: 'feet_cosmetic_id',
      hands: 'hands_cosmetic_id',
      accessory1: 'accessory1_cosmetic_id',
      accessory2: 'accessory2_cosmetic_id'
    };

    const updateData = cosmetics.reduce((acc, cosmetic) => {
      const dbField = partMapping[cosmetic.part];
      if (dbField) {
        acc[dbField] = cosmetic.itemId;
      }
      return acc;
    }, {});

    const result = await knexInstance('equipped_cosmetics')
      .where({ player_id: playerId })
      .update(updateData)
      .returning('*');

    return result;
  } catch (err) {
    console.error('Error updating equipped cosmetics:', err);
    throw err;
  }
};