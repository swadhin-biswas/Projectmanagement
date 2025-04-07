import { Team } from '../models/Team.js';
import logger from '../utils/logger.js';
import { deleteFile } from './fileUploadService.js';

// Configuration for message retention
const MESSAGE_RETENTION = {
  regular: 30 * 24 * 60 * 60 * 1000, // 30 days
  announcement: 90 * 24 * 60 * 60 * 1000, // 90 days
  attachment: 60 * 24 * 60 * 60 * 1000 // 60 days
};

export const cleanupExpiredContent = async () => {
  try {
    const now = new Date();
    const teamsWithMessages = await Team.find({
      'chatMessages.0': { $exists: true }
    });

    for (const team of teamsWithMessages) {
      const expiredMessages = team.chatMessages.filter(message => {
        const messageAge = now - new Date(message.timestamp);
        const retentionPeriod = message.isAnnouncement
          ? MESSAGE_RETENTION.announcement
          : MESSAGE_RETENTION.regular;

        return messageAge > retentionPeriod;
      });

      if (expiredMessages.length > 0) {
        // Delete attachments from storage
        for (const message of expiredMessages) {
          if (message.attachments?.length > 0) {
            try {
              await Promise.all(
                message.attachments.map(attachment =>
                  deleteFile(attachment.url)
                )
              );
            } catch (error) {
              logger.error('Error deleting attachments:', error);
            }
          }
        }

        // Remove expired messages from database
        await Team.updateOne(
          { _id: team._id },
          {
            $pull: {
              chatMessages: {
                _id: { $in: expiredMessages.map(m => m._id) }
              }
            }
          }
        );

        logger.info(
          `Cleaned up ${expiredMessages.length} expired messages from team ${team._id}`
        );
      }
    }

    // Clean up orphaned attachments
    const teamsWithAttachments = await Team.find({
      'chatMessages.attachments.0': { $exists: true }
    });

    for (const team of teamsWithAttachments) {
      const orphanedAttachments = team.chatMessages
        .filter(message => message.attachments?.length > 0)
        .flatMap(message => {
          const messageAge = now - new Date(message.timestamp);
          return messageAge > MESSAGE_RETENTION.attachment
            ? message.attachments
            : [];
        });

      if (orphanedAttachments.length > 0) {
        try {
          await Promise.all(
            orphanedAttachments.map(attachment =>
              deleteFile(attachment.url)
            )
          );

          // Update messages to remove attachment references
          await Team.updateMany(
            { _id: team._id },
            {
              $pull: {
                'chatMessages.$[].attachments': {
                  url: { $in: orphanedAttachments.map(a => a.url) }
                }
              }
            }
          );

          logger.info(
            `Cleaned up ${orphanedAttachments.length} orphaned attachments from team ${team._id}`
          );
        } catch (error) {
          logger.error('Error cleaning up orphaned attachments:', error);
        }
      }
    }
  } catch (error) {
    logger.error('Error in cleanup service:', error);
  }
};

// Schedule cleanup to run daily at midnight
export const scheduleCleanup = () => {
  const now = new Date();
  const tomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1
  );
  const timeUntilMidnight = tomorrow - now;

  // Run initial cleanup
  cleanupExpiredContent();

  // Schedule subsequent cleanups
  setInterval(cleanupExpiredContent, 24 * 60 * 60 * 1000);

  // Align first interval with midnight
  setTimeout(() => {
    cleanupExpiredContent();
    setInterval(cleanupExpiredContent, 24 * 60 * 60 * 1000);
  }, timeUntilMidnight);
};