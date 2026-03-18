const db = require('../db');

const logActivity = async (userId, actionType, description, entityType = null, entityId = null) => {
  try {
    await db.query(
      'INSERT INTO activity_logs (user_id, action_type, description, entity_type, entity_id) VALUES ($1, $2, $3, $4, $5)',
      [userId, actionType, description, entityType, entityId]
    );
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
};

module.exports = logActivity;
