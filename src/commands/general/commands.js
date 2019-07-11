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
const { Command } = require('patron.js');
const registry = require('../../services/registry.js');
const discord = require('../../utilities/discord.js');
const str = require('../../utilities/string.js');
const { config: { prefix } } = require('../../services/data.js');

module.exports = new class Commands extends Command {
  constructor() {
    super({
      description: 'View the current commands.',
      groupName: 'general',
      names: ['commands', 'cmds']
    });
  }

  async run(msg) {
    const { groups } = registry;
    const embed = {
      title: 'Commands',
      fields: []
    };
    const sorted = groups.sort((a, b) => a.commands.length - b.commands.length);

    for (let i = 0; i < sorted.length; i++) {
      const group = sorted[i];
      const g_name = group.name[0].toUpperCase() + group.name.slice(1);
      const commands = str.list(group.commands.map(x => `\`${prefix}${x.names[0]}\``));

      embed.fields.push({
        name: g_name, value: commands, inline: true
      });
    }

    await msg.channel.createMessage(discord.embed(embed));
  }
}();
