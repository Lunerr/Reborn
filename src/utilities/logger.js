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
const { config } = require('../services/data.js');
const fs = require('fs');
const path = require('path');
const util = require('util');
const append_file = util.promisify(fs.appendFile);
const dir = path.join(__dirname, '../../', config.logs_dir);
const mk_dir = util.promisify(fs.mkdir);
const doubleDigit = 10;

function padTime(unit) {
  return unit < doubleDigit ? `0${unit}` : String(unit);
}

module.exports = {
  date: new Date().getDate(),
  draining: false,
  stream: false,

  filename() {
    const date = new Date();

    return `${date.getMonth() + 1}-${date.getDate()}-${date.getFullYear()}`;
  },

  time() {
    const date = new Date();

    return `${padTime(date.getHours())}:${padTime(date.getMinutes())}:\
${padTime(date.getSeconds())}`;
  },

  async load() {
    await mk_dir(dir).catch(err => {
      if (err.code !== 'EEXIST') {
        throw err;
      }
    });
    await this.update();
  },

  writable() {
    return new Promise(res => {
      if (this.stream.writable) {
        return res();
      }

      this.stream.on('open', () => res());
    });
  },

  async update() {
    const date = new Date().getDate();

    if (!this.stream || date !== this.date) {
      if (this.stream !== false) {
        this.stream.end();
      }

      this.date = date;
      this.stream = fs.createWriteStream(path.join(dir, `${this.filename()}.txt`), { flags: 'a' });
      this.stream.on('error', err => {
        console.error(err);
        process.exit(1);
      });
      this.stream.on('drain', () => {
        if (this.stream.write(this.draining)) {
          this.draining = false;
        } else {
          this.draining = '';
        }
      });
      await this.writable();
    } else if (this.stream.writable === false) {
      await this.writable();
    }
  },

  async log(level, data, ...args) {
    await this.update();

    let msg = `${this.time()} [${level}] ${util.format(data, ...args)}`;

    console[level.toLowerCase()](msg);
    msg += '\n';

    if (this.draining === false) {
      if (!this.stream.write(msg)) {
        this.draining = '';
      }
    } else {
      this.draining += msg;
    }

    if (level === 'ERROR') {
      await append_file(path.join(dir, `${this.filename()}-err.txt`), msg);
    }
  },

  trace(data, ...args) {
    return this.log('TRACE', data, ...args);
  },

  debug(data, ...args) {
    return this.log('DEBUG', data, ...args);
  },

  info(data, ...args) {
    return this.log('INFO', data, ...args);
  },

  warn(data, ...args) {
    return this.log('WARN', data, ...args);
  },

  error(data, ...args) {
    return this.log('ERROR', data, ...args);
  }
};
