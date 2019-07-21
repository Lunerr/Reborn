const { Postcondition } = require('patron.js');
const client = require('../services/client.js');
const db = require('../services/database.js');
const discord = require('../utilities/discord.js');
const str = require('../utilities/string.js');
const verdict = require('../enums/verdict.js');
const util = require('../utilities/util.js');

class InformJudge extends Postcondition {
  constructor() {
    super({ name: 'inform_judge' });
  }

  async run(msg, result) {
    if (result.success !== false) {
      const warrant = db.get_warrant(result.warrant_id);
      const judge = await client.getRESTUser(warrant.judge_id);
      let info = `${discord.tag(msg.author).boldified} has reached a verdict in case #${result.id}`;
      const case_verdict = db.get_verdict(result.id);
      const str_verdict = Object.keys(verdict).find(x => verdict[x] === case_verdict.verdict);

      info += `\n\n**Verdict:** ${str_verdict.split('_').map(str.to_uppercase).join(' ')}\n`;

      if (case_verdict.sentence !== null) {
        info += `**Sentence:** ${util.get_time(case_verdict.sentence)}\n`;
      }

      if (case_verdict.opinion) {
        info += `**Opinion:** ${case_verdict.opinion}\n`;
      }

      return discord.dm(judge, info, msg.channel.guild);
    }
  }
}

module.exports = new InformJudge();
