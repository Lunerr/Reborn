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
const system = require('../../utilities/system.js');
const remove_role = catch_discord(client.removeGuildMemberRole.bind(client));

module.exports = new class Guilty extends Command {
  constructor() {
    super({
      args: [
        new Argument({
          name: 'opinion',
          key: 'opinion',
          type: 'string',
          example: 'Prosecutor did a bad bad'
        })
      ],
      preconditions: ['court_only', 'can_trial', 'can_imprison', 'judge_creator'],
      description: 'Impeaches the prosecutor.',
      groupName: 'courts',
      names: ['mistrial']
    });
    this.bitfield = 2048;
  }

  async run(msg, args) {
    let c_case = db.get_channel_case(msg.channel.id);
    const res = await this.prerequisites(c_case, msg.channel.guild);

    if (res instanceof CommandResult) {
      return res;
    }

    const { case_id, plaintiff_id, defendant_id, cop } = res;
    const update = {
      guild_id: msg.channel.guild.id,
      case_id,
      defendant_id,
      verdict: verdict.mistrial,
      opinion: args.opinion
    };
    const { lastInsertRowid: id } = db.insert('verdicts', update);

    c_case = db.get_case(id);

    const {
      officer_role, trial_role, jailed_role, case_channel
    } = db.fetch('guilds', { guild_id: msg.channel.guild.id });
    const c_channel = msg.channel.guild.channels.get(case_channel);

    if (c_channel) {
      await system.edit_case(c_channel, c_case);
    }

    const prefix = `**${discord.tag(msg.author)}**, `;

    if (cop) {
      await remove_role(msg.channel.guild.id, plaintiff_id, officer_role);
    }

    await remove_role(msg.channel.guild.id, defendant_id, trial_role);
    await remove_role(msg.channel.guild.id, defendant_id, jailed_role);
    db.insert('impeachments', {
      member_id: plaintiff_id, guild_id: msg.channel.guild.id
    });
    await discord.create_msg(msg.channel, `${prefix}This court case has been declared as a \
mistrial.\n\n${(cop || await client.getRESTUser(plaintiff_id)).mention} has been impeached.

No verdict has been delivered and the accused may be prosecuted again.`);
    await msg.pin();
    await Promise.all(msg.channel.permissionOverwrites.map(
      x => msg.channel.editPermission(x.id, 0, this.bitfield, x.type, 'Case is over')
    ));
  }

  async prerequisites(c_case, guild) {
    if (!c_case) {
      return CommandResult.fromError('This channel has no ongoing court case.');
    }

    const { id: case_id, plaintiff_id, defendant_id } = c_case;
    const cop = guild.members.get(plaintiff_id);
    const res = system.case_finished(case_id);

    if (res.finished) {
      return CommandResult.fromError(res.reason);
    }

    return {
      case_id, plaintiff_id, defendant_id, cop
    };
  }
}();
