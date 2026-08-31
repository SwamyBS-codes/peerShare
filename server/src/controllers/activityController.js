const prisma = require('../services/prisma');

/**
 * Get unified activity logs (messages, calls, files) between two users.
 */
async function getActivities(req, res) {
  try {
    const myId = req.user.id;
    const { friendId } = req.query;

    if (!friendId) {
      return res.status(400).json({ ok: false, message: 'Friend ID is required.' });
    }

    const logs = await prisma.activity.findMany({
      where: {
        OR: [
          { senderId: myId, receiverId: friendId },
          { senderId: friendId, receiverId: myId }
        ]
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    res.json({ ok: true, logs });
  } catch (error) {
    console.error('[ACTIVITIES] Get Activities Error:', error);
    res.status(500).json({ ok: false, message: 'Failed to retrieve interaction logs.' });
  }
}

/**
 * Log a new activity (text message, completed file transfer, finished call).
 */
async function createActivity(req, res) {
  try {
    const myId = req.user.id;
    const { receiverId, type, content, metadata } = req.body;

    if (!receiverId || !type) {
      return res.status(400).json({ ok: false, message: 'Receiver ID and Type are required.' });
    }

    if (!['text', 'file', 'call', 'video-call', 'call-invite', 'file-invite'].includes(type)) {
      return res.status(400).json({ ok: false, message: 'Invalid activity type.' });
    }

    // Verify receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId }
    });
    if (!receiver) {
      return res.status(404).json({ ok: false, message: 'Receiver not found.' });
    }

    const log = await prisma.activity.create({
      data: {
        senderId: myId,
        receiverId,
        type,
        content: content || null,
        metadata: metadata || {}
      }
    });

    res.json({ ok: true, log });
  } catch (error) {
    console.error('[ACTIVITIES] Create Activity Error:', error);
    res.status(500).json({ ok: false, message: 'Failed to log activity.' });
  }
}

/**
 * Update an existing activity (e.g. mark file-invite as completed)
 */
async function updateActivity(req, res) {
  try {
    const { id } = req.params;
    const { type, content, metadata } = req.body;

    const existingLog = await prisma.activity.findUnique({
      where: { id }
    });

    if (!existingLog) {
      return res.status(404).json({ ok: false, message: 'Activity not found.' });
    }

    const updatedLog = await prisma.activity.update({
      where: { id },
      data: {
        type: type || existingLog.type,
        content: content !== undefined ? content : existingLog.content,
        metadata: metadata ? { ...existingLog.metadata, ...metadata } : existingLog.metadata
      }
    });

    res.json({ ok: true, log: updatedLog });
  } catch (error) {
    console.error('[ACTIVITIES] Update Activity Error:', error);
    res.status(500).json({ ok: false, message: 'Failed to update activity.' });
  }
}

module.exports = {
  getActivities,
  createActivity,
  updateActivity,
};
