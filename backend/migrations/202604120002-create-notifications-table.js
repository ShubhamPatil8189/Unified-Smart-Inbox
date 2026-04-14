"use strict";

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const sequelize = require("../config/database");
const { DataTypes } = require("sequelize");

async function up(queryInterface) {
  await queryInterface.createTable("notifications", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id"
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE"
    },
    type: {
      type: DataTypes.STRING,
      defaultValue: "info"
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
      type: DataTypes.STRING,
      allowNull: true
    },
    read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE
    },
    updatedAt: {
      allowNull: false,
      type: DataTypes.DATE
    }
  });
  console.log("Migration applied: created notifications table");
}

async function down(queryInterface) {
  await queryInterface.dropTable("notifications");
  console.log("Rollback applied: dropped notifications table");
}

module.exports = { up, down };

if (require.main === module) {
  (async () => {
    const queryInterface = sequelize.getQueryInterface();
    try {
      await sequelize.authenticate();
      await up(queryInterface);
      console.log("Migration completed successfully.");
      process.exit(0);
    } catch (error) {
      console.error("Migration failed:", error.message);
      process.exit(1);
    }
  })();
}
