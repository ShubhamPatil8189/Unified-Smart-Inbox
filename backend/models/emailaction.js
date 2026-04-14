module.exports = (sequelize, DataTypes) => {
  const EmailAction = sequelize.define("EmailAction", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    email_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM("TASK", "EVENT"),
      allowNull: false
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    due_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    start_time: {
      type: DataTypes.DATE,
      allowNull: true
    },
    end_time: {
      type: DataTypes.DATE,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM("DETECTED", "CREATED", "FAILED"),
      defaultValue: "DETECTED"
    },
    external_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true
    },
    attendees: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    provider: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: "email_actions",
    timestamps: true
  });

  return EmailAction;
};
