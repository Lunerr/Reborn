/**
 * Reborn - The core control of the only truly free and fair discord server.
 * Copyright (C) 2019  John Boyer
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
'use strict';
const { Argument, Command, CommandResult } = require('patron.js');
const catch_discord = require('../../utilities/catch_discord.js');
const client = require('../../services/client.js');
const verdict = require('../../enums/verdict.js');
const db = require('../../services/database.js');
const discord = require('../../utilities/discord.js');
const number = require('../../utilities/number.js');
const addRole = catch_discord(client.addGuildMemberRole.bind(client));
const removeRole = catch_discord(client.removeGuildMemberRole.bind(client));
const half_hour = 18e5;
const repeat_felon_count = 3;

module.exports = new class Guilty extends Command {
  constructor() {
    super({
      preconditions: ['court_only', 'can_trial', 'can_imprison', 'judge_creator'],
      args: [
        new Argument({
          example: '"Criminal scum!"',
          key: 'opinion',
          name: 'opinion',
          type: 'string'
        }),
        new Argument({
          example: '5h',
          key: 'sentence',
          name: 'sentence',
          type: 'time'
        })
      ],
      description: 'Declares a guilty verdict in court.',
      groupName: 'courts',
      names: ['guilty']
    });
  }

  async run(msg, args) {
    const {
      channel_id, created_at, defendant_id, law_id, id: case_id
    } = db.get_channel_case(msg.channel.id);
    const defendant = msg.channel.guild.members.get(defendant_id);

    if (!channel_id || !defendant) {
      return;
    }

    const timeElapsed = Date.now() - created_at;
    const currrent_verdict = db.get_verdict(case_id);
    const finished = currrent_verdict && (currrent_verdict.verdict === verdict.guilty
      || currrent_verdict.verdict === verdict.innocent);

    if (timeElapsed < half_hour) {
      return CommandResult.fromError('A verdict can only be delivered 30 minutes \
after the case has started.');
    } else if (finished) {
      return CommandResult.fromError('This case has already reached a verdict.');
    }

    const prefix = `**${discord.tag(msg.author)}**, `;
    const verified = await discord.verify_msg(
      msg,
      `${prefix}**Warning:** Are you sure you want to deliver this verdict? Unjust verdicts will \
result in an impeachment. Type \`I'm sure\` if this is your final verdict.`
    );

    if (!verified) {
      return;
    }

    const { hours } = number.msToTime(args.sentence);
    const law = db.get_law(law_id);
    const repeated = await this.shouldMute({
      ids: {
        guild: msg.channel.guild.id, case: case_id, defendant: defendant_id
      },
      opinion: args.opinion, sentence: args.sentence, law
    });
    const ending = `${law.mandatory_felony || (!law.mandatory_felony && repeated) ? `sentenced to \
${hours} hours in prison${repeated ? ` for repeatedly breaking the law \`${law.name}\`` : ''}` : '\
charged with committing a misdemeanor'}.`;

    await discord.create_msg(
      msg.channel, `${prefix}${defendant.mention} has been found guilty and was ${ending}`
    );
  }

  async shouldMute({ ids, opinion, sentence, law }) {
    const update = {
      guild_id: ids.guild,
      case_id: ids.case,
      defendant_id: ids.defendant,
      verdict: verdict.guilty,
      opinion
    };
    let mute = false;

    if (!law.mandatory_felony) {
      const verdicts = db.fetch_verdicts(ids.guild, ids.defendant)
        .filter(x => x.verdict === verdict.guilty);
      let count = 1;

      for (let i = 0; i < verdicts.length; i++) {
        const user_case = db.get_case(verdicts[i].case_id);
        const { name } = db.get_law(user_case.law_id);

        if (name === law.name) {
          count++;
        }

        if (count >= repeat_felon_count) {
          mute = true;
          break;
        }
      }
    }

    const addSentence = law.mandatory_felony || (!law.mandatory_felony && mute);
    const { trial_role, imprisoned_role } = db.fetch('guilds', { guild_id: ids.guild });

    await removeRole(ids.guild, ids.defendant, trial_role);

    if (addSentence) {
      update.sentence = sentence;
      await addRole(ids.guild, ids.defendant, imprisoned_role);
    }

    db.insert('verdicts', update);

    return mute;
  }
}();
