const { Postcondition } = require('patron.js');
const { config } = require('../services/data.js');
const client = require('../services/client.js');
const db = require('../services/database.js');
const handler = require('../services/handler.js');
const system = require('../utilities/system.js');
const number = require('../utilities/number.js');
const verdict = require('../enums/verdict.js');
const lawyer_plea = require('../enums/lawyer.js');
const to_cents = 100;
const split = 2;

class PayLawyerFees extends Postcondition {
  constructor() {
    super({ name: 'pay_lawyer_fees' });
  }

  async run(msg, result) {
    if (result.success !== false) {
      if (result.lawyer_id === result.defendant_id) {
        return;
      }

      const held = result.cost;
      const warrant = db.get_warrant(result.warrant_id);
      const judge = await client.getRESTUser(warrant.judge_id);
      const officer = await client.getRESTUser(result.plaintiff_id);
      const def = await client.getRESTUser(result.defendant_id);
      const name = await handler.get_cmd_name(msg);
      const grant = warrant.request === 0;

      if (name !== 'guilty') {
        db.add_cash(result.defendant_id, result.guild_id, held, false);
        await system.dm_cash(
          def,
          msg.channel.guild,
          held / to_cents,
          `case #${result.id} has reached a not guilty verdict. The legal fees have been billed \
to the ${grant ? 'granting' : 'approving'} judge (${judge.mention}) and the \
${grant ? 'arresting' : 'detaining'} officer (${officer.mention})`,
          'been given your',
          'back because'
        );
      }

      const lawyer = db.get_lawyer(msg.channel.guild.id, result.lawyer_id);
      const lawyer_user = await client.getRESTUser(lawyer.member_id);

      if (name === 'guilty') {
        return this.guilty(result, msg.channel.guild, def, lawyer_user);
      }

      const bonus = held * (1 + config.lawyer_innocence_bonus);
      const half = bonus / split;
      const judge_bal = db.get_cash(warrant.judge_id, msg.channel.guild.id, false);
      const officer_bal = db.get_cash(warrant.officer_id, msg.channel.guild.id, false);

      return this.take_cash(
        result, judge, msg.channel.guild, judge_bal, half, lawyer_user, true
      ).then(() => this.take_cash(
        result, officer, msg.channel.guild, officer_bal, half, lawyer_user, true
      ));
    }
  }

  async guilty(c_case, guild, defendant, lawyer_user) {
    const { cost } = c_case;

    if (c_case.request === lawyer_plea.auto) {
      return this.take_cash(c_case, defendant, guild, -1, cost, lawyer_user);
    }

    return this.take_cash(c_case, defendant, guild, cost, cost, lawyer_user);
  }

  async take_cash(c_case, user, guild, balance, rate, lawyer, allow_debt = false) {
    const case_verdict = db.get_verdict(c_case.id);
    const guilty = case_verdict.verdict === verdict.guilty;
    const case_result = guilty ? 'guilty' : 'not guilty';
    const ending = `in case #${c_case.id} as the accused was found to be ${case_result}`;

    db.add_cash(lawyer.id, guild.id, rate, false);
    await system.dm_cash(
      lawyer, guild, rate / to_cents, `being the lawyer ${ending}`, null, `from ${user.mention} for`
    );

    const action = 'been billed';
    let reason = `legal fees ${ending}`;

    if (balance >= rate || allow_debt) {
      reason += ` and you have failed to successfully \
${user.id === c_case.plaintiff_id ? 'arrest' : 'grant a warrant for'} the defendant`;
      db.add_cash(user.id, guild.id, -rate, false);

      return system.dm_cash(user, guild, -rate / to_cents, reason, action, 'in');
    }

    const paid_for = rate - balance;

    reason += `. The government has covered ${number.format(paid_for, true)} of your legal fees to \
protect ${guilty ? 'your' : 'the defendant\'s'} right of having an attorney`;
    db.add_cash(user.id, guild.id, -(rate - paid_for), false);

    return system.dm_cash(user, guild, -(rate - paid_for) / to_cents, reason, action, 'in');
  }
}

module.exports = new PayLawyerFees();
