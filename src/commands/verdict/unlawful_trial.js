/**
 * Reborn - The core control of the only truly free and fair discord server.
 * Copyright (C) 2019 John Boyer
 *
 * Reborn is free software: you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Reborn is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */
'use strict';
const { Argument, Command, CommandResult } = require('patron.js');
const { config } = require('../../services/data.js');
const client = require('../../services/client.js');
const verdict = require('../../enums/verdict.js');
const db = require('../../services/database.js');
const discord = require('../../utilities/discord.js');
const system = require('../../utilities/system.js');
const number = require('../../utilities/number.js');

module.exports = new class UnlawfulTrial extends Command {
  constructor() {
    super({
      args: [
        new Argument({
          example: 'Corrupt penis man officer',
          name: 'reason',
          key: 'reason',
          type: 'string',
          remainder: true
        })
      ],
      description: 'The case gets marked as an unlawful trial. As a result of this, the prosector \
and the approving judge gets impeached. This does not prevent the defendant from being prosecuted \
again.',
      groupName: 'verdicts',
      names: ['unlawful_trial', 'unjust_trial']
    });
  }

  async run(msg, args) {
    let c_case = db.get_channel_case(msg.channel.id);
    const res = await this.prerequisites(c_case);

    if (res instanceof CommandResult) {
      return res;
    }

    const { guild } = msg.channel;
    const { case_id, defendant_id, plaintiff_id } = res;
    const { lastInsertRowid: id } = db.insert('verdicts', {
      guild_id: guild.id,
      case_id,
      defendant_id,
      verdict: verdict.unjust_trial,
      opinion: args.reason
    });

    c_case = db.get_case(id);

    const {
      trial_role, jailed_role, case_channel, judge_role, officer_role
    } = db.fetch('guilds', { guild_id: guild.id });
    const c_channel = guild.channels.get(case_channel);

    if (c_channel) {
      await system.edit_case(c_channel, c_case);
    }

    if (msg.channel.guild.members.has(defendant_id)) {
      await system.free_from_court(guild.id, defendant_id, [trial_role, jailed_role]);
    }

    const { judge_id } = db.get_warrant(c_case.warrant_id);
    const cop = guild.members.get(plaintiff_id) || await client.getRESTUser(plaintiff_id);
    const judge = guild.members.get(judge_id) || await client.getRESTUser(judge_id);
    const prefix = `${discord.tag(msg.author).boldified}, `;

    await this.impeach(judge, cop, guild, {
      judge: judge_role, officer: officer_role
    });
    await discord.create_msg(msg.channel, `${prefix}This court case has been declared as an \
unjust trial.\nBoth ${cop.mention} and ${judge.mention} have been impeached for partaking in this \
unjust trial.\n\nNo verdict has been delivered and the accused may be prosecuted again.\n\n\
${msg.member.mention}, you have been rewarded with ${number.format(config.judge_case)} for \
delivering the verdict.`);
    await system.close_case(msg, msg.channel);

    return c_case;
  }

  async impeach(judge, cop, guild, roles) {
    await system.impeach(judge, guild, roles.judge, 'impeached for partaking in an unjust trial');
    await system.impeach(cop, guild, roles.officer, 'impeached for partaking in an unjust trial');
  }

  async prerequisites(c_case) {
    if (!c_case) {
      return CommandResult.fromError('This channel has no ongoing court case.');
    }

    const { id: case_id, defendant_id, plaintiff_id } = c_case;
    const res = system.case_finished(case_id);

    if (res.finished) {
      return CommandResult.fromError(res.reason);
    }

    return {
      case_id, defendant_id, plaintiff_id
    };
  }
}();
