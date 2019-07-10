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
const fs = require('fs');
const path = require('path');
const util = require('util');
const yml = require('js-yaml');
const read_dir = util.promisify(fs.readdir);
const read_file = util.promisify(fs.readFile);
const extensionLength = 4;

module.exports = {
  async load() {
    const dir = path.join(__dirname, '../data/');
    const files = await read_dir(dir);

    for (let i = 0; i < files.length; i++) {
      if (files[i].toLowerCase().includes('example')) {
        continue;
      }

      const file = await read_file(path.join(dir, files[i]), 'utf8');

      this[files[i].slice(0, -extensionLength)] = yml.load(file);
    }
  }
};
