/**
*
* @licstart  The following is the entire license notice for the JavaScript code in this file.
*
* Harvester microservice of datastore dump system
*
* Copyright (C) 2020 University Of Helsinki (The National Library Of Finland)
*
* This file is part of datastore-dump-harvester
*
* datastore-dump-harvester program is free software: you can redistribute it and/or modify
* it under the terms of the GNU Affero General Public License as
* published by the Free Software Foundation, either version 3 of the
* License, or (at your option) any later version.
*
* datastore-dump-harvester is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU Affero General Public License for more details.
*
* You should have received a copy of the GNU Affero General Public License
* along with this program.  If not, see <http://www.gnu.org/licenses/>.
*
* @licend  The above is the entire license notice
* for the JavaScript code in this file.
*
*/

import start from './app';
import * as options from './config';

run();

async function run() {
  registerInterruptionHandlers();

  try {
    await start(options);
  } catch (err) {
    console.error(typeof error === 'object' && 'stack' in err ? err.stack : err); // eslint-disable-line no-console
    process.exit(1); // eslint-disable-line no-process-exit
  }

  process.exit(0); // eslint-disable-line no-process-exit

  function registerInterruptionHandlers() {
    process.on('SIGTERM', handleSignal);
    process.on('SIGINT', handleSignal);

    process.on('uncaughtException', ({stack}) => {
      handleTermination({code: 1, message: stack});
    });

    process.on('unhandledRejection', ({stack}) => {
      handleTermination({code: 1, message: stack});
    });

    function handleSignal(signal) {
      handleTermination({code: 1, message: `Received ${signal}`});
    }
  }

  function handleTermination({code = 0, message}) {
    if (message) { // eslint-disable-line functional/no-conditional-statement
      console.error(message); // eslint-disable-line no-console
      process.exit(code); // eslint-disable-line no-process-exit
    }

    process.exit(code); // eslint-disable-line no-process-exit
  }
}
