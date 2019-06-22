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
const { Command, CommandResult } = require('patron.js');
const db = require('../../services/database.js');
const discord = require('../../utilities/discord.js');

module.exports = new class HotCommands extends Command {
  constructor() {
    super({
      description: 'View the server\'s custom commands.',
      groupName: 'general',
      names: ['hot_commands', 'hot_cmds', 'hots']
    });
  }

  async run(msg) {
    const cmds = db
      .fetch_commands(msg.channel.guild.id)
      .filter(x => x.active === 1);

    if (!cmds.length) {
      return CommandResult.fromError('There are no custom commands.');
    }

    const names = cmds.map(x => x.name).join(', ');

    await discord.create_msg(msg.channel, {
      title: 'Custom Commands',
      description: names
    });
  }
}();
