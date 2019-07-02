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
const { Argument, Command, CommandResult, MultiMutex } = require('patron.js');
const catch_discord = require('../../utilities/catch_discord.js');
const client = require('../../services/client.js');
const verdict = require('../../enums/verdict.js');
const db = require('../../services/database.js');
const discord = require('../../utilities/discord.js');
const number = require('../../utilities/number.js');
const system = require('../../utilities/system.js');
const add_role = catch_discord(client.addGuildMemberRole.bind(client));
const remove_role = catch_discord(client.removeGuildMemberRole.bind(client));
const empty_argument = Symbol('Empty Argument');
const hours_per_day = 24;
const content = `Rendering a guilty verdict when there remains a reasonable doubt will result in \
impeachment and **national disgrace**.

If you have **ANY DOUBTS WHATSOEVER ABOUT THIS CASE**, render a not guilty verdict.

__IGNORANCE IS NOT A DEFENSE.__

If you are sure about declaring the defendant guilty given the aforementioned \
terms, please type \`yes\`.`;

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
          type: 'time',
          defaultValue: empty_argument
        })
      ],
      description: 'Declares a guilty verdict in court.',
      groupName: 'courts',
      names: ['guilty']
    });
    this.mutex = new MultiMutex();
  }

  async run(msg, args) {
    return this.mutex.sync(msg.channel.id, async () => {
      const c_case = db.get_channel_case(msg.channel.id);

      if (!c_case) {
        return CommandResult.fromError('This channel has no ongoing court case.');
      }

      const { defendant_id, law_id, id: case_id } = c_case;
      const res = system.case_finished(case_id);
      const law = db.get_law(law_id);
      const mute = law.mandatory_felony
        || (!law.mandatory_felony && system.mute_felon(msg.channel.guild.id, defendant_id, law));

      if (res.finished) {
        return CommandResult.fromError(res.reason);
      } else if (args.sentence === empty_argument && mute) {
        return CommandResult.fromError('A sentence must be given.');
      } else if (args.sentence !== empty_argument && !mute) {
        return CommandResult.fromError('The accused must be convicted of at least three \
  misdemeanors of this crime before a prison sentence is permissible.');
      }

      const prefix = `${discord.tag(msg.author).boldified}, `;
      const verified = await discord.verify_msg(msg, `${prefix}${content}`, null, 'yes');

      if (!verified) {
        return CommandResult.fromError('The command has been cancelled.');
      }

      await this.end(msg, {
        law, sentence: args.sentence, opinion: args.opinion, defendant_id, case_id
      });
    });
  }

  async end(msg, { law, sentence, defendant_id, opinion, case_id }) {
    const { days, hours } = sentence === empty_argument ? {
      days: 0, hours: 0
    } : number.msToTime(sentence);
    const time = (days * hours_per_day) + hours;
    const def = msg.channel.guild.members.get(defendant_id)
      || await client.getRESTUser(defendant_id);
    const repeated = await this.shouldMute({
      ids: {
        guild: msg.channel.guild.id, case: case_id, defendant: defendant_id
      },
      opinion, sentence, law, guild: msg.channel.guild
    });
    const ending = `${law.mandatory_felony || (!law.mandatory_felony && repeated) ? `sentenced to \
${time} hours in prison${repeated ? ` for repeatedly breaking the law \`${law.name}\`` : ''}` : '\
charged with committing a misdemeanor'}.`;

    await discord.create_msg(
      msg.channel, `${def.mention} has been found guilty and ${ending}`
    );
    await system.close_case(msg, msg.channel);
  }

  async shouldMute({ ids, opinion, sentence, law, guild }) {
    const update = {
      guild_id: ids.guild,
      case_id: ids.case,
      defendant_id: ids.defendant,
      verdict: verdict.guilty,
      opinion
    };
    let mute = false;

    if (!law.mandatory_felony) {
      mute = system.mute_felon(ids.guild, ids.defendant, law);
    }

    const addSentence = law.mandatory_felony || (!law.mandatory_felony && mute);
    const {
      trial_role, imprisoned_role, jailed_role
    } = db.fetch('guilds', { guild_id: ids.guild });
    const in_server = guild.members.has(ids.defendant);

    if (in_server) {
      await remove_role(ids.guild, ids.defendant, trial_role);
      await remove_role(ids.guild, ids.defendant, jailed_role);
    }

    if (sentence !== empty_argument && addSentence) {
      update.sentence = sentence;

      if (in_server) {
        await add_role(ids.guild, ids.defendant, imprisoned_role);
      }
    }

    const { lastInsertRowid: id } = db.insert('verdicts', update);
    const c_case = db.get_case(id);
    const { case_channel } = db.fetch('guilds', { guild_id: ids.guild });
    const c_channel = client.guilds.get(ids.guild).channels.get(case_channel);

    if (c_channel) {
      await system.edit_case(c_channel, c_case);
    }

    return mute;
  }
}();
