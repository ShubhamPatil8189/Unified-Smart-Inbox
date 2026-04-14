module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define("Notification", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    type: {
      type: DataTypes.STRING,
      defaultValue: "info" // success, warning, info, priority
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    email_id: {
      type: DataTypes.STRING, // Can be used for deep linking
      allowNull: true
    },
    read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: "notifications",
    timestamps: true
  });

  return Notification;
};
