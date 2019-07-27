const { ArgumentPrecondition, PreconditionResult } = require('patron.js');
const number = require('../../utilities/number.js');
const db = require('../../services/database.js');

class Cash extends ArgumentPrecondition {
  constructor() {
    super({ name: 'cash' });
  }

  async run(cmd, msg, arg, args, value, options) {
    const cash = db.get_cash(msg.author.id, msg.channel.guild.id);
    const allow_zero = options && options.allow_zero === true && value === 0;

    if (cash >= value || allow_zero) {
      return PreconditionResult.fromSuccess();
    }

    return PreconditionResult.fromError(cmd, `You do not have ${number.format(value)}. \
Your current balance: ${number.format(cash)}.`);
  }
}

module.exports = new Cash();
