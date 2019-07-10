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
const { constants: { discord_err_codes } } = require('../services/data.js');
const log = require('./logger.js');

module.exports = func => async (...args) => {
  try {
    const res = await func(...args);

    return res;
  } catch (err) {
    const server = err.code >= discord_err_codes.internal[0]
      && err.code <= discord_err_codes.internal[1];
    const missing_perms = discord_err_codes.missing_perms.includes(err.code);
    const timeout = err.message.startsWith(discord_err_codes.timeout);

    if (!(server || missing_perms || timeout)) {
      log.error(err);
    }
  }
};
