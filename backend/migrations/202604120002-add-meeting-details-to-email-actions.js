'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('email_actions', 'location', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('email_actions', 'attendees', {
      type: Sequelize.TEXT, // Using TEXT to store stringified array or raw names
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('email_actions', 'location');
    await queryInterface.removeColumn('email_actions', 'attendees');
  }
};
