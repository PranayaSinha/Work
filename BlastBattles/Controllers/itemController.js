import { 
    createItem, 
    updateItemVerification, 
    flagItem, 
    unflagItem, 
    findItemById, 
    findItemsByOwner 
} from "../itemModel/itemModel.js";

export const createItemHandler = async (req, reply) => {
    try {
        const item = req.body;
        const itemId = await createItem(item);
        reply.send({ success: true, itemId });
    } catch (err) {
        console.error(err);
        reply.status(500).send({ success: false, message: "Error creating item" });
    }
};

export const updateItemVerificationHandler = async (req, reply) => {
    try {
        const itemId = req.params.id;
        const { isVerified } = req.body;
        const updatedItem = await updateItemVerification(itemId, isVerified);
        reply.send({ success: true, updatedItem });
    } catch (err) {
        console.error(err);
        reply.status(500).send({ success: false, message: "Error verifying item" });
    }
};

export const flagItemHandler = async (req, reply) => {
    try {
        const itemId = req.params.id;
        const { canTrade } = req.body;
        const flaggedItem = await flagItem(itemId, canTrade);
        reply.send({ success: true, flaggedItem });
    } catch (err) {
        console.error(err);
        reply.status(500).send({ success: false, message: "Error flagging item" });
    }
};

export const unflagItemHandler = async (req, reply) => {
    try {
        const itemId = req.params.id;
        const unflaggedItem = await unflagItem(itemId);
        reply.send({ success: true, unflaggedItem });
    } catch (err) {
        console.error(err);
        reply.status(500).send({ success: false, message: "Error unflagging item" });
    }
};

export const findItemByIdHandler = async (req, reply) => {
    try {
        const itemId = req.params.id;
        const item = await findItemById(itemId);
        if (!item) {
            reply.status(404).send({ success: false, message: "Item not found" });
        } else {
            reply.send({ success: true, item });
        }
    } catch (err) {
        console.error(err);
        reply.status(500).send({ success: false, message: "Error retrieving item" });
    }
};

export const findItemsByOwnerHandler = async (req, reply) => {
    try {
        const ownerId = req.params.ownerId;
        const items = await findItemsByOwner(ownerId);
        reply.send({ success: true, items });
    } catch (err) {
        console.error(err);
        reply.status(500).send({ success: false, message: "Error retrieving items by owner" });
    }
};
