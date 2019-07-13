const { Postcondition } = require('patron.js');
const { config } = require('../services/data.js');
const db = require('../services/database.js');
const system = require('../utilities/system.js');

class CaseFinished extends Postcondition {
  constructor() {
    super({ name: 'case_finished' });
  }

  run(msg, result) {
    if (result.success !== false) {
      db.add_cash(msg.author.id, msg.channel.guild.id, config.judge_case);

      return system.dm_cash(
        msg.author,
        msg.channel.guild,
        config.judge_case,
        `finishing case #${result.id}`
      );
    }
  }
}

module.exports = new CaseFinished();
