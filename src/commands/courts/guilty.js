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
const add_role = catch_discord(client.addGuildMemberRole.bind(client));
const remove_role = catch_discord(client.removeGuildMemberRole.bind(client));
const system = require('../../utilities/system.js');
const empty_argument = Symbol('Empty Argument');
const content = `Declaring unlawful verdicts will result in \
impeachment and **national disgrace**.

If you have **ANY DOUBTS WHATSOEVER ABOUT THE VALIDITY OF THIS VERDICT**, \
do not proceed with this verdict.

__IGNORANCE IS NOT A DEFENSE.__

If you are sure you wish to proceed with verdict given the aforementioned \
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
    this.bitfield = 2048;
  }

  async run(msg, args) {
    const c_case = db.get_channel_case(msg.channel.id);

    if (!c_case) {
      return CommandResult.fromError('This channel has no ongoing court case.');
    }

    const { defendant_id, law_id, id: case_id } = c_case;
    const defendant = msg.channel.guild.members.get(defendant_id);

    if (!defendant) {
      return CommandResult.fromError('The defendant is no longer in the server.');
    }

    const currrent_verdict = db.get_verdict(case_id);
    const finished = currrent_verdict && currrent_verdict.verdict !== verdict.pending;
    const law = db.get_law(law_id);
    const mute = law.mandatory_felony
      || (!law.mandatory_felony && system.mute_felon(msg.channel.guild.id, defendant_id, law));

    if (finished) {
      if (currrent_verdict.verdict === verdict.mistrial) {
        return CommandResult.fromError('This case has already been declared as a mistrial.');
      }

      return CommandResult.fromError('This case has already reached a verdict.');
    } else if (args.sentence === empty_argument && mute) {
      return CommandResult.fromError('A sentence must be given.');
    } else if (args.sentence !== empty_argument && !mute) {
      return CommandResult.fromError('The accused must be convicted of at least three \
misdemeanors of this crime before a prison sentence is permissible.');
    }

    const prefix = `**${discord.tag(msg.author)}**, `;
    const verified = await discord.verify_msg(msg, `${prefix}${content}`, null, 'yes');

    if (!verified) {
      return CommandResult.fromError('The command has been cancelled.');
    }

    await this.end(msg, {
      law, sentence: args.sentence, opinion: args.opinion, defendant, case_id, prefix
    });
  }

  async end(msg, { law, sentence, defendant, opinion, case_id, prefix }) {
    const { hours } = sentence === empty_argument ? 0 : number.msToTime(sentence);
    const repeated = await this.shouldMute({
      ids: {
        guild: msg.channel.guild.id, case: case_id, defendant: defendant.id
      },
      opinion, sentence, law
    });
    const ending = `${law.mandatory_felony || (!law.mandatory_felony && repeated) ? `sentenced to \
${hours} hours in prison${repeated ? ` for repeatedly breaking the law \`${law.name}\`` : ''}` : '\
charged with committing a misdemeanor'}.`;

    await discord.create_msg(
      msg.channel, `${prefix}${defendant.mention} has been found guilty and was ${ending}`
    );
    await msg.pin();
    await Promise.all(msg.channel.permissionOverwrites.map(
      x => msg.channel.editPermission(x.id, 0, this.bitfield, x.type, 'Case is over')
    ));
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
      mute = system.mute_felon(ids.guild, ids.defendant, law);
    }

    const addSentence = law.mandatory_felony || (!law.mandatory_felony && mute);
    const { trial_role, imprisoned_role } = db.fetch('guilds', { guild_id: ids.guild });

    await remove_role(ids.guild, ids.defendant, trial_role);

    if (sentence !== empty_argument && addSentence) {
      update.sentence = sentence;
      await add_role(ids.guild, ids.defendant, imprisoned_role);
    }

    db.insert('verdicts', update);

    return mute;
  }
}();
