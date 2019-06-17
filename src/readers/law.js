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
const db = require('../services/database.js');
const handle_matches = require('../utilities/handle_matches.js');
const { TypeReader } = require('patron.js');

module.exports = new class Law extends TypeReader {
  constructor() {
    super({ type: 'law' });
  }

  async read(cmd, msg, arg, args, val) {
    const name = val.toLowerCase();
    const laws = db
      .fetch_laws(msg.channel.guild.id)
      .filter(x => x.active === 1);

    return handle_matches(
      cmd,
      laws.filter(law => law.name.toLowerCase().startsWith(name)),
      'that law does not exist.'
    );
  }
}();
