const sequelize = require("../config/database");
const { DataTypes } = require("sequelize");

const User = require("./user")(sequelize, DataTypes);
const Email = require("./mail")(sequelize, DataTypes);
const Label = require("./label")(sequelize, DataTypes);
const EmailLabel = require("./emaillabel")(sequelize, DataTypes);
const EmailPriority = require("./emailpriority")(sequelize, DataTypes);
const EmailProcessingLog = require("./emailprocessinglog")(sequelize, DataTypes);
const Notification = require("./notification")(sequelize, DataTypes);
const PriorityRule = require("./priorityrule")(sequelize, DataTypes);
const EmailAction = require("./emailaction")(sequelize, DataTypes);

/* Associations */

User.hasMany(Email, { foreignKey: "user_id" });
Email.belongsTo(User, { foreignKey: "user_id" });

User.hasMany(Notification, { foreignKey: "user_id" });
Notification.belongsTo(User, { foreignKey: "user_id" });

User.hasMany(PriorityRule, { foreignKey: "user_id" });
PriorityRule.belongsTo(User, { foreignKey: "user_id" });

User.hasMany(EmailAction, { foreignKey: "user_id" });
EmailAction.belongsTo(User, { foreignKey: "user_id" });

Email.hasOne(EmailAction, { foreignKey: "email_id" });
EmailAction.belongsTo(Email, { foreignKey: "email_id" });

Email.belongsToMany(Label, {
  through: EmailLabel,
  foreignKey: "email_id"
});

Label.belongsToMany(Email, {
  through: EmailLabel,
  foreignKey: "label_id"
});

Email.hasOne(EmailPriority, { foreignKey: "email_id" });
EmailPriority.belongsTo(Email, { foreignKey: "email_id" });

Email.hasMany(EmailProcessingLog, { foreignKey: "email_id" });

module.exports = {
  sequelize,
  User,
  Email,
  Label,
  EmailLabel,
  EmailPriority,
  EmailProcessingLog,
  Notification,
  PriorityRule,
  EmailAction
};