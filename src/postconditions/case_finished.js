const { Postcondition } = require('patron.js');
const { config } = require('../services/data.js');
const client = require('../services/client.js');
const db = require('../services/database.js');
const handler = require('../services/handler.js');
const system = require('../utilities/system.js');
const verdict = require('../enums/verdict.js');
const ignore = ['mistrial'];

class CaseFinished extends Postcondition {
  constructor() {
    super({ name: 'case_finished' });
  }

  async run(msg, result) {
    if (result.success !== false) {
      const res = await handler.parseCommand(msg, config.prefix.length);

      if (!res.success) {
        return;
      }

      const [name] = res.command.names;

      if (ignore.includes(name)) {
        return;
      }

      const bonus = name === 'guilty' ? 1 : 1 + config.innocence_bias;
      const amount = config.judge_case * bonus;

      db.add_cash(msg.author.id, msg.channel.guild.id, amount);
      await system.dm_cash(
        msg.author, msg.channel.guild, amount, `finishing case #${result.id}`
      );

      const case_verdict = db.get_verdict(result.id);
      const warrant = db.get_warrant(result.warrant_id);

      return this.reward(result, case_verdict, warrant);
    }
  }

  async reward(c_case, case_verdict, warrant) {
    const judge = await client.getRESTUser(warrant.judge_id);
    const officer = await client.getRESTUser(c_case.plaintiff_id);
    const guild = client.guilds.get(c_case.guild_id);
    const guilty = case_verdict.verdict === verdict.guilty;
    const grant_amount = guilty ? config.guilty_granted_warrant : config.not_guilty_granted_warrant;
    const arrest_amount = guilty ? config.guilty_arrest : config.not_guilty_arrest;
    const result = guilty ? 'guilty' : 'not guilty';
    const is_detainment = warrant.request === 1;

    db.add_cash(judge.id, guild.id, grant_amount);
    db.add_cash(officer.id, guild.id, arrest_amount);
    await system.dm_cash(
      judge,
      guild,
      grant_amount,
      `${is_detainment ? 'approving' : 'granting'} warrant #${warrant.id}, \
which led to a ${result} verdict`
    );
    await system.dm_cash(
      officer,
      guild,
      arrest_amount,
      `${is_detainment ? 'detaining' : 'arresting'} the defendant in warrant #${warrant.id}, \
which led to a ${result} verdict.`
    );
  }
}

module.exports = new CaseFinished();
