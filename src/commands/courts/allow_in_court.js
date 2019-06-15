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
const { Argument, Command } = require('patron.js');
const db = require('../../services/database.js');
const discord = require('../../utilities/discord.js');

module.exports = new class AllowInCourt extends Command {
  constructor() {
    super({
      args: [
        new Argument({
          example: 'Stipendi',
          key: 'member',
          name: 'member',
          type: 'member',
          remainder: true
        })
      ],
      description: 'Allows a citizen to speak at a hearing.',
      groupName: 'courts',
      names: ['allow_in_court']
    });
    this.bitfield = 2048;
  }

  async run(msg, args) {
    const court = db.get_channel_case(msg.channel.id);

    if (!court) {
      return;
    }

    await msg.channel.editPermission(args.member.id, this.bitfield, 0, 'member');
    await discord.create_msg(msg.channel, `Added ${discord.tag(args.member)}.`);
  }
}();
