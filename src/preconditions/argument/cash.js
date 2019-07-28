const { ArgumentPrecondition, PreconditionResult } = require('patron.js');
const number = require('../../utilities/number.js');
const db = require('../../services/database.js');
const to_cents = 100;

class Cash extends ArgumentPrecondition {
  constructor() {
    super({ name: 'cash' });
  }

  async run(cmd, msg, arg, args, value, options) {
    const cash = db.get_cash(msg.author.id, msg.channel.guild.id);
    const allow_zero = options && options.allow_zero === true && value === 0;
    const c_case = db.get_channel_case(msg.channel.id);
    const held = options && options.held && c_case;
    let has = cash;

    if (held && c_case.cost) {
      has = cash + (c_case.cost / to_cents);
    }

    if (has >= value || allow_zero) {
      return PreconditionResult.fromSuccess();
    }

    return PreconditionResult.fromError(cmd, `You do not have ${number.format(value)}. \
Your current balance${c_case && c_case.cost ? 'including held cash' : ''}: \
${number.format(has)}.`);
  }
}

module.exports = new Cash();
