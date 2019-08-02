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
/*
 * TODO:
 */
// Set up the process.
process.env.TZ = 'UTC';

const { RequireAll } = require('patron.js');
let log = console;

function log_error(err) {
  log.error(err);
}

process.on('uncaughtException', log_error);
process.on('unhandledRejection', log_error);

// Handle prerequisites.
const path = require('path');
const data = require('./services/data.js');

function requireAll(dir) {
  return RequireAll(path.join(__dirname, dir));
}

// Initialize and run the bot.
(async function() {
  await data.load();
  log = require('./utilities/logger.js');
  await log.load();
  await requireAll('./extensions/');

  const client = require('./services/client.js');
  const db = require('./services/database.js');
  const registry = require('./services/registry.js');

  db.load();
  await registry.registerLibraryTypeReaders();
  await registry.registerGlobalTypeReaders();
  registry
    .registerPostconditions(await requireAll('./postconditions'))
    .registerArgumentPreconditions(await requireAll('./preconditions/argument/'))
    .registerPreconditions(await requireAll('./preconditions/command/'))
    .registerTypeReaders(await requireAll('./readers/'))
    .registerGroups(await requireAll('./groups/'))
    .registerCommands(await requireAll('./commands/'));
  await requireAll('./events/');
  await client.connect();
}()).catch(console.error);
