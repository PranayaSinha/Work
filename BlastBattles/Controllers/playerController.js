import { updatePlayerEquippedCosmetics } from "../services/playerServices.js"

export const equipPlayerCosmetics = async (request, reply) => {
  try {
    const { cosmetics } = request.body;
    const playerId = request.user.id;
    let playerEquippedCosmetics;

    if (!playerId) {
      return reply.code(400).send({ error: "Invalid or empty Player Id" });
    }

    if (!Array.isArray(cosmetics) || cosmetics.length === 0) {
      return reply.code(400).send({ error: "Invalid or empty equipped player cosmetics" });
    }

    playerEquippedCosmetics = await updatePlayerEquippedCosmetics(playerId, cosmetics);

    return reply.code(201).send({ playerEquippedCosmetics });

  } catch (err) {
    return reply.code(500).send({ error: err.message })
  }
};