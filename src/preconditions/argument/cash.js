const { ArgumentPrecondition, PreconditionResult } = require('patron.js');
const number = require('../../utilities/number.js');
const db = require('../../services/database.js');

class Cash extends ArgumentPrecondition {
  constructor() {
    super({ name: 'cash' });
  }

  async run(cmd, msg, arg, args, value) {
    const cash = db.get_cash(msg.author.id, msg.channel.guild.id);

    if (cash >= value) {
      return PreconditionResult.fromSuccess();
    }

    return PreconditionResult.fromError(cmd, `You do not have ${number.format(value)}. \
Your current balance: ${number.format(cash)}.`);
  }
}

module.exports = new Cash();
