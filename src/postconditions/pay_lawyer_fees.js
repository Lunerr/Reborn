const { Postcondition } = require('patron.js');
const { config } = require('../services/data.js');
const client = require('../services/client.js');
const db = require('../services/database.js');
const handler = require('../services/handler.js');
const system = require('../utilities/system.js');
const discord = require('../utilities/discord.js');
const to_cents = 100;
const split = 2;

class PayLawyerFees extends Postcondition {
  constructor() {
    super({ name: 'pay_lawyer_fees' });
  }

  async run(msg, result) {
    if (result.success !== false) {
      const lawyer = db.get_lawyer(msg.channel.guild.id, result.lawyer_id);

      if (lawyer.rate === 0) {
        return;
      }

      const name = await handler.parseCommand(msg, config.prefix.length)
        .then(x => x.command.names[0]);

      if (name === 'guilty') {
        const def_cash = db.get_cash(result.defendant_id, msg.channel.guild.id, false);
        const user = await client.getRESTUser(result.defendant_id);

        return this.take_cash(result, user, msg.channel.guild, def_cash, lawyer.rate);
      }

      const half = lawyer.rate / split;
      const warrant = db.get_warrant(result.warrant_id);
      const judge = await client.getRESTUser(warrant.judge_id);
      const officer = await client.getRESTUser(warrant.officer_id);
      const judge_bal = db.get_cash(warrant.judge_id, msg.channel.guild.id, false);
      const officer_bal = db.get_cash(warrant.officer_id, msg.channel.guild.id, false);

      return this.take_cash(result, judge, msg.channel.guild, judge_bal, half)
        .then(() => this.take_cash(result, officer, msg.channel.guild, officer_bal, half));
    }
  }

  take_cash(c_case, user, guild, balance, rate) {
    const ending = `in case #${c_case.id}`;

    if (balance >= rate) {
      db.add_cash(c_case.defendant_id, guild.id, -rate, false);

      return system.dm_cash(user, guild, -rate / to_cents, `covering lawyer fees ${ending}`);
    }

    return discord.dm(user, `The government has paid for your lawyer fees in order to \
prevent you from going in debt ${ending}.`, guild);
  }
}

module.exports = new PayLawyerFees();
