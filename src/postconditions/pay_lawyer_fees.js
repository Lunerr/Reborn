const { Postcondition } = require('patron.js');
const { config } = require('../services/data.js');
const client = require('../services/client.js');
const db = require('../services/database.js');
const handler = require('../services/handler.js');
const system = require('../utilities/system.js');
const number = require('../utilities/number.js');
const verdict = require('../enums/verdict.js');
const to_cents = 100;
const split = 2;

class PayLawyerFees extends Postcondition {
  constructor() {
    super({ name: 'pay_lawyer_fees' });
  }

  async run(msg, result) {
    if (result.success !== false) {
      if (!result.lawyer_id) {
        return;
      }

      const lawyer = db.get_lawyer(msg.channel.guild.id, result.lawyer_id);

      if (lawyer.rate === 0) {
        return;
      }

      const name = await handler.parseCommand(msg, config.prefix.length)
        .then(x => x.command.names[0]);
      const lawyer_user = await client.getRESTUser(lawyer.member_id);

      if (name === 'guilty') {
        const def_cash = db.get_cash(result.defendant_id, msg.channel.guild.id, false);
        const user = await client.getRESTUser(result.defendant_id);

        return this.take_cash(result, user, msg.channel.guild, def_cash, lawyer.rate, lawyer_user);
      }

      const half = lawyer.rate / split;
      const warrant = db.get_warrant(result.warrant_id);
      const judge = await client.getRESTUser(warrant.judge_id);
      const officer = await client.getRESTUser(warrant.officer_id);
      const judge_bal = db.get_cash(warrant.judge_id, msg.channel.guild.id, false);
      const officer_bal = db.get_cash(warrant.officer_id, msg.channel.guild.id, false);

      return this.take_cash(
        result, judge, msg.channel.guild, judge_bal, half, lawyer_user
      ).then(() => this.take_cash(
        result, officer, msg.channel.guild, officer_bal, half, lawyer_user
      ));
    }
  }

  async take_cash(c_case, user, guild, balance, rate, lawyer) {
    db.add_cash(lawyer.id, guild.id, rate, false);
    await system.dm_cash(lawyer, guild, rate, `being the lawyer case #${c_case.id}`);

    const case_verdict = db.get_verdict(c_case.id);
    const case_result = case_verdict.verdict === verdict.guilty ? 'guilty' : 'not guilty';
    const ending = `in case #${c_case.id} as the accused was found to be ${case_result}`;
    const action = 'been billed';
    let reason = `legal fees ${ending}`;

    if (balance >= rate) {
      db.add_cash(c_case.defendant_id, guild.id, -rate, false);

      return system.dm_cash(user, guild, -rate / to_cents, reason, action, 'in');
    }

    const paid_for = rate - balance;

    reason += `. The government has covered ${number.format(paid_for, true)} of your legal \
fees to protect your right of having an attorney`;
    db.add_cash(c_case.defendant_id, guild.id, -(rate - paid_for), false);

    return system.dm_cash(user, guild, -(rate - paid_for) / to_cents, reason, action, 'in');
  }
}

module.exports = new PayLawyerFees();
