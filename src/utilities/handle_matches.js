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
const str = require('./string.js');
const { TypeReaderResult } = require('patron.js');
const maxResults = 5;

function format_matches(matches, formatter) {
  return str.list(matches.map(match => {
    if (formatter) {
      return formatter(match);
    }

    return match.name;
  }));
}

module.exports = function(cmd, matches, err_msg, formatter) {
  if (matches.length > maxResults) {
    return TypeReaderResult.fromError(
      cmd, `I found ${matches.length} matches, please be more specific.`
    );
  } else if (matches.length > 1) {
    return TypeReaderResult.fromError(
      cmd, `I found multiple matches: ${format_matches(matches, formatter)}`
    );
  } else if (matches.length === 1) {
    return TypeReaderResult.fromSuccess(matches[0]);
  }

  return TypeReaderResult.fromError(cmd, err_msg);
};
