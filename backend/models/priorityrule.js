module.exports = (sequelize, DataTypes) => {
  const PriorityRule = sequelize.define("PriorityRule", {
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
    }
  }, {
    tableName: "priority_rules",
    timestamps: true
  });

  return PriorityRule;
};
