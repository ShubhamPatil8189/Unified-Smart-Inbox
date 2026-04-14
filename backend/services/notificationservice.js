const { Notification } = require("../models");

const notificationService = {
  async createNotification(data) {
    try {
      return await Notification.create({
        user_id: data.userId,
        type: data.type || "info",
        title: data.title,
        message: data.message,
        email_id: data.emailId || null,
        read: false
      });
    } catch (error) {
      console.error("[notificationService.createNotification] Error:", error.message);
      throw error;
    }
  },

  async getNotificationsForUser(userId) {
    try {
      return await Notification.findAll({
        where: { user_id: userId },
        order: [["createdAt", "DESC"]]
      });
    } catch (error) {
      console.error("[notificationService.getNotificationsForUser] Error:", error.message);
      throw error;
    }
  },

  async markAsRead(notificationId) {
    try {
      return await Notification.update(
        { read: true },
        { where: { id: notificationId } }
      );
    } catch (error) {
      console.error("[notificationService.markAsRead] Error:", error.message);
      throw error;
    }
  },

  async markAllAsRead(userId) {
    try {
      return await Notification.update(
        { read: true },
        { where: { user_id: userId, read: false } }
      );
    } catch (error) {
      console.error("[notificationService.markAllAsRead] Error:", error.message);
      throw error;
    }
  },

  async deleteNotification(notificationId) {
    try {
      return await Notification.destroy({
        where: { id: notificationId }
      });
    } catch (error) {
      console.error("[notificationService.deleteNotification] Error:", error.message);
      throw error;
    }
  }
};

module.exports = notificationService;
