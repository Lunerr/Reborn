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
const { Argument, Command, Context, CommandResult } = require('patron.js');
const db = require('../../services/database.js');
const discord = require('../../utilities/discord.js');
const number = require('../../utilities/number.js');

module.exports = new class NitroGiveaway extends Command {
  constructor() {
    super({
      args: [
        new Argument({
          example: 'Reborn',
          key: 'guild',
          name: 'guild',
          type: 'guild'
        }),
        new Argument({
          example: 'discord.gift/582aj213',
          key: 'link',
          name: 'link',
          type: 'string',
          remainder: true
        })
      ],
      usableContexts: [Context.DM],
      description: 'Giveaway nitro.',
      groupName: 'bot_owners',
      names: ['nitro_giveaway', 'giveaway_nitro']
    });
  }

  async run(msg, args) {
    const guild = db.fetch('guilds', { guild_id: args.guild.id });
    const channel = await args.guild.channels.get(guild.giveaway_channel);

    if (!channel) {
      return CommandResult.fromError('There is no giveaway channel set in this server.');
    }

    db.set_giveaway_link(args.link, args.guild.id);
    db.set_giveaway_timer(Date.now() + number.hoursToMs(24), args.guild.id);
    await discord.send_msg(msg, `You've successfully created a nitro giveaway with the link ${args.link.boldified}.`);

    return channel.createMessage('@everyone **__NITRO GIVEAWAY__**\n\nTO ENTER THE GIVEAWAY YOU MUST TYPE IN CHAT AT LEAST **7 CHARACTERS PER MESSAGE** WITH AT LEAST **1 MINUTE** IN BETWEEN YOUR MESSAGES\n\nTHE WINNER WILL BE PICKED **24 HOURS** FROM NOW AND DMED WITH THE NITRO LINK\n\n**__GOODLUCK AND HAVE FUN!__**.');
  }
}();
