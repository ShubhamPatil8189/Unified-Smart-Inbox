"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("email_actions", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      email_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: "emails",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      type: {
        type: Sequelize.ENUM("TASK", "EVENT"),
        allowNull: false
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      due_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      start_time: {
        type: Sequelize.DATE,
        allowNull: true
      },
      end_time: {
        type: Sequelize.DATE,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM("DETECTED", "CREATED", "FAILED"),
        defaultValue: "DETECTED"
      },
      external_id: {
        type: Sequelize.STRING,
        allowNull: true
      },
      provider: {
        type: Sequelize.STRING,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    await queryInterface.addIndex("email_actions", ["user_id"]);
    await queryInterface.addIndex("email_actions", ["email_id"]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("email_actions");
  }
};
