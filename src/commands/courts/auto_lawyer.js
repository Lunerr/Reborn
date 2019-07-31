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
const { config, constants: { error_color } } = require('../../services/data.js');
const system = require('../../utilities/system.js');
const discord = require('../../utilities/discord.js');
const logger = require('../../utilities/logger.js');
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
    const remaining = config.lawyer_change_count - (channel_case.lawyer_count + 1);

    if (channel_case.lawyer_id !== null) {
      const res = await this.lawyer_set(channel_case, msg.channel);

      if (res instanceof CommandResult) {
        return res;
      }
    }

    this.mutex.sync(msg.channel.id, () => this.auto(channel_case, msg.channel, async () => {
      const prefix = `${discord.tag(msg.author).boldified}, `;

      await discord.create_msg(msg.channel, `${prefix}The auto lawyer process has begun.`);

      const { lawyer: { member_id: id }, amount } = await system.auto_pick_lawyer(
        msg.channel.guild, channel_case, ''
      );
      const member = msg.channel.guild.members.get(id) || await client.getRESTUser(id);

      await discord.dm(
        member.user ? member.user : member,
        `You are now the lawyer of ${msg.member.mention} in case #${channel_case.id}.`,
        msg.channel.guild
      );
      db.update_lawyer_count(channel_case.id, channel_case.lawyer_count + 1);

      return system.accept_lawyer(
        msg.author, member,
        msg.channel, channel_case,
        lawyer_enum.auto, `${msg.author.mention}, You have successfully set your lawyer. \
You ${remaining === 0 ? 'cannot change your lawyer anymore' : `may change your lawyer up to \
${remaining} more time${remaining === 1 ? '' : 's'}`}.\n\n`, false, amount
      );
    }));
  }

  async lawyer_set(channel_case, channel) {
    const lawyer = await client.getRESTUser(channel_case.lawyer_id);
    const res = await system.change_lawyer(channel_case, channel, lawyer, lawyer_enum.auto);

    if (res instanceof CommandResult) {
      return res;
    }

    db.insert('fired_case_lawyers', {
      member_id: channel_case.lawyer_id,
      guild_id: channel_case.guild_id,
      case_id: channel_case.id
    });
  }

  async auto(c_case, channel, fn) {
    this.running[c_case.channel_id] = true;
    (async () => fn()).catch(async e => {
      await logger.error(e);
      await discord.create_msg(channel, `An error has occured while running the auto lawyer process
\n${e.message}`, error_color);
    }).finally(() => {
      this.running[c_case.channel_id] = false;
    });
  }
}();
