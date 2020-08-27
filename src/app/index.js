
/**
*
* @licstart  The following is the entire license notice for the JavaScript code in this file.
*
* Melinda record dump exporter microservice
*
* Copyright (C) 2020 University Of Helsinki (The National Library Of Finland)
*
* This file is part of melinda-record-dump-exporter
*
* melinda-record-dump-exporter program is free software: you can redistribute it and/or modify
* it under the terms of the GNU Affero General Public License as
* published by the Free Software Foundation, either version 3 of the
* License, or (at your option) any later version.
*
* melinda-record-dump-exporter is distributed in the hope that it will be useful,
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

import {createLogger} from '@natlibfi/melinda-backend-commons';
import createStateInterface, {statuses} from '@natlibfi/melinda-record-harvest-commons';
import processRecordsFactory from './process-records';

export default async ({logLevel, stateInterfaceOptions, matchOptions}) => {
  const logger = createLogger(logLevel);

  logger.log('info', `Starting melinda-record-matching-finder`);

  const {readState, writeState, getPool, close} = await createStateInterface(stateInterfaceOptions);
  const {status} = await readState();
  const dbPool = getPool();
  const processRecords = processRecordsFactory({logger, dbPool, matchOptions});

  await initializeDatabase();

  if (status === statuses.harvestPending) {
    logger.info('Starting to process records');
    await processRecords();
    logger.info('No more records to process');
    return close();
  }

  if (status === statuses.harvestDone) {
    logger.info('Starting to process records');
    await processRecords(true);

    logger.info('All records processed. Finalizing...');
    await finalizeProcessing();
    return close();
  }

  logger.info('Nothing to do. Exiting.');
  return close();

  async function finalizeProcessing() {
    await writeState({status: statuses.postProcessingDone});
  }

  async function initializeDatabase() {
    const connection = await dbPool.getConnection();
    await connection.query(`CREATE TABLE IF NOT EXISTS results_records (id MEDIUMINT NOT NULL UNIQUE, record JSON NOT NULL, PRIMARY KEY (id))`);
    await connection.query(`CREATE TABLE IF NOT EXISTS results_matches (id MEDIUMINT NOT NULL, probability FLOAT NOT NULL, match_result JSON NOT NULL)`);
    await connection.end();
  }
};
