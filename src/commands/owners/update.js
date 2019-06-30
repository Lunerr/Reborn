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
const { Command } = require('patron.js');
const { config: { restart } } = require('../../services/data.js');
const { exec } = require('child_process');
const promise_exec = require('util').promisify(exec);
const discord = require('../../utilities/discord.js');
const logger = require('../../utilities/logger.js');

module.exports = new class Update extends Command {
  constructor() {
    super({
      description: 'Updates and restarts the bot.',
      groupName: 'owners',
      names: ['update', 'reboot', 'restart']
    });
  }

  async run(msg) {
    const prefix = `${discord.tag(msg.author).boldified}, `;

    await discord.create_msg(
      msg.channel, `${prefix}The bot will be restarting shortly.`
    );

    try {
      await promise_exec(restart);
    } catch (e) {
      logger.error(e);
      await discord.create_msg(
        msg.channel, `${prefix}An error has occurred while updating.`
      );
    }
  }
}();
