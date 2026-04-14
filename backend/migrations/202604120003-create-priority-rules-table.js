"use strict";

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const sequelize = require("../config/database");
const { DataTypes } = require("sequelize");

async function up(queryInterface) {
  await queryInterface.createTable("priority_rules", {
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
      type: DataTypes.ENUM("SENDER", "DOMAIN", "SUBJECT"),
      allowNull: false
    },
    pattern: {
      type: DataTypes.STRING,
      allowNull: false
    },
    target_priority: {
      type: DataTypes.ENUM("LOW", "NORMAL", "IMPORTANT", "URGENT"),
      allowNull: false,
      defaultValue: "NORMAL"
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
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
  console.log("Migration applied: created priority_rules table");
}

async function down(queryInterface) {
  await queryInterface.dropTable("priority_rules");
  console.log("Rollback applied: dropped priority_rules table");
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
