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
const { Command, CommandResult } = require('patron.js');
const { config } = require('../../services/data.js');
const client = require('../../services/client.js');
const reg = require('../../services/registry.js');
const discord = require('../../utilities/discord.js');
const system = require('../../utilities/system.js');
const db = require('../../services/database.js');
const lawyer_enum = require('../../enums/lawyer.js');

module.exports = new class RepresentMyself extends Command {
  constructor() {
    super({
      preconditions: ['court_only', 'court_case', 'defendant_only'],
      description: 'Sets the lawyer of a court case as yourself.',
      groupName: 'courts',
      names: ['represent_myself', 'self_represent']
    });
  }

  async run(msg) {
    const req_cmd = reg.commands.find(x => x.names[0] === 'request_lawyer');
    const auto_cmd = reg.commands.find(x => x.names[0] === 'auto_lawyer');
    const req = req_cmd.running[msg.channel.id];

    if (auto_cmd.running[msg.channel.id] || req) {
      return CommandResult.fromError(
        `A lawyer is already being ${req ? 'requested' : 'automatically found'} for this case.`
      );
    }

    const channel_case = db.get_channel_case(msg.channel.id);
    const left = config.lawyer_change_count - (channel_case.lawyer_count + 1);

    if (channel_case.lawyer_id === msg.author.id) {
      return CommandResult.fromError('You are already representing yourself in this case.');
    } else if (channel_case.lawyer_id !== null) {
      const lawyer = await client.getRESTUser(channel_case.lawyer_id);
      const result = system.change_lawyer(channel_case, msg.channel, lawyer, lawyer_enum.self);

      if (result instanceof CommandResult) {
        return result;
      }
    }

    const prefix = `${discord.tag(msg.author).boldified}, `;

    db.set_lawyer(msg.author.id, channel_case.id, lawyer_enum.self);
    db.update_lawyer_count(channel_case.id, channel_case.lawyer_count + 1);
    await system.lawyer_picked(channel_case.channel_id, msg.channel.guild, msg.author);

    return discord.create_msg(
      msg.channel, `${prefix}You are now representing yourself in this case. \
You ${left === 0 ? 'cannot change your lawyer anymore' : `may change your lawyer up to ${left} \
more time${left === 1 ? '' : 's'}`}.\n\nYou have ${config.auto_pick_lawyer} hours to give a plea \
using \`${config.prefix}plea <plea>\` or you will be automatically replaced with a lawyer.`
    );
  }
}();
