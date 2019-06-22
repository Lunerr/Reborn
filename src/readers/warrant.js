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

module.exports = new class Warrant extends TypeReader {
  constructor() {
    super({ type: 'warrant' });
  }

  async read(cmd, msg, arg, args, val) {
    const warrants = db.fetch_warrants(msg.channel.guild.id);

    return handle_matches(
      cmd,
      warrants.filter(warrant => String(warrant.id) === val),
      'This request warrant does not exist.'
    );
  }
}();
