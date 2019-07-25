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
const { Command, CommandResult, MultiMutex } = require('patron.js');
const system = require('../../utilities/system.js');
const discord = require('../../utilities/discord.js');
const db = require('../../services/database.js');
const client = require('../../services/client.js');
const reg = require('../../services/registry.js');
const lawyer_enum = require('../../enums/lawyer.js');

module.exports = new class AutoLawyer extends Command {
  constructor() {
    super({
      preconditions: ['court_only', 'court_case', 'defendant_only'],
      description: 'Automatically sets the lawyer of a court case to whoever consents.',
      groupName: 'courts',
      names: ['auto_lawyer']
    });
    this.running = {};
    this.mutex = new MultiMutex();
  }

  async run(msg) {
    const req_cmd = reg.commands.find(x => x.names[0] === 'request_lawyer');

    if (this.running[msg.channel.id]) {
      return CommandResult.fromError('An auto lawyer request is currently running for this case.');
    } else if (req_cmd.running[msg.channel.id]) {
      return CommandResult.fromError('A request lawyer is currently running for this case.');
    }

    const channel_case = db.get_channel_case(msg.channel.id);

    if (channel_case.lawyer_id !== null) {
      return CommandResult.fromError('There already is a lawyer in this case.');
    }

    return this.mutex.sync(msg.channel.id, async () => {
      this.running[msg.channel.id] = true;

      const prefix = `${discord.tag(msg.author).boldified}, `;

      await discord.create_msg(msg.channel, `${prefix}The auto lawyer process has begun.`);

      const { lawyer, amount } = await system.auto_pick_lawyer(
        msg.channel.guild, channel_case, false
      );
      const member = msg.channel.guild.members.get(lawyer.member_id)
        || await client.getRESTUser(lawyer.member_id);

      await discord.dm(
        member.user ? member.user : member,
        `You are now the lawyer of ${msg.member.mention} in case #${channel_case.id}.`,
        msg.channel.guild
      );
      await system.accept_lawyer(
        msg.author, member,
        msg.channel, channel_case,
        lawyer_enum.auto, false, amount
      );
      this.running[msg.channel.id] = false;
    });
  }
}();
