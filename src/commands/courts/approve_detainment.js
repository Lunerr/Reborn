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
const db = require('../../services/database.js');
const discord = require('../../utilities/discord.js');
const registry = require('../../services/registry.js');
const system = require('../../utilities/system.js');
const content = `Granting unlawful detainments will result in \
impeachment and **national disgrace**.

If you have **ANY DOUBTS WHATSOEVER ABOUT THE VALIDITY OF THIS DETAINMENT**, \
do not proceed with this grant.

__IGNORANCE IS NOT A DEFENSE.__

If you are sure you wish to proceed with granting this detainment given the aforementioned \
terms, please type \`yes\`.`;

module.exports = new class ApproveDetainment extends Command {
  constructor() {
    super({
      preconditions: ['judges'],
      args: [
        new Argument({
          example: '2',
          key: 'warrant',
          name: 'id',
          type: 'warrant'
        })
      ],
      description: 'Approves a detainment.',
      groupName: 'courts',
      names: ['approve_detainment', 'approve']
    });
  }

  async run(msg, args) {
    if (args.warrant.executed) {
      return CommandResult.fromError('This detainment has already been executed.');
    } else if (args.warrant.approved === 1) {
      return CommandResult.fromError('This detainment has already been approved.');
    }

    const verified = await discord.verify_msg(
      msg, `${discord.tag(msg.author).boldified}, ${content}`, null, 'yes'
    );

    if (!verified) {
      return CommandResult.fromError('The command has been cancelled.');
    }

    db.approve_warrant(args.warrant.id, msg.author.id);
    await discord.create_msg(
      msg.channel, `${discord.tag(msg.author).boldified}, You've approved this detainment.`
    );
    await this.dm(msg.channel.guild, args.warrant.officer_id, msg.author, args.warrant);

    const {
      warrant_channel, judge_role, trial_role, court_category
    } = db.fetch('guilds', { guild_id: msg.channel.guild.id });
    const w_channel = msg.channel.guild.channels.get(warrant_channel);
    const new_warrant = Object.assign(args.warrant, { judge_id: msg.author.id });

    if (w_channel) {
      await system.edit_warrant(w_channel, new_warrant);
    }

    await this.setup({
      guild: msg.channel.guild, warrant: new_warrant, judge_role, trial_role, court_category
    });
  }

  async setup({ guild, warrant, judge_role, trial_role, court_category }) {
    const arrest = registry.commands.find(x => x.names[0] === 'arrest');
    const judge = arrest.get_judge(guild, warrant, judge_role);
    const defendant = guild.members.get(warrant.defendant_id) || await guild.shard
      .client.getRESTUser(warrant.defendant_id);
    const officer = guild.members.get(warrant.officer_id) || await guild.shard
      .client.getRESTUser(warrant.officer_id);

    await arrest.set_up({
      guild, defendant, judge, officer, warrant, trial_role, category: court_category
    });
  }

  async dm(guild, id, judge, warrant) {
    const member = guild.members.get(id);

    if (!member) {
      return false;
    }

    return discord.dm(
      member.user,
      `Your detainment (${warrant.id}) has been approved by ${judge.mention}.`,
      guild
    );
  }
}();
