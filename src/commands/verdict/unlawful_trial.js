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
const client = require('../../services/client.js');
const verdict = require('../../enums/verdict.js');
const db = require('../../services/database.js');
const discord = require('../../utilities/discord.js');
const system = require('../../utilities/system.js');
const catch_discord = require('../../utilities/catch_discord.js');
const remove_role = catch_discord(client.removeGuildMemberRole.bind(client));

module.exports = new class UnlawfulTrial extends Command {
  constructor() {
    super({
      args: [
        new Argument({
          example: 'Corrupt penis man officer',
          name: 'reason',
          key: 'reason',
          type: 'reason'
        })
      ],
      description: 'The case gets marked as an unlawful mistrial. The prosector and the approving \
judge gets impeached. This does not prevent the defendant from being prosecuted again.',
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

    const { case_id, defendant_id, plaintiff_id } = res;
    const update = {
      guild_id: msg.channel.guild.id,
      case_id,
      defendant_id,
      verdict: verdict.unjust_trial,
      opinion: args.reason
    };
    const { lastInsertRowid: id } = db.insert('verdicts', update);

    c_case = db.get_case(id);

    const {
      trial_role, jailed_role, case_channel, judge_role, officer_role
    } = db.fetch('guilds', { guild_id: msg.channel.guild.id });
    const c_channel = msg.channel.guild.channels.get(case_channel);

    if (c_channel) {
      await system.edit_case(c_channel, c_case);
    }

    const prefix = `${discord.tag(msg.author).boldified}, `;

    if (msg.channel.guild.members.has(defendant_id)) {
      await system.free_from_court(msg.channel.guild.id, defendant_id, [trial_role, jailed_role]);
    }

    const { judge_id } = db.get_warrant(c_case.warrant_id);
    const cop = msg.guild.members.get(plaintiff_id) || await client.getRESTUser(plaintiff_id);
    const judge = msg.guild.members.get(judge_id) || await client.getRESTUser(judge_id);

    await this.impeach(judge, cop, msg.channel.guild, {
      judge: judge_role,
      officer: officer_role
    });
    await discord.create_msg(msg.channel, `${prefix}This court case has been declared as an \
unjust trial.\nBoth ${cop.mention} and ${judge.mention} have been impeached for partaking in this \
unjust trial.\n\nNo verdict has been delivered and the accused may be prosecuted again.`);
    await system.close_case(msg, msg.channel);
  }

  async impeach(judge, cop, guild, roles) {
    if (guild.members.has(judge.id)) {
      await remove_role(guild.id, judge.id, roles.judge, 'Impeached for an unjust trial.');
    }

    if (guild.members.has(cop.id)) {
      await remove_role(guild.id, judge.id, roles.officer, 'Impeached for an unjust trial.');
    }

    db.insert('impeachments', {
      guild_id: guild.id,
      member_id: judge.id
    });
    db.insert('impeachments', {
      guild_id: guild.id,
      member_id: cop.id
    });
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
